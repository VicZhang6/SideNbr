#!/usr/bin/env node
/**
 * Zip dist/ into artifacts/SideNbr-<version>.zip for release / local packaging.
 *
 * Usage (after npm run build):
 *   node scripts/package-dist.mjs
 *
 * Version is read from package.json, falling back to dist/manifest.json
 * then public/manifest.json.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const ARTIFACTS = join(ROOT, "artifacts");

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    if (pkg.version) return String(pkg.version);
  } catch {
    // ignore
  }
  try {
    const man = JSON.parse(readFileSync(join(DIST, "manifest.json"), "utf8"));
    if (man.version) return String(man.version);
  } catch {
    // ignore
  }
  try {
    const man = JSON.parse(
      readFileSync(join(ROOT, "public", "manifest.json"), "utf8")
    );
    if (man.version) return String(man.version);
  } catch {
    // ignore
  }
  return "0.0.0";
}

function listFilesRecursive(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal store-only ZIP writer (no external deps). CRC + deflate. */
function writeZipPureSync(zipPath, baseDir, files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const full of files) {
    const data = readFileSync(full);
    const name = relative(baseDir, full).split(sep).join("/");
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const compressed = deflateRawSync(data);
    const use = compressed.length < data.length ? compressed : data;
    const useMethod = compressed.length < data.length ? 8 : 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(useMethod, 8);
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(use.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    const local = Buffer.concat([localHeader, nameBuf, use]);
    localParts.push(local);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(useMethod, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(use.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(Buffer.concat([central, nameBuf]));
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  writeFileSync(zipPath, Buffer.concat([...localParts, centralDir, end]));
}

function zipWithCli(zipPath, baseDir) {
  // From inside dist/: zip -r -X -q <absolute-or-relative-out> .
  // -X strips extra file attrs for more portable archives.
  const result = spawnSync("zip", ["-r", "-X", "-q", zipPath, "."], {
    cwd: baseDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `zip CLI failed (status ${result.status}): ${result.stderr || result.stdout || "unknown"}`
    );
  }
}

function main() {
  if (!existsSync(DIST)) {
    console.error("ERROR: dist/ does not exist. Run npm run build first.");
    process.exit(1);
  }

  const version = readVersion();
  const zipName = `SideNbr-${version}.zip`;

  mkdirSync(ARTIFACTS, { recursive: true });
  const zipPath = join(ARTIFACTS, zipName);

  if (existsSync(zipPath)) {
    unlinkSync(zipPath);
  }

  const files = listFilesRecursive(DIST);
  if (files.length === 0) {
    console.error("ERROR: dist/ is empty.");
    process.exit(1);
  }

  let method = "zip-cli";
  try {
    zipWithCli(zipPath, DIST);
  } catch (err) {
    console.warn(
      `[package-dist] zip CLI unavailable or failed: ${err.message}`
    );
    console.warn("[package-dist] Falling back to pure Node zip writer…");
    method = "node-pure";
    writeZipPureSync(zipPath, DIST, files);
  }

  const st = statSync(zipPath);
  const sha = createHash("sha256").update(readFileSync(zipPath)).digest("hex");

  console.log(`[package-dist] version: ${version}`);
  console.log(`[package-dist] method:  ${method}`);
  console.log(`[package-dist] files:   ${files.length} under dist/`);
  console.log(`[package-dist] output:  ${zipPath}`);
  console.log(`[package-dist] size:    ${st.size} bytes`);
  console.log(`[package-dist] sha256:  ${sha}`);
}

main();
