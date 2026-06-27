#!/usr/bin/env node
// Generates icon assets with no external dependencies.
// Outputs: assets/tray-icon.png (32x32), assets/icon.png (512x512), assets/icon.ico (256x256)

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── Minimal PNG encoder ─────────────────────────────────────────────────────

function encodePNG(pixels, width, height) {
  // Build CRC table
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    tbl[i] = c >>> 0;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = (tbl[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
    return ((c ^ 0xffffffff) >>> 0);
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const body = Buffer.concat([t, d]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type

  // Scanlines (filter byte 0x00 + RGBA pixels)
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(0x00);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rows.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rows), { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── ICO wrapper (PNG-in-ICO, Windows Vista+) ────────────────────────────────

function wrapIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: ICO
  header.writeUInt16LE(1, 4);   // count: 1

  const entry = Buffer.alloc(16);
  entry[0] = 0;  // width  (0 = 256)
  entry[1] = 0;  // height (0 = 256)
  entry[2] = 0;  // color count
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(1, 4);    // planes
  entry.writeUInt16LE(32, 6);   // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);   // image size
  entry.writeUInt32LE(22, 12);  // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

// ─── Icon painter ────────────────────────────────────────────────────────────
// Draws a simple golden envelope with a transparent background.

function drawEnvelope(size) {
  const W = size, H = size;
  const px = new Uint8Array(W * H * 4); // all transparent by default

  function set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  }

  for (let py = 0; py < H; py++) {
    for (let px2 = 0; px2 < W; px2++) {
      // Map pixel to 0..16 coordinate space
      const nx = (px2 + 0.5) * 16 / W;
      const ny = (py + 0.5) * 16 / H;

      // Envelope rectangle: x=[1,15), y=[2,14)
      if (nx < 1 || nx >= 15 || ny < 2 || ny >= 14) continue;

      // V-fold line: from (1,2) through apex (8,8) to (15,2)
      const foldY = 2 + 6 * (1 - Math.abs(nx - 8) / 7);

      if (ny < foldY) {
        // Upper flap — slightly darker amber
        set(px2, py, 178, 118, 22);
      } else {
        // Envelope body — golden amber matching the app's accent
        set(px2, py, 212, 153, 52);
      }
    }
  }

  return px;
}

// ─── Generate ────────────────────────────────────────────────────────────────

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// 32×32 tray icon (used on macOS and Linux; Windows falls back to icon.ico)
const tray32 = drawEnvelope(32);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), encodePNG(tray32, 32, 32));

// 512×512 app icon — used by electron-builder for dmg / AppImage
const app512 = drawEnvelope(512);
const app512png = encodePNG(app512, 512, 512);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), app512png);

// 256×256 inside an ICO container — used for Windows taskbar + tray
const ico256 = drawEnvelope(256);
const ico256png = encodePNG(ico256, 256, 256);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), wrapIco(ico256png));

console.log('Icons written to assets/');
