# Changelog

All notable changes to **Odoo Color Theme** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-21

### Added
- Four variants: **Odoo Dark**, **Odoo Light**, **Odoo Midnight** and **Odoo Community**.
- About 400 UI colors per variant: editor, menus, inputs, dropdowns, notifications, quick input, peek view, minimap, scrollbars, diff/merge, terminal (16 ANSI colors), bracket pair colorization and Git decorations.
- Highlighting for Python, XML/QWeb, JavaScript (OWL), SCSS and Markdown, plus CSV (with Rainbow CSV) and `.po` files (with a gettext extension).
- `semanticHighlighting` and `semanticTokenColors` tuned for Pylance: class references are colored as types, class declarations as classes, and `self`/`cls` are italic.
- Python injection grammar that highlights Odoo ORM attributes (`_name`, `_inherit`, `_description`, `_order`, `_rec_name`, `_table`, …) and `fields.*` / `models.*` references.
- A single `palette.json` as the source of truth, with a dependency-free build.
- Quality scripts: WCAG AA contrast check (`check-contrast.js`), theme validation (`validate-themes.js`) and a highlighting test against VS Code's real grammars (`test-grammar.js`).

### Adjusted for contrast (WCAG AA 4.5:1)
These colors from the initial specification were below 4.5:1 against their background (the editor or the line highlight) and were changed as follows:

| Variant | Role | Original | Final |
|---|---|---|---|
| Dark / Midnight / Community | Comments and ANSI bright black | `#7A7078` | `#958B93` |
| Dark / Midnight / Community | Git ignored | `#5C5359` | `#938890` |
| Dark / Midnight | Status bar and badge text (on `#017E84`) | `#E6F7F7` | `#F2FBFB` |
| Light | Comments | `#8A8F98` | `#686D76` |
| Light | Secondary text | `#6B7280` | `#636A77` |
| Light | Classes | `#017E84` | `#01787E` |
| Light | ORM attributes and constants | `#B4521E` | `#B0501D` |

Midnight also uses a `#0E0B11` title bar so that it stays darker than the panels (`#110D14`).
