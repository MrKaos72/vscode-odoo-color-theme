'use strict';
// Loads palette.json (monorepo root), resolves inheritance and references, and builds
// the theme objects in memory. Used by build-themes, check-contrast and validate-themes.

const fs = require('fs');
const path = require('path');
const { isHex } = require('./color');
const { SCOPES, SEMANTIC } = require('./token-map');

const PACKAGE_DIR = path.resolve(__dirname, '..', '..');
const PALETTE_PATH = path.resolve(PACKAGE_DIR, '..', '..', 'palette.json');
const THEMES_DIR = path.join(PACKAGE_DIR, 'themes');

// "$name" or "$name/AA"
const REF_RE = /^\$([A-Za-z][A-Za-z0-9]*)(?:\/([0-9a-fA-F]{2}))?$/;

function loadPalette() {
  return JSON.parse(fs.readFileSync(PALETTE_PATH, 'utf8'));
}

function themeFileName(variantId) {
  return `odoo-${variantId}-color-theme.json`;
}

// Merges a variant with its parent ('extends'), recursively.
function mergeVariant(palette, id, seen = new Set()) {
  const v = palette.variants[id];
  if (!v) throw new Error(`Unknown variant: ${id}`);
  if (seen.has(id)) throw new Error(`Circular inheritance in variant ${id}`);
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

// Resolves the 'colors' block: each value is a hex or a reference to another name.
function resolveColors(rawColors, variantId) {
  const out = {};
  const resolving = new Set();
  const resolve = (name) => {
    if (out[name]) return out[name];
    const raw = rawColors[name];
    if (raw === undefined) throw new Error(`[${variantId}] undefined color: "${name}"`);
    if (isHex(raw)) return (out[name] = raw.toUpperCase());
    const m = REF_RE.exec(raw);
    if (!m) throw new Error(`[${variantId}] invalid value in colors.${name}: "${raw}"`);
    if (resolving.has(name)) throw new Error(`[${variantId}] circular reference in colors.${name}`);
    resolving.add(name);
    const base = resolve(m[1]);
    resolving.delete(name);
    return (out[name] = m[2] ? base.slice(0, 7) + m[2].toUpperCase() : base);
  };
  Object.keys(rawColors).forEach(resolve);
  return out;
}

// Resolves a workbench/syntax reference. A hex literal here is a "stray color": error.
function resolveRef(value, colors, where) {
  if (isHex(value)) throw new Error(`${where}: stray color "${value}". Use a $name reference from palette.json`);
  const m = REF_RE.exec(value);
  if (!m) throw new Error(`${where}: invalid reference "${value}"`);
  const base = colors[m[1]];
  if (!base) throw new Error(`${where}: color "$${m[1]}" does not exist in this variant`);
  const hex = m[2] ? base.slice(0, 7) + m[2].toUpperCase() : base;
  return { hex, name: m[1], alpha: m[2] || null };
}

// Builds the theme of a variant. Returns the theme JSON and the origin of each color
// (which palette name produced it), used by the contrast report.
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
    if (!roleSettings[role]) throw new Error(`[${variantId}] role "${role}" from token-map.js does not exist in palette.json > syntax`);
    tokenColors.push({ name: role, scope: scopes, settings: roleSettings[role] });
  }
  for (const role of Object.keys(roleSettings)) {
    if (!SCOPES[role]) throw new Error(`[${variantId}] role "${role}" has no scopes in token-map.js`);
  }

  const semanticTokenColors = {};
  for (const [selector, role] of Object.entries(SEMANTIC)) {
    const s = roleSettings[role];
    if (!s) throw new Error(`[${variantId}] semantic "${selector}" points to unknown role "${role}"`);
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
