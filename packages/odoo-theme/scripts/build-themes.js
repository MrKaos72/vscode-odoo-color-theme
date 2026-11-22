#!/usr/bin/env node
'use strict';
// Genera themes/odoo-*-color-theme.json a partir de palette.json (raíz del monorepo).
// Uso: node scripts/build-themes.js

const fs = require('fs');
const path = require('path');
const { THEMES_DIR, loadPalette, themeFileName, buildTheme } = require('./lib/palette');

function main() {
  const palette = loadPalette();
  fs.mkdirSync(THEMES_DIR, { recursive: true });

  for (const id of Object.keys(palette.variants)) {
    const { theme } = buildTheme(palette, id);
    const file = path.join(THEMES_DIR, themeFileName(id));
    fs.writeFileSync(file, JSON.stringify(theme, null, 2) + '\n', 'utf8');
    console.log(`✔ ${theme.name.padEnd(16)} → themes/${path.basename(file)} (${Object.keys(theme.colors).length} colores, ${theme.tokenColors.length} reglas de sintaxis)`);
  }
}

try {
  main();
} catch (err) {
  console.error(`✖ Error al generar los temas: ${err.message}`);
  process.exit(1);
}
