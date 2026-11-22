# Odoo VS Code Themes (monorepo)

[![CI](https://github.com/MrKaos72/vscode-odoo-color-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/MrKaos72/vscode-odoo-color-theme/actions/workflows/ci.yml)

| Paquete | Estado |
|---|---|
| [`packages/odoo-theme`](packages/odoo-theme) | **Odoo Color Theme**: 4 variantes (Dark, Light, Midnight, Community) |
| `packages/odoo-icons` | Próximamente: íconos de archivos |
| `packages/odoo-pack` | Próximamente: Extension Pack que instala el tema y los íconos |

- `palette.json` es la única fuente de colores y la comparten el tema y los íconos.
- `samples/` contiene archivos típicos de un módulo de Odoo para probar el resaltado.

```bash
npm install     # instala las herramientas de desarrollo (vsce, ovsx, vscode-textmate)
npm test        # build + contraste + validación + test de resaltado
npm run package # genera el .vsix del tema
```

## Integración continua

El workflow [`ci.yml`](.github/workflows/ci.yml) se ejecuta en cada push a `main` y en cada pull request:

1. Regenera los temas y falla si los de `themes/` no coinciden con `palette.json`.
2. Comprueba el contraste WCAG AA y valida los temas.
3. Ejecuta el test de resaltado con las gramáticas de VS Code (Python, XML, JS) fijadas a un commit de `microsoft/vscode`, definido en `VSCODE_GRAMMARS_REF`.
4. Genera el `.vsix` y lo deja como artefacto descargable del run durante 14 días.
5. En los pull requests, comprueba con **commitlint** que todos los commits siguen [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

Para validar los commits en local, ejecuta `npx commitlint --from origin/main --to HEAD`.

Pulsa **F5** (configuración *Run Odoo Theme*) para abrir un Extension Development Host con `samples/`. Los detalles están en [packages/odoo-theme/README.md](packages/odoo-theme/README.md).
