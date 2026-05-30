// Pure-stdlib PWA icon generator. Rasterises a stylised pickleball paddle
// (mirrors public/icons/source.svg) to PNG at 192x192 and 512x512 using
// only built-in Node modules — no `sharp`, no `canvas`, no native deps.
//
// Why bespoke instead of sharp/resvg?
// - This project ships from a Windows workstation. Both `sharp` and
//   `@resvg/resvg-js` have caused install failures there in the past.
// - The PWA spec only needs flat 192/512 PNGs; we don't need a full SVG
//   renderer for that, just two parametric shapes.
//
// Run: `node scripts/generate-icons.mjs`

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, "..", "public", "icons");

const BG = [0x2f, 0x5b, 0xff]; // brand blue
const FG = [0xff, 0xff, 0xff]; // paddle white
const BALL = [0xc6, 0xf4, 0x32]; // pickleball lime

// ----- pixel-level drawing helpers -------------------------------------------

function makeBuffer(size) {
  // Filtered scanlines: each row is prefixed with a 1-byte filter (0 = None).
  // Row length = 1 + size * 3 (RGB, no alpha).
  return Buffer.alloc(size * (1 + size * 3));
}

function setPixel(buf, size, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const rowStart = y * (1 + size * 3);
  const i = rowStart + 1 + x * 3;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
}

function fillBackground(buf, size, color) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(buf, size, x, y, color);
  }
}

/** Rounded-corner rectangle. */
function fillRoundedRect(buf, size, x0, y0, w, h, r, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // skip corners outside the rounding radius
      const cx = x < x0 + r ? x0 + r : x >= x0 + w - r ? x0 + w - 1 - r : x;
      const cy = y < y0 + r ? y0 + r : y >= y0 + h - r ? y0 + h - 1 - r : y;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(buf, size, x, y, color);
    }
  }
}

/** Axis-aligned ellipse (cx, cy) with semi-axes (rx, ry). */
function fillEllipse(buf, size, cx, cy, rx, ry, color) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPixel(buf, size, x, y, color);
    }
  }
}

function fillCircle(buf, size, cx, cy, r, color) {
  fillEllipse(buf, size, cx, cy, r, r, color);
}

// ----- PNG encoder -----------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = deflateSync(pixels);
  const iend = Buffer.alloc(0);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", iend)]);
}

// ----- compose the icon ------------------------------------------------------

function render(size) {
  const buf = makeBuffer(size);
  fillBackground(buf, size, BG);

  // Rounded corner overlay drawn as a plain rect — the PNG itself is square
  // but using `purpose: maskable` in manifest.json lets the OS clip corners.
  // Optional: draw a slightly darker frame inside to lift the icon visually.

  const s = size; // shortcut
  // Paddle head (white ellipse) centred upper-half
  fillEllipse(buf, s, Math.round(s * 0.5), Math.round(s * 0.39), Math.round(s * 0.235), Math.round(s * 0.273), FG);
  // Paddle handle (rounded rect)
  fillRoundedRect(
    buf,
    s,
    Math.round(s * 0.453),
    Math.round(s * 0.625),
    Math.round(s * 0.094),
    Math.round(s * 0.234),
    Math.round(s * 0.043),
    FG,
  );
  // Pickleball — small lime circle
  fillCircle(buf, s, Math.round(s * 0.656), Math.round(s * 0.609), Math.round(s * 0.055), BALL);

  return encodePNG(s, buf);
}

mkdirSync(ICONS_DIR, { recursive: true });
for (const size of [192, 512]) {
  const png = render(size);
  const out = resolve(ICONS_DIR, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}
