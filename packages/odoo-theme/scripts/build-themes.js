#!/usr/bin/env node
'use strict';
// Generates themes/odoo-*-color-theme.json from palette.json (monorepo root).
// Usage: node scripts/build-themes.js

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
    console.log(`✔ ${theme.name.padEnd(16)} → themes/${path.basename(file)} (${Object.keys(theme.colors).length} colors, ${theme.tokenColors.length} syntax rules)`);
  }
}

try {
  main();
} catch (err) {
  console.error(`✖ Failed to build the themes: ${err.message}`);
  process.exit(1);
}
