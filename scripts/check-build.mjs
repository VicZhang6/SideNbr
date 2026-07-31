#!/usr/bin/env node
/**
 * Verify extension build output (dist/).
 *
 * Store-safe (default):
 *   node scripts/check-build.mjs
 *   - Required files present
 *   - Manifest MUST NOT include declarativeNetRequestWithHostAccess
 *   - Manifest MUST NOT include declarative_net_request
 *
 * Private build:
 *   node scripts/check-build.mjs --private
 *   - Required files + frame-bypass-rules.json
 *   - Manifest MUST include DNR permission and rule resource
 */

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const isPrivate = process.argv.includes("--private");

const required = [
  "manifest.json",
  "background.js",
  "sidepanel.html",
  "icons/icon-128.png",
];

if (isPrivate) {
  required.push("frame-bypass-rules.json");
  // Prefer full icon set when private check runs after a complete build
  required.push("icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png");
}

let failed = 0;

async function ok(rel) {
  const full = join(DIST, rel);
  try {
    await access(full, constants.R_OK);
    console.log(`OK: dist/${rel}`);
    return true;
  } catch {
    console.error(`MISSING: dist/${rel}`);
    failed += 1;
    return false;
  }
}

async function main() {
  console.log(
    isPrivate
      ? "check-build: PRIVATE mode"
      : "check-build: STORE-SAFE mode"
  );

  try {
    await access(DIST, constants.R_OK);
  } catch {
    console.error("ERROR: dist/ does not exist. Run npm run build first.");
    process.exit(1);
  }

  for (const file of required) {
    await ok(file);
  }

  // Soft-check remaining icons for store-safe
  if (!isPrivate) {
    for (const icon of ["icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png"]) {
      await ok(icon);
    }
  }

  const manifestPath = join(DIST, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (e) {
    console.error(`ERROR: cannot parse dist/manifest.json: ${e.message}`);
    process.exit(1);
  }

  const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const hasDnrPerm = perms.includes("declarativeNetRequestWithHostAccess");
  const hasDnrBlock = Boolean(manifest.declarative_net_request);

  if (isPrivate) {
    if (!hasDnrPerm) {
      console.error(
        "FAIL: private build must include permission declarativeNetRequestWithHostAccess"
      );
      failed += 1;
    } else {
      console.log("OK: declarativeNetRequestWithHostAccess present");
    }
    if (!hasDnrBlock) {
      console.error("FAIL: private build must include declarative_net_request");
      failed += 1;
    } else {
      console.log("OK: declarative_net_request present");
      const resources = manifest.declarative_net_request.rule_resources ?? [];
      const frame = resources.find((r) => r.path === "frame-bypass-rules.json");
      if (!frame) {
        console.error(
          'FAIL: declarative_net_request must reference path "frame-bypass-rules.json"'
        );
        failed += 1;
      } else {
        console.log("OK: rule resource frame-bypass-rules.json");
      }
    }
    if (!String(manifest.name || "").toLowerCase().includes("private")) {
      console.warn(
        'WARN: private manifest name should indicate Private (e.g. "SideNbr (Private)")'
      );
    }
  } else {
    if (hasDnrPerm) {
      console.error(
        "FAIL: store-safe build must NOT include declarativeNetRequestWithHostAccess"
      );
      failed += 1;
    } else {
      console.log("OK: no declarativeNetRequestWithHostAccess (store-safe)");
    }
    if (hasDnrBlock) {
      console.error(
        "FAIL: store-safe build must NOT include declarative_net_request"
      );
      failed += 1;
    } else {
      console.log("OK: no declarative_net_request (store-safe)");
    }
  }

  // Basic structural checks shared by both modes
  if (manifest.manifest_version !== 3) {
    console.error("FAIL: manifest_version must be 3");
    failed += 1;
  } else {
    console.log("OK: manifest_version 3");
  }
  if (!manifest.side_panel?.default_path) {
    console.error("FAIL: side_panel.default_path missing");
    failed += 1;
  } else {
    console.log(`OK: side_panel.default_path = ${manifest.side_panel.default_path}`);
  }
  if (!manifest.background?.service_worker) {
    console.error("FAIL: background.service_worker missing");
    failed += 1;
  } else {
    console.log(`OK: service_worker = ${manifest.background.service_worker}`);
  }

  console.log("");
  if (failed > 0) {
    console.error(`check-build failed with ${failed} issue(s).`);
    process.exit(1);
  }
  console.log(
    isPrivate
      ? "check-build passed (private). Do NOT submit this package to the Chrome Web Store."
      : "check-build passed (store-safe)."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
