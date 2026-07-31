/**
 * Shortcut helpers — public chrome.commands + best-effort private APIs.
 * Private build is not store-bound; we try developerPrivate / chrome:// deep links.
 */

export const SHORTCUTS_URL = "chrome://extensions/shortcuts";
export const ACTION_COMMAND = "_execute_action";

export interface CommandInfo {
  name: string;
  shortcut: string;
  description: string;
}

/** Read all extension command bindings. */
export async function listCommands(): Promise<CommandInfo[]> {
  if (
    typeof chrome === "undefined" ||
    !chrome.commands?.getAll
  ) {
    return [];
  }
  const commands = await chrome.commands.getAll();
  return commands.map((c) => ({
    name: c.name ?? "",
    shortcut: (c.shortcut ?? "").trim(),
    description: c.description ?? c.name ?? "",
  }));
}

export async function getActionShortcut(): Promise<string | null> {
  const all = await listCommands();
  const match = all.find((c) => c.name === ACTION_COMMAND);
  if (!match) return null;
  return match.shortcut || null;
}

/**
 * Open Chrome's shortcut settings page.
 * Uses tabs.create (works from extension pages without "tabs" permission).
 * Also tries a few private/internal deep-links.
 */
export async function openShortcutSettings(): Promise<"ok" | "failed"> {
  const candidates = [
    SHORTCUTS_URL,
    // Some Chromium builds accept hash anchors (ignored if unsupported)
    `${SHORTCUTS_URL}#`,
  ];

  // Private: developerPrivate (only present in special/component contexts)
  const devPrivate = (chrome as unknown as {
    developerPrivate?: {
      openExtensionsPage?: (page?: string) => void;
    };
  }).developerPrivate;

  if (typeof devPrivate?.openExtensionsPage === "function") {
    try {
      devPrivate.openExtensionsPage("shortcuts");
      return "ok";
    } catch {
      // fall through
    }
  }

  for (const url of candidates) {
    try {
      await chrome.tabs.create({ url });
      return "ok";
    } catch {
      // try next
    }
  }

  // Last resort: window.open (may be blocked for chrome://)
  try {
    window.open(SHORTCUTS_URL, "_blank");
    return "ok";
  } catch {
    return "failed";
  }
}

/**
 * Best-effort: open the manage page for this extension.
 */
export async function openExtensionDetails(): Promise<void> {
  const id = chrome.runtime?.id;
  if (!id) return;
  const url = `chrome://extensions/?id=${id}`;
  try {
    await chrome.tabs.create({ url });
  } catch {
    try {
      window.open(url, "_blank");
    } catch {
      // ignore
    }
  }
}

/** Pretty-print accelerator for UI (⌘⇧A etc. on mac). */
export function formatShortcut(raw: string | null | undefined): string {
  if (!raw) return "未绑定";
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  return raw
    .split("+")
    .map((part) => {
      const p = part.trim();
      if (isMac) {
        if (/^Command$/i.test(p) || /^Meta$/i.test(p) || /^Cmd$/i.test(p))
          return "⌘";
        if (/^Control$/i.test(p) || /^Ctrl$/i.test(p)) return "⌃";
        if (/^Alt$/i.test(p) || /^Option$/i.test(p)) return "⌥";
        if (/^Shift$/i.test(p)) return "⇧";
      }
      return p.length === 1 ? p.toUpperCase() : p;
    })
    .join(isMac ? "" : " + ");
}
