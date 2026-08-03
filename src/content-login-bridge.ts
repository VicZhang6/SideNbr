/**
 * Content script (all_frames): detect login-like UI on built-in provider hosts
 * and report LOGIN_STATE to the service worker.
 *
 * Keep this file free of shared Vite chunks — it must ship as a single IIFE.
 */

const MSG_LOGIN_STATE = "sidenbr/login-state";

const POLL_MS = 1200;
const STABLE_MS = 900;

function providerIdFromHost(hostname: string): string | null {
  const h = hostname.toLowerCase();
  if (h === "deepseek.com" || h.endsWith(".deepseek.com")) {
    return "deepseek";
  }
  if (
    h === "chatgpt.com" ||
    h.endsWith(".chatgpt.com") ||
    h === "openai.com" ||
    h.endsWith(".openai.com")
  ) {
    return "chatgpt";
  }
  if (h === "perplexity.ai" || h.endsWith(".perplexity.ai")) {
    return "perplexity";
  }
  if (
    h === "grok.com" ||
    h.endsWith(".grok.com") ||
    h === "x.ai" ||
    h.endsWith(".x.ai")
  ) {
    return "grok";
  }
  return null;
}

function pathLooksLikeLogin(pathAndSearch: string): boolean {
  return /\/(login|log-in|sign[-_]?in|sign[-_]?up|register|auth|oauth|session)(\/|$|\?)/i.test(
    pathAndSearch
  );
}

function bodyLooksLikeLogin(text: string): boolean {
  if (!text) {
    return false;
  }
  // DeepSeek CN phone / WeChat QR (matches user-reported stuck state).
  if (
    /微信扫码登录|扫描成功|请输入手机号|发送验证码|密码登录|使用\s*Apple\s*账号登录/.test(
      text
    )
  ) {
    return true;
  }
  // Generic EN auth chrome (require a couple of signals to reduce false positives).
  const enSignals = [
    /sign\s*in\s*to\s*continue/i,
    /log\s*in\s*to\s*continue/i,
    /continue\s*with\s*google/i,
    /continue\s*with\s*apple/i,
    /scan\s*(the\s*)?qr/i,
    /enter\s*(your\s*)?(phone|email|password)/i,
    /verification\s*code/i,
  ];
  let hits = 0;
  for (const re of enSignals) {
    if (re.test(text)) {
      hits += 1;
    }
  }
  return hits >= 2;
}

function detectLoginLike(): boolean {
  try {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (pathLooksLikeLogin(path)) {
      return true;
    }
    const body = document.body;
    if (!body) {
      return false;
    }
    // Cap text scan for performance.
    const text = (body.innerText || body.textContent || "").slice(0, 8000);
    return bodyLooksLikeLogin(text);
  } catch {
    return false;
  }
}

const providerId = providerIdFromHost(location.hostname);
if (providerId) {
  let lastSent: boolean | null = null;
  let pending: boolean | null = null;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;

  const topLevel = (() => {
    try {
      return window.top === window;
    } catch {
      // Cross-origin top access can throw in nested frames.
      return false;
    }
  })();

  const report = (isLogin: boolean) => {
    if (lastSent === isLogin) {
      return;
    }
    lastSent = isLogin;
    try {
      void chrome.runtime
        .sendMessage({
          type: MSG_LOGIN_STATE,
          providerId,
          isLogin,
          topLevel,
        })
        .catch(() => {
          // Extension context invalidated during reload — ignore.
        });
    } catch {
      // ignore
    }
  };

  const evaluate = () => {
    const now = detectLoginLike();
    if (now === pending) {
      return;
    }
    pending = now;
    if (stableTimer != null) {
      clearTimeout(stableTimer);
    }
    // Debounce so SPA route flashes don't flicker the side-panel banner.
    stableTimer = setTimeout(() => {
      stableTimer = null;
      if (pending != null) {
        report(pending);
      }
    }, STABLE_MS);
  };

  const start = () => {
    evaluate();
    setInterval(evaluate, POLL_MS);

    try {
      const mo = new MutationObserver(() => {
        evaluate();
      });
      mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } catch {
      // MutationObserver unavailable — interval still runs.
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        evaluate();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
