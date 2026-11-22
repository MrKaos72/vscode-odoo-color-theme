'use strict';
// Carga palette.json (raíz del monorepo), resuelve herencia y referencias, y construye
// los objetos de tema en memoria. Lo usan build-themes, check-contrast y validate-themes.

const fs = require('fs');
const path = require('path');
const { isHex } = require('./color');
const { SCOPES, SEMANTIC } = require('./token-map');

const PACKAGE_DIR = path.resolve(__dirname, '..', '..');
const PALETTE_PATH = path.resolve(PACKAGE_DIR, '..', '..', 'palette.json');
const THEMES_DIR = path.join(PACKAGE_DIR, 'themes');

// "$nombre" o "$nombre/AA"
const REF_RE = /^\$([A-Za-z][A-Za-z0-9]*)(?:\/([0-9a-fA-F]{2}))?$/;

function loadPalette() {
  return JSON.parse(fs.readFileSync(PALETTE_PATH, 'utf8'));
}

function themeFileName(variantId) {
  return `odoo-${variantId}-color-theme.json`;
}

// Fusiona una variante con su padre ('extends'), recursivamente.
function mergeVariant(palette, id, seen = new Set()) {
  const v = palette.variants[id];
  if (!v) throw new Error(`Variante desconocida: ${id}`);
  if (seen.has(id)) throw new Error(`Herencia circular en la variante ${id}`);
  seen.add(id);
  const parent = v.extends ? mergeVariant(palette, v.extends, seen) : { colors: {}, workbench: {}, syntax: {} };
  return {
    id,
    label: v.label,
    type: v.type,
    uiTheme: v.uiTheme,
    colors: { ...parent.colors, ...(v.colors || {}) },
    workbench: { ...parent.workbench, ...(v.workbench || {}) },
    syntax: { ...parent.syntax, ...(v.syntax || {}) },
  };
}

// Resuelve el bloque 'colors': cada valor es un hex o una referencia a otro nombre.
function resolveColors(rawColors, variantId) {
  const out = {};
  const resolving = new Set();
  const resolve = (name) => {
    if (out[name]) return out[name];
    const raw = rawColors[name];
    if (raw === undefined) throw new Error(`[${variantId}] color no definido: "${name}"`);
    if (isHex(raw)) return (out[name] = raw.toUpperCase());
    const m = REF_RE.exec(raw);
    if (!m) throw new Error(`[${variantId}] valor inválido en colors.${name}: "${raw}"`);
    if (resolving.has(name)) throw new Error(`[${variantId}] referencia circular en colors.${name}`);
    resolving.add(name);
    const base = resolve(m[1]);
    resolving.delete(name);
    return (out[name] = m[2] ? base.slice(0, 7) + m[2].toUpperCase() : base);
  };
  Object.keys(rawColors).forEach(resolve);
  return out;
}

// Resuelve una referencia de workbench/syntax. Un hex literal aquí es un "color suelto": error.
function resolveRef(value, colors, where) {
  if (isHex(value)) throw new Error(`${where}: color suelto "${value}". Usa una referencia $nombre de palette.json`);
  const m = REF_RE.exec(value);
  if (!m) throw new Error(`${where}: referencia inválida "${value}"`);
  const base = colors[m[1]];
  if (!base) throw new Error(`${where}: el color "$${m[1]}" no existe en la variante`);
  const hex = m[2] ? base.slice(0, 7) + m[2].toUpperCase() : base;
  return { hex, name: m[1], alpha: m[2] || null };
}

// Construye el tema de una variante. Devuelve el JSON del tema y el origen de cada color
// (qué nombre de la paleta lo produjo), útil para los informes de contraste.
function buildTheme(palette, variantId) {
  const merged = mergeVariant(palette, variantId);
  const workbenchMap = { ...palette.workbench, ...merged.workbench };
  const syntaxMap = { ...palette.syntax, ...merged.syntax };
  const colors = resolveColors(merged.colors, variantId);

  const origin = { colors: {}, syntax: {} };
  const themeColors = {};
  for (const key of Object.keys(workbenchMap).sort()) {
    const r = resolveRef(workbenchMap[key], colors, `[${variantId}] workbench.${key}`);
    themeColors[key] = r.hex;
    origin.colors[key] = r;
  }

  const roleSettings = {};
  for (const [role, def] of Object.entries(syntaxMap)) {
    const settings = {};
    if (def.color) {
      const r = resolveRef(def.color, colors, `[${variantId}] syntax.${role}`);
      settings.foreground = r.hex;
      origin.syntax[role] = r;
    }
    if (def.fontStyle !== undefined) settings.fontStyle = def.fontStyle;
    roleSettings[role] = settings;
  }

  const tokenColors = [];
  for (const [role, scopes] of Object.entries(SCOPES)) {
    if (!roleSettings[role]) throw new Error(`[${variantId}] el rol "${role}" de token-map.js no existe en palette.json > syntax`);
    tokenColors.push({ name: role, scope: scopes, settings: roleSettings[role] });
  }
  for (const role of Object.keys(roleSettings)) {
    if (!SCOPES[role]) throw new Error(`[${variantId}] el rol "${role}" no tiene scopes en token-map.js`);
  }

  const semanticTokenColors = {};
  for (const [selector, role] of Object.entries(SEMANTIC)) {
    const s = roleSettings[role];
    if (!s) throw new Error(`[${variantId}] semantic "${selector}" apunta al rol inexistente "${role}"`);
    const entry = {};
    if (s.foreground) entry.foreground = s.foreground;
    if (s.fontStyle) entry.fontStyle = s.fontStyle;
    semanticTokenColors[selector] = entry;
  }

  const theme = {
    $schema: 'vscode://schemas/color-theme',
    name: merged.label,
    type: merged.type,
    semanticHighlighting: true,
    colors: themeColors,
    tokenColors,
    semanticTokenColors,
  };
  return { theme, origin, resolvedColors: colors, meta: merged };
}

module.exports = { PACKAGE_DIR, PALETTE_PATH, THEMES_DIR, loadPalette, themeFileName, buildTheme, mergeVariant, resolveColors };
