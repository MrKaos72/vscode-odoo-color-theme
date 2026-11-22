'use strict';
// Utilidades de color compartidas por los scripts. Sin dependencias externas.

const HEX_RE = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/;

function isHex(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

// Convierte "#RRGGBB" o "#RRGGBBAA" en { r, g, b, a } (r,g,b en 0-255, a en 0-1).
function parseHex(hex) {
  const m = HEX_RE.exec(hex);
  if (!m) throw new Error(`Color hex inválido: ${hex}`);
  const n = m[1];
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
    a: m[2] ? parseInt(m[2], 16) / 255 : 1,
  };
}

function toHex({ r, g, b }) {
  const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// Quita el canal alfa: "#RRGGBBAA" -> "#RRGGBB".
function baseHex(hex) {
  return hex.slice(0, 7).toUpperCase();
}

// Compone un color con alfa sobre un fondo opaco.
function blend(fgHex, bgHex) {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  const a = fg.a;
  return toHex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  });
}

// Luminancia relativa según WCAG 2.x.
function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(aHex, bHex) {
  const la = luminance(aHex);
  const lb = luminance(bHex);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 };
}

// Busca el color más cercano (mismo tono y saturación, cambiando solo la luminosidad)
// que alcance el contraste objetivo contra todos los fondos indicados.
function suggestColor(fgHex, bgHexes, target) {
  const hsl = rgbToHsl(parseHex(fgHex));
  const bgs = Array.isArray(bgHexes) ? bgHexes : [bgHexes];
  const passes = (hex) => bgs.every((bg) => contrastRatio(hex, bg) >= target);
  for (let step = 1; step <= 100; step++) {
    for (const dir of [1, -1]) {
      const l = hsl.l + (dir * step) / 200;
      if (l < 0 || l > 1) continue;
      const hex = toHex(hslToRgb({ ...hsl, l }));
      if (passes(hex)) return hex;
    }
  }
  return null;
}

module.exports = { isHex, parseHex, toHex, baseHex, blend, luminance, contrastRatio, suggestColor };
