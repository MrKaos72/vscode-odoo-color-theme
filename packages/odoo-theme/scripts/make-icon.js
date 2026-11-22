#!/usr/bin/env node
'use strict';
// Genera images/icon.png (128x128) con los colores de palette.json, sin dependencias:
// cuadrado redondeado morado con un anillo "o" teal. El PNG se codifica a mano con zlib.
// Uso: node scripts/make-icon.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PACKAGE_DIR, loadPalette, mergeVariant, resolveColors } = require('./lib/palette');
const { parseHex } = require('./lib/color');

const SIZE = 128;
const SAMPLES = 4; // supermuestreo por eje para suavizar bordes

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Distancia con signo a un rectángulo redondeado centrado (negativa = dentro).
function roundedRectSdf(x, y, half, radius) {
  const qx = Math.abs(x) - half + radius;
  const qy = Math.abs(y) - half + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function main() {
  const palette = loadPalette();
  const colors = resolveColors(mergeVariant(palette, 'dark').colors, 'dark');
  const bg = parseHex(colors.primary);
  const ring = parseHex(colors.secondary);
  const dot = parseHex(colors.onPrimary);

  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  const c = SIZE / 2;
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) / SAMPLES - c;
          const y = py + (sy + 0.5) / SAMPLES - c;
          if (roundedRectSdf(x, y, 60, 26) > 0) continue; // fuera del ícono: transparente
          const d = Math.hypot(x, y + 2);
          let col = bg;
          if (d >= 22 && d <= 38) col = ring; // anillo "o"
          if (Math.hypot(x - 36, y - 36) <= 7) col = dot; // punto, guiño al logo
          r += col.r; g += col.g; b += col.b; a += 255;
        }
      }
      const n = SAMPLES * SAMPLES;
      const i = (py * SIZE + px) * 4;
      // Se guarda el color no premultiplicado.
      const cover = a / 255;
      rgba[i] = cover ? r / cover : 0;
      rgba[i + 1] = cover ? g / cover : 0;
      rgba[i + 2] = cover ? b / cover : 0;
      rgba[i + 3] = a / n;
    }
  }

  const out = path.join(PACKAGE_DIR, 'images', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, encodePng(rgba, SIZE, SIZE));
  console.log(`✔ images/icon.png (${SIZE}x${SIZE})`);
}

main();
