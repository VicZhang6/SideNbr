#!/usr/bin/env node
/**
 * Generate branded PNG icons for SideNbr without native deps (sharp/canvas).
 * Pure Node: zlib deflate + PNG chunk writer.
 *
 * Usage: node scripts/generate-icons.mjs
 * Output: public/icons/icon-{16,32,48,128}.png
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");
const SIZES = [16, 32, 48, 128];

// Brand colors (indigo / blue)
const BG = [37, 99, 235]; // #2563eb
const BG_DARK = [30, 64, 175]; // #1e40af
const FG = [255, 255, 255]; // white
const ACCENT = [191, 219, 254]; // #bfdbfe

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: None
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPixel(rgba, size, x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  rgba[i] = rgb[0];
  rgba[i + 1] = rgb[1];
  rgba[i + 2] = rgb[2];
  rgba[i + 3] = a;
}

function fillRect(rgba, size, x0, y0, w, h, rgb, a = 255) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(rgba, size, x, y, rgb, a);
    }
  }
}

function fillCircle(rgba, size, cx, cy, r, rgb, a = 255) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(rgba, size, x, y, rgb, a);
    }
  }
}

/** Rounded square background with soft gradient + sidebar motif + "AI" bars */
function paintIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  // Transparent outside (Chrome icons look better with rounded content)
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 0;

  const pad = Math.max(1, Math.round(size * 0.06));
  const radius = Math.max(2, Math.round(size * 0.22));
  const left = pad;
  const top = pad;
  const right = size - pad - 1;
  const bottom = size - pad - 1;
  const w = right - left + 1;
  const h = bottom - top + 1;

  // Rounded rect fill with vertical-ish gradient
  for (let y = top; y <= bottom; y++) {
    const ty = (y - top) / Math.max(1, h - 1);
    const r = Math.round(BG[0] * (1 - ty) + BG_DARK[0] * ty);
    const g = Math.round(BG[1] * (1 - ty) + BG_DARK[1] * ty);
    const b = Math.round(BG[2] * (1 - ty) + BG_DARK[2] * ty);
    for (let x = left; x <= right; x++) {
      const dx = Math.min(x - left, right - x);
      const dy = Math.min(y - top, bottom - y);
      // corner mask
      if (dx < radius && dy < radius) {
        const cx = dx < radius && x - left < radius ? left + radius : right - radius;
        const cy = dy < radius && y - top < radius ? top + radius : bottom - radius;
        const ddx = x - cx;
        const ddy = y - cy;
        if (ddx * ddx + ddy * ddy > radius * radius) continue;
      }
      setPixel(rgba, size, x, y, [r, g, b], 255);
    }
  }

  // Left sidebar rail (motif)
  const railW = Math.max(2, Math.round(size * 0.12));
  const railX = left + Math.round(size * 0.14);
  const railY = top + Math.round(size * 0.22);
  const railH = Math.round(h * 0.56);
  fillRect(rgba, size, railX, railY, railW, railH, ACCENT, 230);

  // Three content lines (sidebar content hint)
  const lineX = railX + railW + Math.max(1, Math.round(size * 0.08));
  const lineMaxW = right - lineX - Math.round(size * 0.14);
  const lineH = Math.max(1, Math.round(size * 0.06));
  const gaps = Math.max(2, Math.round(size * 0.1));
  for (let i = 0; i < 3; i++) {
    const lw = Math.round(lineMaxW * (i === 1 ? 0.85 : i === 2 ? 0.55 : 1));
    const ly = railY + i * (lineH + gaps);
    fillRect(rgba, size, lineX, ly, lw, lineH, FG, 240);
  }

  // Small accent dot (AI marker) on larger sizes
  if (size >= 32) {
    const dotR = Math.max(1, Math.round(size * 0.05));
    fillCircle(
      rgba,
      size,
      right - Math.round(size * 0.18),
      top + Math.round(size * 0.22),
      dotR,
      ACCENT,
      255
    );
  }

  return rgba;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const rgba = paintIcon(size);
    const png = writePng(size, size, rgba);
    const path = join(OUT_DIR, `icon-${size}.png`);
    writeFileSync(path, png);
    console.log(`Wrote ${path} (${png.length} bytes)`);
  }
  console.log("Icon generation complete.");
}

main();
