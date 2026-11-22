#!/usr/bin/env node
'use strict';
// Highlighting test: tokenizes the files in samples/ with the grammars shipped with the local
// VS Code installation (MagicPython, XML, JavaScript) plus our Odoo injection, applies each theme
// and checks that specific tokens get the color of the expected role.
//
// Requires the vscode-textmate and vscode-oniguruma devDependencies (testing only; building
// the themes has no dependencies).
// If VS Code is not in a standard location: VSCODE_EXTENSIONS_DIR=<...>/resources/app/extensions
// Usage: node scripts/test-grammar.js [--verbose]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vsctm = require('vscode-textmate');
const oniguruma = require('vscode-oniguruma');
const { PACKAGE_DIR, loadPalette, buildTheme } = require('./lib/palette');

const SAMPLES_DIR = path.resolve(PACKAGE_DIR, '..', '..', 'samples');
const verbose = process.argv.includes('--verbose');

// Each case: file, text that identifies the line, token to look for (first occurrence) and expected role.
// role "fg" = no rule (default editor color). "scope" additionally checks for a specific scope.
const CASES = [
  // Python
  { file: 'sale_order_extension.py', line: '# -*- coding', token: 'coding', role: 'comment' },
  { file: 'sale_order_extension.py', line: 'from odoo import', token: 'from', role: 'keyword' },
  { file: 'sale_order_extension.py', line: 'class SaleOrder(', token: 'class', role: 'keyword' },
  { file: 'sale_order_extension.py', line: 'class SaleOrder(', token: 'SaleOrder', role: 'class' },
  { file: 'sale_order_extension.py', line: 'class SaleOrder(', token: 'models', role: 'type' },
  { file: 'sale_order_extension.py', line: 'class SaleOrder(', token: 'Model', role: 'type' },
  { file: 'sale_order_extension.py', line: "_inherit = 'sale.order'", token: '_inherit', role: 'orm' },
  { file: 'sale_order_extension.py', line: "_inherit = 'sale.order'", token: "sale.order", role: 'string' },
  { file: 'sale_order_extension.py', line: '_description = "Sales', token: '_description', role: 'orm' },
  { file: 'sale_order_extension.py', line: "_order = 'date_order", token: '_order', role: 'orm' },
  { file: 'sale_order_extension.py', line: "_name = 'sale.order.priority", token: '_name', role: 'orm' },
  { file: 'sale_order_extension.py', line: 'delivery_note = fields.Text', token: 'fields', role: 'type' },
  { file: 'sale_order_extension.py', line: 'delivery_note = fields.Text', token: 'Text', role: 'type' },
  { file: 'sale_order_extension.py', line: 'delivery_note = fields.Text', token: 'delivery_note', role: 'fg' },
  { file: 'sale_order_extension.py', line: 'delivery_note = fields.Text', token: 'string', role: 'fg', scope: 'variable.parameter.function-call.python' },
  { file: 'sale_order_extension.py', line: 'delivery_note = fields.Text', token: 'True', role: 'constant' },
  { file: 'sale_order_extension.py', line: 'carrier_partner_id = fields.Many2one', token: 'Many2one', role: 'type' },
  { file: 'sale_order_extension.py', line: "@api.depends('order_line", token: '@', role: 'decorator' },
  { file: 'sale_order_extension.py', line: "@api.depends('order_line", token: 'depends', role: 'decorator' },
  { file: 'sale_order_extension.py', line: "@api.depends('order_line", token: 'order_line.price_subtotal', role: 'string' },
  { file: 'sale_order_extension.py', line: '@api.model', token: 'model', role: 'decorator' },
  { file: 'sale_order_extension.py', line: 'def _compute_margin_percent(self)', token: 'def', role: 'keyword' },
  { file: 'sale_order_extension.py', line: 'def _compute_margin_percent(self)', token: '_compute_margin_percent', role: 'function' },
  { file: 'sale_order_extension.py', line: 'def _compute_margin_percent(self)', token: 'self', role: 'self' },
  { file: 'sale_order_extension.py', line: 'for order in self:', token: 'self', role: 'self' },
  { file: 'sale_order_extension.py', line: 'def _get_default_note(cls)', token: 'cls', role: 'self' },
  { file: 'sale_order_extension.py', line: "cost = sum(", token: 'sum', role: 'type' },
  { file: 'sale_order_extension.py', line: "cost = sum(", token: 'mapped', role: 'function' },
  { file: 'sale_order_extension.py', line: '* 100 if cost', token: '100', role: 'constant' },
  { file: 'sale_order_extension.py', line: '* 100 if cost', token: '/', role: 'operator' },
  { file: 'sale_order_extension.py', line: "fields.Command.link", token: 'Command', role: 'type' },
  { file: 'sale_order_extension.py', line: "_name = 'sale.order.priority", token: '=', role: 'operator' },

  // XML / QWeb
  { file: 'sale_order_views.xml', line: '<record id="view_order_form', token: 'record', role: 'tag' },
  { file: 'sale_order_views.xml', line: '<record id="view_order_form', token: 'model', role: 'attribute' },
  { file: 'sale_order_views.xml', line: '<record id="view_order_form', token: 'ir.ui.view', role: 'string' },
  { file: 'sale_order_views.xml', line: '<record id="view_order_form', token: '<', role: 'tagPunctuation' },
  { file: 'sale_order_views.xml', line: "<xpath expr=\"//field[@name='partner_id']\"", token: 'xpath', role: 'tag' },
  { file: 'sale_order_views.xml', line: "<xpath expr=\"//field[@name='partner_id']\"", token: 'expr', role: 'attribute' },
  { file: 'sale_order_views.xml', line: "<xpath expr=\"//field[@name='partner_id']\"", token: 'position', role: 'attribute' },
  { file: 'sale_order_views.xml', line: '<template id="report_saleorder_priority"', token: 'template', role: 'tag' },
  { file: 'sale_order_views.xml', line: '<div t-if=', token: 't-if', role: 'attribute' },
  { file: 'sale_order_views.xml', line: '<t t-foreach=', token: 't-foreach', role: 'attribute' },
  { file: 'sale_order_views.xml', line: '<!-- Archivo de muestra', token: 'Archivo', role: 'comment' },

  // JavaScript (OWL)
  { file: 'order_widget.js', line: 'import { Component, useState', token: 'import', role: 'keyword' },
  { file: 'order_widget.js', line: 'import { Component, useState', token: '"@odoo/owl"', role: 'string' },
  { file: 'order_widget.js', line: 'export class OrderPriorityWidget', token: 'class', role: 'keyword' },
  { file: 'order_widget.js', line: 'export class OrderPriorityWidget', token: 'OrderPriorityWidget', role: 'class' },
  { file: 'order_widget.js', line: 'export class OrderPriorityWidget', token: 'Component', role: 'type' },
  { file: 'order_widget.js', line: 'setup() {', token: 'setup', role: 'function' },
  { file: 'order_widget.js', line: 'this.orm = useService', token: 'this', role: 'self' },
  { file: 'order_widget.js', line: 'this.orm = useService', token: 'useService', role: 'function' },
  { file: 'order_widget.js', line: 'const REFRESH_DELAY', token: '5000', role: 'constant' },
  { file: 'order_widget.js', line: '// Archivo de muestra', token: 'Archivo', role: 'comment' },
];

const FILE_SCOPES = {
  '.py': 'source.python',
  '.xml': 'text.xml',
  '.js': 'source.js',
};

// --- Locate VS Code built-in grammars ----------------------------------------------------
function findVSCodeExtensionsDir() {
  if (process.env.VSCODE_EXTENSIONS_DIR) return process.env.VSCODE_EXTENSIONS_DIR;
  const candidates = [];
  try {
    const cmd = process.platform === 'win32' ? 'where code' : 'which code';
    for (const bin of execSync(cmd, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)) {
      const real = fs.realpathSync(bin);
      const root = path.dirname(path.dirname(real));
      candidates.push(path.join(root, 'resources', 'app', 'extensions'));
      // Newer Windows layout: <root>/<commit>/resources/app/extensions
      for (const d of fs.readdirSync(root)) candidates.push(path.join(root, d, 'resources', 'app', 'extensions'));
    }
  } catch { /* code is not on PATH */ }
  candidates.push(
    '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions',
    '/usr/share/code/resources/app/extensions',
    '/usr/lib/code/extensions',
  );
  const found = candidates.find((p) => fs.existsSync(path.join(p, 'python', 'package.json')));
  if (!found) throw new Error('VS Code installation not found. Set VSCODE_EXTENSIONS_DIR.');
  return found;
}

// scopeName -> grammar file path, read from each extension's contributes.grammars.
function indexGrammars(extDir) {
  const map = new Map();
  for (const ext of fs.readdirSync(extDir)) {
    const pkgPath = path.join(extDir, ext, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    for (const g of (pkg.contributes && pkg.contributes.grammars) || []) {
      if (g.scopeName && g.path) map.set(g.scopeName, path.join(extDir, ext, g.path));
    }
  }
  const own = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8'));
  for (const g of own.contributes.grammars) map.set(g.scopeName, path.join(PACKAGE_DIR, g.path));
  return map;
}

// --- Tokenization ---------------------------------------------------------------------------
async function createRegistry(grammarFiles) {
  const wasm = fs.readFileSync(path.join(path.dirname(require.resolve('vscode-oniguruma')), 'onig.wasm')).buffer;
  await oniguruma.loadWASM(wasm);
  return new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      const file = grammarFiles.get(scopeName);
      return file ? vsctm.parseRawGrammar(fs.readFileSync(file, 'utf8'), file) : null;
    },
    getInjections: (scopeName) => (scopeName === 'source.python' ? ['source.python.odoo-injection'] : undefined),
  });
}

// vscode-textmate constants (EncodedTokenAttributes): foreground color bits.
const FOREGROUND_MASK = 0b00000000111111111000000000000000;
const FOREGROUND_OFFSET = 15;

function tokenizeFile(grammar, text) {
  const lines = text.split(/\r?\n/);
  let stackA = vsctm.INITIAL;
  let stackB = vsctm.INITIAL;
  return lines.map((line) => {
    const r1 = grammar.tokenizeLine(line, stackA);
    const r2 = grammar.tokenizeLine2(line, stackB);
    stackA = r1.ruleStack;
    stackB = r2.ruleStack;
    return { line, tokens: r1.tokens, binary: r2.tokens };
  });
}

function colorAt(lineData, offset, colorMap) {
  const t = lineData.binary;
  let meta = t[1];
  for (let i = 0; i < t.length; i += 2) {
    if (t[i] <= offset) meta = t[i + 1];
    else break;
  }
  return colorMap[(meta & FOREGROUND_MASK) >>> FOREGROUND_OFFSET].toUpperCase();
}

function scopesAt(lineData, offset) {
  const tok = lineData.tokens.find((t) => t.startIndex <= offset && offset < t.endIndex);
  return tok ? tok.scopes : [];
}

async function main() {
  const extDir = findVSCodeExtensionsDir();
  console.log(`VS Code grammars: ${extDir}`);
  const registry = await createRegistry(indexGrammars(extDir));
  const palette = loadPalette();

  const grammars = {};
  for (const scope of new Set(Object.values(FILE_SCOPES))) {
    grammars[scope] = await registry.loadGrammar(scope);
    if (!grammars[scope]) throw new Error(`Could not load grammar ${scope}`);
  }

  let failures = 0;
  for (const id of Object.keys(palette.variants)) {
    const { theme } = buildTheme(palette, id);
    registry.setTheme({
      name: theme.name,
      settings: [
        { settings: { foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'] } },
        ...theme.tokenColors,
      ],
    });
    const colorMap = registry.getColorMap();
    const roleColor = Object.fromEntries(theme.tokenColors.map((r) => [r.name, r.settings.foreground]));
    roleColor.fg = theme.colors['editor.foreground'];

    const cache = {};
    let ok = 0;
    for (const c of CASES) {
      const ext = path.extname(c.file);
      const key = c.file;
      if (!cache[key]) cache[key] = tokenizeFile(grammars[FILE_SCOPES[ext]], fs.readFileSync(path.join(SAMPLES_DIR, c.file), 'utf8'));
      const lineData = cache[key].find((l) => l.line.includes(c.line));
      const label = `${c.file} «${c.token}»`;
      if (!lineData) { console.log(`  ✖ ${label}: line "${c.line}" not found`); failures++; continue; }
      const offset = lineData.line.indexOf(c.token); // first occurrence in the line
      if (offset < 0) { console.log(`  ✖ ${label}: token not found in the line`); failures++; continue; }

      const got = colorAt(lineData, offset, colorMap);
      const want = roleColor[c.role].toUpperCase();
      const scopes = scopesAt(lineData, offset);
      const scopeOk = !c.scope || scopes.some((s) => s.startsWith(c.scope));
      if (got === want && scopeOk) {
        ok++;
        if (verbose) console.log(`  ✔ ${label} → ${c.role} ${got}  [${scopes.slice(1).join(' ')}]`);
      } else {
        failures++;
        console.log(`  ✖ [${theme.name}] ${label}: expected ${c.role} ${want}, got ${got}${scopeOk ? '' : `, missing scope ${c.scope}`}\n      scopes: ${scopes.join(' ')}`);
      }
    }
    console.log(`${ok === CASES.length ? '✔' : '✖'} ${theme.name}: ${ok}/${CASES.length} tokens with the expected color`);
  }

  if (failures) {
    console.error(`\n✖ ${failures} case(s) failed`);
    process.exit(1);
  }
  console.log('\n✔ Highlighting is correct in all 4 variants (including the Odoo injection)');
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
