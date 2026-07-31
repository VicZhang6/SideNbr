#!/usr/bin/env node
/**
 * Verify extension build output (dist/).
 *
 *   node scripts/check-build.mjs
 *
 * Requires the full open-source build (DNR frame rules included).
 */

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

const required = [
  "manifest.json",
  "background.js",
  "sidepanel.html",
  "session-host.html",
  "settings.html",
  "frame-bypass-rules.json",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

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
  console.log("check-build: SideNbr full package");

  try {
    await access(DIST, constants.R_OK);
  } catch {
    console.error("ERROR: dist/ does not exist. Run npm run build first.");
    process.exit(1);
  }

  for (const file of required) {
    await ok(file);
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(DIST, "manifest.json"), "utf8"));
  } catch (e) {
    console.error(`ERROR: cannot parse dist/manifest.json: ${e.message}`);
    process.exit(1);
  }

  const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const name = String(manifest.name || "");

  if (name.includes("Private") || name.includes("private")) {
    console.error('FAIL: extension name must be "SideNbr" (no Private label)');
    failed += 1;
  } else if (name !== "SideNbr") {
    console.warn(`WARN: expected name "SideNbr", got "${name}"`);
  } else {
    console.log("OK: name = SideNbr");
  }

  if (!perms.includes("declarativeNetRequestWithHostAccess") && !perms.includes("declarativeNetRequest")) {
    console.error("FAIL: expected declarativeNetRequest permission(s)");
    failed += 1;
  } else {
    console.log("OK: declarativeNetRequest present");
  }

  if (!manifest.declarative_net_request) {
    console.error("FAIL: declarative_net_request missing");
    failed += 1;
  } else {
    console.log("OK: declarative_net_request present");
    const resources = manifest.declarative_net_request.rule_resources ?? [];
    const frame = resources.find((r) => r.path === "frame-bypass-rules.json");
    if (!frame) {
      console.error('FAIL: rule resource frame-bypass-rules.json missing');
      failed += 1;
    } else {
      console.log("OK: rule resource frame-bypass-rules.json");
    }
  }

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
  console.log("check-build passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
