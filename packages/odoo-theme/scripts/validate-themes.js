#!/usr/bin/env node
'use strict';
// Validates the generated themes:
//  1. Each JSON exists, parses and is declared in package.json > contributes.themes.
//  2. The files are up to date with palette.json (not edited by hand, not stale).
//  3. No stray colors: every hex (without alpha) exists in palette.json.
//  4. All 4 variants have exactly the same color keys and the same roles.
//  5. Values (#RRGGBB / #RRGGBBAA) and tokenColors rules are well formed.
// Usage: node scripts/validate-themes.js

const fs = require('fs');
const path = require('path');
const { PACKAGE_DIR, THEMES_DIR, loadPalette, themeFileName, buildTheme } = require('./lib/palette');
const { isHex, baseHex } = require('./lib/color');

const errors = [];
const fail = (msg) => errors.push(msg);

function collectPaletteHexes(palette) {
  const set = new Set();
  for (const v of Object.values(palette.variants)) {
    for (const value of Object.values(v.colors || {})) if (isHex(value)) set.add(baseHex(value));
  }
  return set;
}

function main() {
  const palette = loadPalette();
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8'));
  const contributed = new Map((pkg.contributes.themes || []).map((t) => [path.normalize(t.path), t]));
  const paletteHexes = collectPaletteHexes(palette);

  let referenceKeys = null;
  let referenceRoles = null;

  for (const id of Object.keys(palette.variants)) {
    const rel = `./themes/${themeFileName(id)}`;
    const file = path.join(THEMES_DIR, themeFileName(id));
    if (!fs.existsSync(file)) {
      fail(`${rel}: missing (run npm run build)`);
      continue;
    }

    let theme;
    try {
      theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      fail(`${rel}: invalid JSON (${e.message})`);
      continue;
    }

    // 1. Declared in package.json with the right label and uiTheme
    const entry = contributed.get(path.normalize(rel));
    const v = palette.variants[id];
    if (!entry) fail(`${rel}: not listed in contributes.themes`);
    else {
      if (entry.label !== v.label) fail(`${rel}: label "${entry.label}" ≠ "${v.label}"`);
      if (entry.uiTheme !== v.uiTheme) fail(`${rel}: uiTheme "${entry.uiTheme}" ≠ "${v.uiTheme}"`);
    }

    // 2. Up to date with the palette
    const expected = buildTheme(palette, id).theme;
    if (JSON.stringify(expected) !== JSON.stringify(theme)) fail(`${rel}: out of date with palette.json (run npm run build)`);

    // 3 and 5. Format and origin of every color
    for (const [key, value] of Object.entries(theme.colors)) {
      if (!isHex(value)) fail(`${rel}: colors.${key} has an invalid format "${value}"`);
      else if (!paletteHexes.has(baseHex(value))) fail(`${rel}: colors.${key} = ${value} does not come from palette.json`);
    }
    theme.tokenColors.forEach((rule, i) => {
      if (!Array.isArray(rule.scope) || rule.scope.length === 0) fail(`${rel}: tokenColors[${i}] has no scopes`);
      const fg = rule.settings && rule.settings.foreground;
      if (fg && !paletteHexes.has(baseHex(fg))) fail(`${rel}: tokenColors[${i}] (${rule.name}) = ${fg} does not come from palette.json`);
      if (!rule.settings || (!fg && rule.settings.fontStyle === undefined)) fail(`${rel}: tokenColors[${i}] has no settings`);
    });
    for (const [sel, s] of Object.entries(theme.semanticTokenColors)) {
      if (s.foreground && !paletteHexes.has(baseHex(s.foreground))) fail(`${rel}: semanticTokenColors.${sel} does not come from palette.json`);
    }
    if (theme.semanticHighlighting !== true) fail(`${rel}: semanticHighlighting must be true`);

    // 4. Same keys in every variant
    const keys = Object.keys(theme.colors).sort().join('|');
    const roles = theme.tokenColors.map((r) => r.name).join('|');
    if (referenceKeys === null) {
      referenceKeys = keys;
      referenceRoles = roles;
    } else {
      if (keys !== referenceKeys) fail(`${rel}: the set of color keys differs from the other variants`);
      if (roles !== referenceRoles) fail(`${rel}: the tokenColors roles differ from the other variants`);
    }

    console.log(`✔ ${theme.name.padEnd(16)} ${Object.keys(theme.colors).length} colors, ${theme.tokenColors.length} rules, ${Object.keys(theme.semanticTokenColors).length} semantic tokens`);
  }

  // Injection grammar is declared and readable
  for (const g of pkg.contributes.grammars || []) {
    const gp = path.join(PACKAGE_DIR, g.path);
    try {
      const grammar = JSON.parse(fs.readFileSync(gp, 'utf8'));
      if (grammar.scopeName !== g.scopeName) fail(`${g.path}: scopeName does not match package.json`);
    } catch (e) {
      fail(`${g.path}: cannot be read (${e.message})`);
    }
  }

  if (errors.length) {
    console.error(`\n✖ ${errors.length} problem(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('\n✔ Themes are valid: no stray colors, up to date with palette.json and the same keys in all 4 variants');
}

main();
