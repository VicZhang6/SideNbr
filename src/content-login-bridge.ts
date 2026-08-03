/**
 * Content script (all_frames): detect login-like UI on built-in provider hosts
 * and report LOGIN_STATE to the service worker.
 *
 * Classic script — no shared Vite imports. Keep CONTENT_LOGIN_STATE_TYPE in
 * sync with MSG.LOGIN_STATE in messages.ts.
 *
 * Detection policy:
 * - URL path heuristics first (cheap, enough for ChatGPT/auth routes).
 * - DOM text scan only when needed (DeepSeek WeChat stays on `/`).
 * - MutationObserver only while login-like (disconnect when clear).
 */

/** Must match MSG.LOGIN_STATE in src/messages.ts */
const LOGIN_STATE_TYPE = "sidenbr/login-state";

const POLL_MS = 1500;
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

/** Providers that keep the same path for login UI (need DOM scan). */
function needsDomScan(providerId: string): boolean {
  return providerId === "deepseek";
}

function bodyLooksLikeLogin(text: string): boolean {
  if (!text) {
    return false;
  }
  // DeepSeek CN phone / WeChat QR.
  if (
    /微信扫码登录|扫描成功|请输入手机号|发送验证码|密码登录|使用\s*Apple\s*账号登录/.test(
      text
    )
  ) {
    return true;
  }
  // Generic EN: require multiple signals.
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

function detectLoginLike(providerId: string): boolean {
  try {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (pathLooksLikeLogin(path)) {
      return true;
    }
    if (!needsDomScan(providerId)) {
      return false;
    }
    const body = document.body;
    if (!body) {
      return false;
    }
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
  let observer: MutationObserver | null = null;

  const topLevel = (() => {
    try {
      return window.top === window;
    } catch {
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
          type: LOGIN_STATE_TYPE,
          providerId,
          isLogin,
          topLevel,
        })
        .catch(() => {});
    } catch {
      // Extension context invalidated.
    }
  };

  const syncObserver = (isLogin: boolean) => {
    if (isLogin && !observer && needsDomScan(providerId)) {
      try {
        observer = new MutationObserver(() => {
          evaluate();
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: false,
        });
      } catch {
        observer = null;
      }
    } else if (!isLogin && observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const evaluate = () => {
    const now = detectLoginLike(providerId);
    if (now === pending) {
      return;
    }
    pending = now;
    if (stableTimer != null) {
      clearTimeout(stableTimer);
    }
    stableTimer = setTimeout(() => {
      stableTimer = null;
      if (pending != null) {
        report(pending);
        syncObserver(pending);
      }
    }, STABLE_MS);
  };

  const start = () => {
    evaluate();
    setInterval(evaluate, POLL_MS);
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
