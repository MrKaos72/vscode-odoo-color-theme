#!/usr/bin/env node
'use strict';
// Checks WCAG AA contrast (4.5:1) of text and tokens against their background in all 4 variants.
// It uses the themes built in memory from palette.json (the same output build-themes writes),
// so it can name the palette color that fails and suggest a value that passes.
//
// Usage: node scripts/check-contrast.js [--verbose]
// Exits with code 1 if any pair is below the minimum.

const { loadPalette, buildTheme } = require('./lib/palette');
const { blend, contrastRatio, suggestColor } = require('./lib/color');

const MIN_RATIO = 4.5;
const verbose = process.argv.includes('--verbose');

// [foreground, background] pairs of UI elements that display text.
// Deliberately excluded (not text, or inactive states, which WCAG 1.4.3 exempts):
//   borders, indent guides, editorLineNumber.foreground (inactive),
//   titleBar.inactiveForeground, tab.unfocused*, activityBar.inactiveForeground,
//   editorWhitespace, editorGhostText, scrollbars and selection/find backgrounds.
const UI_PAIRS = [
  ['editor.foreground', 'editor.background'],
  ['editor.foreground', 'editor.lineHighlightBackground'],
  ['editorLineNumber.activeForeground', 'editor.background'],
  ['editorCodeLens.foreground', 'editor.background'],
  ['editorInlayHint.foreground', 'editorInlayHint.background'],
  ['descriptionForeground', 'editor.background'],
  ['descriptionForeground', 'sideBar.background'],
  ['textLink.foreground', 'editor.background'],
  ['errorForeground', 'sideBar.background'],
  ['titleBar.activeForeground', 'titleBar.activeBackground'],
  ['commandCenter.foreground', 'commandCenter.background'],
  ['activityBar.foreground', 'activityBar.background'],
  ['activityBarBadge.foreground', 'activityBarBadge.background'],
  ['sideBar.foreground', 'sideBar.background'],
  ['sideBarTitle.foreground', 'sideBar.background'],
  ['sideBarSectionHeader.foreground', 'sideBarSectionHeader.background'],
  ['list.activeSelectionForeground', 'list.activeSelectionBackground'],
  ['list.inactiveSelectionForeground', 'list.inactiveSelectionBackground'],
  ['list.hoverForeground', 'list.hoverBackground'],
  ['list.highlightForeground', 'sideBar.background'],
  ['list.deemphasizedForeground', 'sideBar.background'],
  ['tab.activeForeground', 'tab.activeBackground'],
  ['tab.inactiveForeground', 'tab.inactiveBackground'],
  ['tab.hoverForeground', 'tab.hoverBackground'],
  ['breadcrumb.foreground', 'breadcrumb.background'],
  ['breadcrumb.activeSelectionForeground', 'breadcrumb.background'],
  ['panelTitle.activeForeground', 'panel.background'],
  ['panelTitle.inactiveForeground', 'panel.background'],
  ['terminal.foreground', 'terminal.background'],
  ['statusBar.foreground', 'statusBar.background'],
  ['statusBar.debuggingForeground', 'statusBar.debuggingBackground'],
  ['statusBar.noFolderForeground', 'statusBar.noFolderBackground'],
  ['statusBarItem.remoteForeground', 'statusBarItem.remoteBackground'],
  ['statusBarItem.prominentForeground', 'statusBarItem.prominentBackground'],
  ['button.foreground', 'button.background'],
  ['button.foreground', 'button.hoverBackground'],
  ['button.secondaryForeground', 'button.secondaryBackground'],
  ['extensionButton.prominentForeground', 'extensionButton.prominentBackground'],
  ['badge.foreground', 'badge.background'],
  ['banner.foreground', 'banner.background'],
  ['input.foreground', 'input.background'],
  ['input.placeholderForeground', 'input.background'],
  ['dropdown.foreground', 'dropdown.background'],
  ['menu.foreground', 'menu.background'],
  ['menu.selectionForeground', 'menu.selectionBackground'],
  ['quickInput.foreground', 'quickInput.background'],
  ['quickInputList.focusForeground', 'quickInputList.focusBackground'],
  ['pickerGroup.foreground', 'quickInput.background'],
  ['keybindingLabel.foreground', 'keybindingLabel.background'],
  ['notifications.foreground', 'notifications.background'],
  ['notificationLink.foreground', 'notifications.background'],
  ['editorWidget.foreground', 'editorWidget.background'],
  ['editorHoverWidget.foreground', 'editorHoverWidget.background'],
  ['editorSuggestWidget.foreground', 'editorSuggestWidget.background'],
  ['editorSuggestWidget.highlightForeground', 'editorSuggestWidget.background'],
  ['editorSuggestWidget.selectedForeground', 'editorSuggestWidget.selectedBackground'],
  ['peekViewTitleLabel.foreground', 'peekViewTitle.background'],
  ['peekViewTitleDescription.foreground', 'peekViewTitle.background'],
  ['peekViewResult.fileForeground', 'peekViewResult.background'],
  ['peekViewResult.lineForeground', 'peekViewResult.background'],
  ['peekViewResult.selectionForeground', 'peekViewResult.selectionBackground'],
  ['gitDecoration.addedResourceForeground', 'sideBar.background'],
  ['gitDecoration.modifiedResourceForeground', 'sideBar.background'],
  ['gitDecoration.deletedResourceForeground', 'sideBar.background'],
  ['gitDecoration.untrackedResourceForeground', 'sideBar.background'],
  ['gitDecoration.ignoredResourceForeground', 'sideBar.background'],
  ['gitDecoration.conflictingResourceForeground', 'sideBar.background'],
  ['gitDecoration.submoduleResourceForeground', 'sideBar.background'],
  ['list.errorForeground', 'sideBar.background'],
  ['list.warningForeground', 'sideBar.background'],
];

// ANSI colors that are expected to be unreadable on the terminal background
// (black on dark, whites on light): they are used as backgrounds, not as text.
const ANSI_SKIP = {
  dark: ['terminal.ansiBlack'],
  light: ['terminal.ansiWhite', 'terminal.ansiBrightWhite'],
};

// Syntax roles without a color of their own (style only).
const SYNTAX_SKIP = new Set(['markupBold', 'markupItalic']);

// Effective opaque color: a color with alpha is composited over the given background.
function opaque(hex, under) {
  return hex.length === 9 ? blend(hex, under) : hex;
}

function checkVariant(palette, id) {
  const { theme, origin } = buildTheme(palette, id);
  const c = theme.colors;
  const editorBg = c['editor.background'];
  const results = [];

  const add = (label, fgHex, bgHex, sourceName, bgLabel, bgHexesForSuggest) => {
    const bg = opaque(bgHex, editorBg);
    const fg = opaque(fgHex, bg);
    const ratio = contrastRatio(fg, bg);
    results.push({ label, bgLabel, fg, bg, ratio, ok: ratio >= MIN_RATIO, sourceName, bgHexesForSuggest: bgHexesForSuggest || [bg] });
  };

  // 1) UI
  for (const [fgKey, bgKey] of UI_PAIRS) {
    if (!c[fgKey] || !c[bgKey]) {
      results.push({ label: fgKey, bgLabel: bgKey, missing: true, ok: false });
      continue;
    }
    add(fgKey, c[fgKey], c[bgKey], origin.colors[fgKey].name, bgKey);
  }

  // 2) Terminal ANSI
  const skip = ANSI_SKIP[theme.type] || [];
  for (const key of Object.keys(c).filter((k) => k.startsWith('terminal.ansi'))) {
    if (skip.includes(key)) continue;
    add(key, c[key], c['terminal.background'], origin.colors[key].name, 'terminal.background');
  }

  // 3) Syntax: each role against the editor background and the line highlight.
  const lineBg = opaque(c['editor.lineHighlightBackground'], editorBg);
  const seen = new Set();
  for (const rule of theme.tokenColors) {
    const fg = rule.settings.foreground;
    if (!fg || SYNTAX_SKIP.has(rule.name)) continue;
    const key = `${fg}`;
    if (seen.has(key)) continue; // same color already checked
    seen.add(key);
    const both = [editorBg, lineBg];
    add(`token:${rule.name}`, fg, editorBg, origin.syntax[rule.name].name, 'editor.background', both);
    add(`token:${rule.name}`, fg, lineBg, origin.syntax[rule.name].name, 'editor.lineHighlightBackground', both);
  }

  return { theme, results };
}

function main() {
  const palette = loadPalette();
  let failures = 0;

  for (const id of Object.keys(palette.variants)) {
    const { theme, results } = checkVariant(palette, id);
    const failed = results.filter((r) => !r.ok);
    failures += failed.length;
    console.log(`\n${failed.length ? '✖' : '✔'} ${theme.name}: ${results.length - failed.length}/${results.length} pairs meet ${MIN_RATIO}:1`);

    const rows = verbose ? results : failed;
    for (const r of rows) {
      if (r.missing) {
        console.log(`   MISSING ${r.label} / ${r.bgLabel} (key not defined)`);
        continue;
      }
      const status = r.ok ? '  OK  ' : ' FAIL ';
      let line = `  ${status} ${r.ratio.toFixed(2).padStart(5)}:1  ${r.label} ${r.fg} on ${r.bgLabel} ${r.bg}  [palette: $${r.sourceName}]`;
      if (!r.ok) {
        const suggestion = suggestColor(r.fg, r.bgHexesForSuggest, MIN_RATIO);
        if (suggestion) line += `  → suggested ${suggestion}`;
      }
      console.log(line);
    }
  }

  console.log(failures ? `\n✖ ${failures} pair(s) below ${MIN_RATIO}:1` : `\n✔ All variants meet WCAG AA (${MIN_RATIO}:1)`);
  process.exit(failures ? 1 : 0);
}

main();
