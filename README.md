# Odoo VS Code Themes (monorepo)

[![CI](https://github.com/MrKaos72/vscode-odoo-color-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/MrKaos72/vscode-odoo-color-theme/actions/workflows/ci.yml)

Source code for **Odoo Color Theme** and the upcoming Odoo extensions for VS Code. This README is for contributors. The user-facing description (the one shown on the Marketplace) lives in [`packages/odoo-theme/README.md`](packages/odoo-theme/README.md).

| Package | Status |
|---|---|
| [`packages/odoo-theme`](packages/odoo-theme) | **Odoo Color Theme**, with 4 variants (Dark, Light, Midnight, Community) |
| `packages/odoo-icons` | Coming soon: file icons |
| `packages/odoo-pack` | Coming soon: Extension Pack that installs the theme and the icons |

```
palette.json                ← single source of truth for every color (theme + icons)
samples/                    ← typical Odoo addon files used to test highlighting
packages/odoo-theme/
├─ scripts/                 ← build, contrast check, validation, grammar test, icon generator
├─ syntaxes/                ← Python injection grammar for Odoo constructs
├─ themes/                  ← GENERATED theme JSON files (do not edit by hand)
└─ images/                  ← icon and Marketplace screenshots
```

## Getting started

Requires Node.js 22+.

```bash
npm install     # dev tools: vsce, ovsx, vscode-textmate, commitlint
npm test        # build + contrast + validation + highlighting test
npm run package # build the .vsix
```

## How the themes are built

The theme JSON files are **never edited by hand**. `scripts/build-themes.js` generates them from `palette.json` and has no dependencies.

`palette.json` has three blocks:

- `variants.<id>.colors` is the only place where hex values are allowed, as semantic names such as `editorBg`, `primary`, `keyword` or `comment`. A value can also reference another name (`"$success"`).
- `workbench` maps every VS Code UI color key to a reference: `"$name"`, or `"$name/AA"` to add an alpha channel (for example `"$primary/66"`). A hex literal here makes the build fail.
- `syntax` maps each highlighting role to a color reference and an optional `fontStyle`.

Variants can inherit with `"extends": "dark"` and override only what changes. Midnight and Community work this way. Light can also override individual `workbench` entries.

`scripts/lib/token-map.js` maps every syntax role to TextMate scopes and semantic token selectors. It holds scope names only, never colors.

### Odoo injection grammar

VS Code's built-in Python grammar (MagicPython) gives `_inherit = 'sale.order'` no scope: it is just an identifier. It also treats `fields.Char(...)` as an ordinary function call.

`syntaxes/odoo-python.injection.json` is injected into `source.python` and adds these scopes:

| Construct | Scope |
|---|---|
| ORM class attributes assigned at the start of a line (`_name`, `_inherit`, `_inherits`, `_description`, `_order`, `_rec_name`, `_table`, …) | `variable.other.constant.orm.odoo` |
| `fields.X`, `models.Model`, `models.TransientModel`, `models.AbstractModel` | `support.type.odoo` |

Calls such as `fields.Char(...)` reuse MagicPython's `function-arguments` rule, so keyword arguments keep their highlighting.

Known limitations:
- Matching is lexical, so a variable named `_name` outside an Odoo model gets the ORM color too.
- Aliased imports (`from odoo import fields as f`) are not recognized.

Pylance semantic tokens take precedence over TextMate scopes. For that reason the theme defines **no** generic `variable`, `variable.other` or `variable.other.constant` rules: they would override the injected scopes through the semantic fallback scopes.

## Scripts

Run these from `packages/odoo-theme`, or from the root with `-w odoo-color-theme`.

| Command | What it does |
|---|---|
| `npm run build` | Generates the 4 themes from `palette.json` |
| `npm run check` | Runs the WCAG AA contrast check and validates the generated themes |
| `npm run test:grammar` | Tokenizes `samples/` with VS Code's grammars plus the injection and checks token colors |
| `npm test` | Runs build, check and test:grammar |
| `npm run build:icon` | Regenerates `images/icon.png` from the palette |
| `npm run package` | Runs build and check, then `vsce package` |

- **Contrast check:** `node scripts/check-contrast.js --verbose` prints every pair evaluated. Text is checked against its background at 4.5:1, and each syntax color is checked against both the editor background and the line highlight. When a pair fails, the script names the `palette.json` color responsible and suggests the closest value that passes.
- **Theme validation:** `validate-themes.js` checks three things:
  - the committed themes match `palette.json`
  - no color comes from outside the palette
  - all variants share the same keys
- **Grammar test:** `test-grammar.js` finds the local VS Code installation automatically. Set `VSCODE_EXTENSIONS_DIR=<vscode>/resources/app/extensions` to point it somewhere else.

## Testing locally (F5)

1. Open the repository root in VS Code and run `npm install`.
2. Press **F5** and choose **Run Odoo Theme**. The themes are rebuilt and an *Extension Development Host* opens with the `samples/` folder.
3. In that window, open **Preferences: Color Theme** and try the 4 variants.
4. Use **Developer: Inspect Editor Tokens and Scopes** on `_inherit`, `fields.Many2one`, `@api.depends`, `self`, `<xpath>` and `t-foreach`. Do it with Pylance both enabled and disabled.
5. After changing `palette.json`, run `npm run build` and reload the test window (**Developer: Reload Window**).

Without F5:

```bash
code --extensionDevelopmentPath="$(pwd)/packages/odoo-theme" samples
```

## Continuous integration

[`ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and on every pull request:

1. Rebuilds the themes and fails if the committed ones are out of date.
2. Runs the contrast check and the theme validation.
3. Runs the highlighting test against VS Code's built-in grammars (Python, XML, JS), pinned to a `microsoft/vscode` commit through `VSCODE_GRAMMARS_REF`.
4. Packages the `.vsix` and uploads it as a run artifact, kept for 14 days.
5. On pull requests, checks every commit message with **commitlint**.

## Commit conventions

This repository follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example `feat(theme): …`, `fix: …` or `docs: …`. To check your commits before pushing:

```bash
npx commitlint --from origin/main --to HEAD
```

## Publishing

Before the first release, set a real `publisher` in `packages/odoo-theme/package.json` and replace the copyright holder in `LICENSE`.

**VS Code Marketplace**
1. Create a publisher at <https://marketplace.visualstudio.com/manage> with the same id as `publisher`.
2. Create an Azure DevOps *Personal Access Token* (organization: *All accessible organizations*, scope **Marketplace › Manage**).
3. Run:
   ```bash
   cd packages/odoo-theme
   npx vsce login <publisher-id>
   npm run package        # produces odoo-color-theme-<version>.vsix
   npm run publish:vsce   # or: npx vsce publish patch|minor|major
   ```

**Open VSX**
1. Sign in at <https://open-vsx.org> with GitHub, sign the *Publisher Agreement* and create a token under *Settings › Access Tokens*.
2. Create the namespace once, then publish:
   ```bash
   npx ovsx create-namespace <publisher-id> -p <token>
   npx ovsx publish odoo-color-theme-<version>.vsix -p <token>
   ```

The Marketplace README loads its screenshots from `raw.githubusercontent.com/.../main/...`, so they only show once the images are pushed to `main`.

## License

[MIT](packages/odoo-theme/LICENSE)
