#!/usr/bin/env node
/**
 * Apply private/compatibility overlay onto a Vite build output (dist/).
 *
 * - Copies private/frame-bypass-rules.json → dist/frame-bypass-rules.json
 * - Writes private/manifest.private.json → dist/manifest.json
 *   (paths already match dist layout: background.js, sidepanel.html, icons/, rules)
 *
 * Usage (after vite build):
 *   node scripts/apply-private-manifest.mjs
 *
 * Or via package script:
 *   npm run build:private
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const PRIVATE = join(ROOT, "private");

const RULES_SRC = join(PRIVATE, "frame-bypass-rules.json");
const MANIFEST_SRC = join(PRIVATE, "manifest.private.json");
const RULES_DST = join(DIST, "frame-bypass-rules.json");
const MANIFEST_DST = join(DIST, "manifest.json");

const WARN = `
╔══════════════════════════════════════════════════════════════════╗
║  WARNING: PRIVATE / COMPATIBILITY BUILD                          ║
║                                                                  ║
║  This package includes declarativeNetRequest rules that strip    ║
║  X-Frame-Options and Content-Security-Policy on sub_frame        ║
║  responses for perplexity.ai / chatgpt.com / openai.com.         ║
║                                                                  ║
║  • NOT for Chrome Web Store submission                           ║
║  • Local / personal / authorized internal use only               ║
║  • See private/README.md for full risk notes                     ║
╚══════════════════════════════════════════════════════════════════╝
`.trim();

function fail(msg) {
  console.error(`[apply-private-manifest] ERROR: ${msg}`);
  process.exit(1);
}

function main() {
  console.log(WARN);
  console.log("");

  if (!existsSync(DIST)) {
    fail(`dist/ not found. Run "npm run build" (or vite build) first.`);
  }
  if (!existsSync(RULES_SRC)) {
    fail(`Missing ${RULES_SRC}`);
  }
  if (!existsSync(MANIFEST_SRC)) {
    fail(`Missing ${MANIFEST_SRC}`);
  }

  // Validate rules JSON
  let rules;
  try {
    rules = JSON.parse(readFileSync(RULES_SRC, "utf8"));
  } catch (e) {
    fail(`Invalid JSON in frame-bypass-rules.json: ${e.message}`);
  }
  if (!Array.isArray(rules) || rules.length === 0) {
    fail("frame-bypass-rules.json must be a non-empty array");
  }
  for (const rule of rules) {
    const types = rule?.condition?.resourceTypes ?? [];
    if (types.includes("main_frame")) {
      fail(
        `Rule id ${rule.id} targets main_frame — only sub_frame is allowed for private bypass.`
      );
    }
  }

  // Validate private manifest
  let privateManifest;
  try {
    privateManifest = JSON.parse(readFileSync(MANIFEST_SRC, "utf8"));
  } catch (e) {
    fail(`Invalid JSON in manifest.private.json: ${e.message}`);
  }

  if (
    !privateManifest.permissions?.includes("declarativeNetRequestWithHostAccess")
  ) {
    fail(
      'manifest.private.json must include permission "declarativeNetRequestWithHostAccess"'
    );
  }
  if (!privateManifest.declarative_net_request?.rule_resources?.length) {
    fail("manifest.private.json must declare declarative_net_request.rule_resources");
  }

  // Prefer private manifest version; only fill icons if missing.
  // Do NOT overwrite private version with store-safe — private patches often bump first.
  if (existsSync(MANIFEST_DST)) {
    try {
      const store = JSON.parse(readFileSync(MANIFEST_DST, "utf8"));
      if (store.icons && !privateManifest.icons) {
        privateManifest.icons = store.icons;
      }
    } catch {
      // ignore broken dist manifest; full private replaces it
    }
  }

  mkdirSync(DIST, { recursive: true });
  copyFileSync(RULES_SRC, RULES_DST);
  writeFileSync(MANIFEST_DST, JSON.stringify(privateManifest, null, 2) + "\n", "utf8");

  console.log(`[apply-private-manifest] Copied rules → ${RULES_DST}`);
  console.log(`[apply-private-manifest] Wrote private manifest → ${MANIFEST_DST}`);
  console.log(`[apply-private-manifest] name: ${privateManifest.name}`);
  console.log(`[apply-private-manifest] version: ${privateManifest.version}`);
  console.log(
    `[apply-private-manifest] permissions: ${privateManifest.permissions.join(", ")}`
  );
  console.log("");
  console.log(
    "Load dist/ via chrome://extensions (Developer mode). Do NOT upload this build to the Chrome Web Store."
  );
}

main();
