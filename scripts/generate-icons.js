#!/usr/bin/env node
// Generates icon assets from the Lucide mail-open SVG using sharp.
// Outputs: assets/tray-icon.png (32×32), assets/icon.png (512×512), assets/icon.ico

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

// ─── SVG templates ───────────────────────────────────────────────────────────

// App icon: dark rounded-square background + centred golden mail-open
function appIconSvg(size) {
  const r = Math.round(size * 0.22);   // corner radius
  const pad = size * 0.18;             // icon padding inside square
  const ic = size - pad * 2;           // icon area side length
  const scale = ic / 24;
  const accent = '#D49A3C';
  const bg = '#131c2e';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>
  <g transform="translate(${pad},${pad}) scale(${scale})">
    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"
          fill="${accent}" stroke="${accent}" stroke-width="0.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 10l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"
          fill="none" stroke="${bg}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// Tray icon: white on transparent, padded so it doesn't fill the full slot.
// viewBox="-5 -5 34 34" gives ~5px padding on each side of the 24×24 icon.
function trayIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-5 -5 34 34"
        fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
  <path d="M22 10l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
</svg>`;
}

// ─── ICO wrapper (PNG-in-ICO, Windows Vista+) ────────────────────────────────

function wrapIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

// ─── Generate ────────────────────────────────────────────────────────────────

async function main() {
  // 512×512 app icon
  await sharp(Buffer.from(appIconSvg(512)))
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));

  // 32×32 tray (template image for macOS)
  await sharp(Buffer.from(trayIconSvg(32)))
    .resize(32, 32)
    .png()
    .toFile(path.join(ASSETS, 'tray-icon.png'));

  // 64×64 tray @2x (retina)
  await sharp(Buffer.from(trayIconSvg(64)))
    .resize(64, 64)
    .png()
    .toFile(path.join(ASSETS, 'tray-icon@2x.png'));

  // 256×256 ICO for Windows
  const ico256 = await sharp(Buffer.from(appIconSvg(256))).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS, 'icon.ico'), wrapIco(ico256));

  console.log('Icons written to assets/');
}

main().catch(err => { console.error(err); process.exit(1); });
