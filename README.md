# Odoo VS Code Themes (monorepo)

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

Pulsa **F5** (configuración *Run Odoo Theme*) para abrir un Extension Development Host con `samples/`. Los detalles están en [packages/odoo-theme/README.md](packages/odoo-theme/README.md).
