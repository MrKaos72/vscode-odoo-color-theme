#!/usr/bin/env node
'use strict';
// Valida los temas generados:
//  1. Cada JSON existe, es válido y está declarado en package.json > contributes.themes.
//  2. Los archivos están al día con palette.json (no se editaron a mano ni quedaron viejos).
//  3. Ningún color es "suelto": todo hex (sin alfa) existe en palette.json.
//  4. Las 4 variantes tienen exactamente las mismas claves de colores y los mismos roles.
//  5. Formato correcto de valores (#RRGGBB / #RRGGBBAA) y de reglas tokenColors.
// Uso: node scripts/validate-themes.js

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
      fail(`${rel}: no existe (ejecuta npm run build)`);
      continue;
    }

    let theme;
    try {
      theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      fail(`${rel}: JSON inválido (${e.message})`);
      continue;
    }

    // 1. Declarado en package.json con el label y uiTheme correctos
    const entry = contributed.get(path.normalize(rel));
    const v = palette.variants[id];
    if (!entry) fail(`${rel}: no está en contributes.themes`);
    else {
      if (entry.label !== v.label) fail(`${rel}: label "${entry.label}" ≠ "${v.label}"`);
      if (entry.uiTheme !== v.uiTheme) fail(`${rel}: uiTheme "${entry.uiTheme}" ≠ "${v.uiTheme}"`);
    }

    // 2. Al día con la paleta
    const expected = buildTheme(palette, id).theme;
    if (JSON.stringify(expected) !== JSON.stringify(theme)) fail(`${rel}: desactualizado respecto a palette.json (ejecuta npm run build)`);

    // 3 y 5. Formato y origen de cada color
    for (const [key, value] of Object.entries(theme.colors)) {
      if (!isHex(value)) fail(`${rel}: colors.${key} tiene formato inválido "${value}"`);
      else if (!paletteHexes.has(baseHex(value))) fail(`${rel}: colors.${key} = ${value} no sale de palette.json`);
    }
    theme.tokenColors.forEach((rule, i) => {
      if (!Array.isArray(rule.scope) || rule.scope.length === 0) fail(`${rel}: tokenColors[${i}] sin scopes`);
      const fg = rule.settings && rule.settings.foreground;
      if (fg && !paletteHexes.has(baseHex(fg))) fail(`${rel}: tokenColors[${i}] (${rule.name}) = ${fg} no sale de palette.json`);
      if (!rule.settings || (!fg && rule.settings.fontStyle === undefined)) fail(`${rel}: tokenColors[${i}] sin settings`);
    });
    for (const [sel, s] of Object.entries(theme.semanticTokenColors)) {
      if (s.foreground && !paletteHexes.has(baseHex(s.foreground))) fail(`${rel}: semanticTokenColors.${sel} no sale de palette.json`);
    }
    if (theme.semanticHighlighting !== true) fail(`${rel}: semanticHighlighting debe ser true`);

    // 4. Mismas claves en todas las variantes
    const keys = Object.keys(theme.colors).sort().join('|');
    const roles = theme.tokenColors.map((r) => r.name).join('|');
    if (referenceKeys === null) {
      referenceKeys = keys;
      referenceRoles = roles;
    } else {
      if (keys !== referenceKeys) fail(`${rel}: el conjunto de claves de colors difiere del de las demás variantes`);
      if (roles !== referenceRoles) fail(`${rel}: los roles de tokenColors difieren de los de las demás variantes`);
    }

    console.log(`✔ ${theme.name.padEnd(16)} ${Object.keys(theme.colors).length} colores, ${theme.tokenColors.length} reglas, ${Object.keys(theme.semanticTokenColors).length} semantic tokens`);
  }

  // Gramática de inyección declarada y legible
  for (const g of pkg.contributes.grammars || []) {
    const gp = path.join(PACKAGE_DIR, g.path);
    try {
      const grammar = JSON.parse(fs.readFileSync(gp, 'utf8'));
      if (grammar.scopeName !== g.scopeName) fail(`${g.path}: scopeName no coincide con package.json`);
    } catch (e) {
      fail(`${g.path}: no se puede leer (${e.message})`);
    }
  }

  if (errors.length) {
    console.error(`\n✖ ${errors.length} problema(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log('\n✔ Temas válidos: sin colores sueltos, al día con palette.json y con las mismas claves en las 4 variantes');
}

main();
