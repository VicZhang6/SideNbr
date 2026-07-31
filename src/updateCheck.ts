import { GITHUB_LATEST_API } from "./constants";

export type UpdateCheckStatus = "upToDate" | "updateAvailable" | "error";

export type UpdateCheckResult = {
  status: UpdateCheckStatus;
  installedVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  downloadUrl?: string; // first SideNbr-*.zip asset if present
  message?: string; // error detail for debugging
};

const FETCH_TIMEOUT_MS = 10_000;
const ZIP_ASSET_RE = /^SideNbr-.*\.zip$/i;
/** chrome.storage.local key for last successful (or soft) check cache. */
const UPDATE_CHECK_CACHE_KEY = "updateCheckCache";
/** Reuse cached result for 6h to avoid hammering GitHub from every panel open. */
const UPDATE_CHECK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type UpdateCheckCache = {
  checkedAt: number;
  installedVersion: string;
  result: UpdateCheckResult;
};

function isCacheEntry(value: unknown): value is UpdateCheckCache {
  if (!value || typeof value !== "object") return false;
  const v = value as UpdateCheckCache;
  return (
    typeof v.checkedAt === "number" &&
    typeof v.installedVersion === "string" &&
    v.result != null &&
    typeof v.result === "object" &&
    typeof (v.result as UpdateCheckResult).status === "string"
  );
}

/** Installed extension version from the Chrome manifest. */
export function getInstalledVersion(): string {
  try {
    return chrome.runtime.getManifest().version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Compare two semver strings (major.minor.patch only).
 * Strips a leading `v`; ignores prerelease/build metadata.
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string): [number, number, number] => {
    const core = v.trim().replace(/^v/i, "").split("-")[0].split("+")[0];
    const parts = core.split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
};

type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  assets?: GitHubAsset[];
};

/** Check GitHub Releases for a newer SideNbr zip than the installed version. */
export async function checkLatestRelease(): Promise<UpdateCheckResult> {
  const installedVersion = getInstalledVersion();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(GITHUB_LATEST_API, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return {
        status: "error",
        installedVersion,
        message: `GitHub API returned ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as GitHubRelease;
    const tagName = data.tag_name;
    if (!tagName || typeof tagName !== "string") {
      return {
        status: "error",
        installedVersion,
        message: "Missing or invalid tag_name in release response",
      };
    }

    const latestVersion = tagName.trim().replace(/^v/i, "");
    const releaseUrl =
      typeof data.html_url === "string" ? data.html_url : undefined;

    const zipAsset = Array.isArray(data.assets)
      ? data.assets.find(
          (a) =>
            typeof a.name === "string" &&
            ZIP_ASSET_RE.test(a.name) &&
            typeof a.browser_download_url === "string"
        )
      : undefined;
    const downloadUrl = zipAsset?.browser_download_url;

    const cmp = compareSemver(installedVersion, latestVersion);
    if (cmp < 0) {
      return {
        status: "updateAvailable",
        installedVersion,
        latestVersion,
        releaseUrl,
        downloadUrl,
      };
    }

    return {
      status: "upToDate",
      installedVersion,
      latestVersion,
      releaseUrl,
      downloadUrl,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Request timed out after ${FETCH_TIMEOUT_MS}ms`
          : err.message
        : String(err);
    return {
      status: "error",
      installedVersion,
      message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Silent / background-friendly check with a short TTL cache.
 * Errors are cached only briefly (not written) so the next open can retry.
 */
export async function checkLatestReleaseCached(
  options: { force?: boolean } = {}
): Promise<UpdateCheckResult> {
  const installedVersion = getInstalledVersion();
  const force = options.force === true;

  if (!force) {
    try {
      const stored = await chrome.storage.local.get(UPDATE_CHECK_CACHE_KEY);
      const entry = stored[UPDATE_CHECK_CACHE_KEY];
      if (
        isCacheEntry(entry) &&
        entry.installedVersion === installedVersion &&
        Date.now() - entry.checkedAt < UPDATE_CHECK_CACHE_TTL_MS &&
        entry.result.status !== "error"
      ) {
        return {
          ...entry.result,
          installedVersion,
        };
      }
    } catch {
      // storage unavailable — fall through to network
    }
  }

  const result = await checkLatestRelease();

  if (result.status !== "error") {
    try {
      const cache: UpdateCheckCache = {
        checkedAt: Date.now(),
        installedVersion: result.installedVersion,
        result,
      };
      await chrome.storage.local.set({ [UPDATE_CHECK_CACHE_KEY]: cache });
    } catch {
      // ignore cache write failures
    }
  }

  return result;
}

/** Whether the result means the user can upgrade. */
export function isUpdateAvailable(result: UpdateCheckResult | null | undefined): boolean {
  return result?.status === "updateAvailable";
}
