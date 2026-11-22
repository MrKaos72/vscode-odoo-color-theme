Quiero crear una extensión de VS Code llamada "Odoo Color Theme": un color theme para desarrolladores de Odoo, inspirado en los colores de marca de Odoo (morado #714B67 y teal #017E84). Es solo el color theme. Los íconos de archivos serán otra extensión aparte, y más adelante habrá un Extension Pack que instale las dos.

## Contexto de arquitectura
- Monorepo con esta estructura: packages/odoo-theme (esta extensión), packages/odoo-icons (después) y packages/odoo-pack (después).
- La paleta vive en un solo archivo, palette.json, en la raíz del monorepo, para que el tema y los íconos la compartan.
- Los JSON de los temas NO se escriben a mano: se generan con un script de Node (sin dependencias externas) que lee palette.json.

## Variantes (4 entradas en contributes.themes)
1. Odoo Dark (uiTheme "vs-dark"): la principal.
2. Odoo Light (uiTheme "vs"): estilo backend de Odoo 17.
3. Odoo Midnight (uiTheme "vs-dark"): Dark más profundo, con tinte morado.
4. Odoo Community (uiTheme "vs-dark"): Dark con acentos invertidos (el teal es el principal y el morado el secundario).

## Odoo Dark: interfaz (workbench colors)
- editor.background #1E1B1E
- editor.foreground #D8D2D6
- editor.lineHighlightBackground #2A2429
- editor.selectionBackground #714B6766
- editorLineNumber.foreground #5C5359
- editorLineNumber.activeForeground #C58BB5
- editorCursor.foreground #C58BB5
- titleBar.activeBackground #161316
- activityBar.background #714B67
- activityBar.foreground #F3E9F0
- activityBarBadge.background #017E84
- sideBar.background #241F23
- list.activeSelectionBackground #3A2E37
- list.hoverBackground #2E272C
- tab.activeBackground #1E1B1E
- tab.activeBorderTop #C58BB5
- tab.inactiveBackground #1A171A
- editorGroupHeader.tabsBackground #1A171A
- panel.background #1A171A
- terminal.background #1A171A
- statusBar.background #017E84
- statusBar.foreground #E6F7F7
- statusBar.debuggingBackground #714B67
- button.background #714B67
- button.hoverBackground #875A7B
- badge.background #017E84
- focusBorder #C58BB5
- Bordes (sideBar.border, panel.border, tab.border, editorGroup.border, etc.) #2F2A2E
- descriptionForeground #9A8F97
- Estados: error #E36C6C, warning #F2C76E, info #7AA7E0, éxito #7FBF7A
- Git (gitDecoration.*): agregado #7FBF7A, modificado #F2C76E, eliminado #E36C6C, sin seguimiento #5FC4C9, ignorado #5C5359
- Completa el resto de claves importantes (menús, inputs, dropdowns, notificaciones, quick input, peek view, minimap, scrollbars, diff editor, colores ANSI de la terminal, bracket pair colorization) de forma coherente con esta paleta.

## Odoo Dark: sintaxis (tokenColors)
- Keywords (class, def, import, from, return, if, for) → #C58BB5
- Clases (entity.name.type.class) → #5FC4C9
- Funciones y métodos → #8ED8DB
- Strings → #9BCB7A
- Atributos ORM de Odoo (_name, _inherit, _inherits, _description, _order, _rec_name, _table) → #E9925F
- Constantes y números (True, False, None, números) → #E9925F
- Decoradores (@api.depends, @api.onchange, @api.model, @api.constrains) → #F2C76E
- Tipos, builtins y fields (fields.Char, fields.Many2one, models.Model) → #7AA7E0
- self / cls → #D88FA0, en itálica
- Comentarios → #7A7078, en itálica
- Operadores y puntuación → #B8AEB5
- XML: etiquetas (<record>, <field>, <xpath>, <template>) → #C58BB5; atributos (name, model, position, expr, t-if, t-foreach) → #E9925F; valores → #9BCB7A
- JavaScript (OWL), SCSS, CSV y .po/.pot: usa colores equivalentes de la misma paleta.
- Activa "semanticHighlighting": true y define semanticTokenColors coherentes (para Pylance).
- Revisa que los scopes de TextMate que uses sean los que emiten hoy las gramáticas de Python y XML de VS Code, y dime cuáles atributos de Odoo no se pueden distinguir con scopes (por ejemplo, _inherit frente a cualquier otra variable) y qué alternativa propones.

## Odoo Light
- Interfaz: editor #FFFFFF, sidebar #F9FAFB, titleBar #F1EEF0, foreground #374151, texto secundario #6B7280, lineHighlight #F5F0F4, selección #714B6733, bordes #E5E7EB, activityBar #714B67 (texto #FFFFFF), statusBar #017E84 (texto #FFFFFF), botones #714B67.
- Sintaxis: keywords #714B67, clases #017E84, funciones #00676B, strings #3D7A2A, atributos ORM y constantes #B4521E, decoradores #8A6A00, tipos #2F5FA8, self #A33B5C (itálica), comentarios #8A8F98 (itálica).

## Odoo Midnight
- Igual que Dark, pero con editor #141018, sidebar #1A1520, paneles y pestañas inactivas #110D14, bordes #241D2A y lineHighlight #1F1826.

## Odoo Community
- Igual que Dark, pero con activityBar #017E84, acento (cursor, tab activa, focusBorder, número de línea activo) #5FC4C9, keywords #5FC4C9, clases #C58BB5 y statusBar #714B67.

## Requisitos de calidad
- Contraste mínimo WCAG AA (4.5:1) para el texto y los tokens contra su fondo. Incluye un script (scripts/check-contrast.js) que lo verifique para las 4 variantes y diga qué colores fallan, y ajusta los que no pasen.
- Que no haya colores sueltos en los JSON: todo debe salir de palette.json.

## Entregables
1. palette.json con las 4 variantes.
2. scripts/build-themes.js, que genera themes/odoo-dark-color-theme.json, odoo-light, odoo-midnight y odoo-community.
3. scripts/check-contrast.js.
4. package.json de la extensión con name, displayName "Odoo Color Theme", description, publisher (déjalo como placeholder), engines.vscode actual, categories ["Themes"], keywords (odoo, theme, dark, light, python, xml), galleryBanner con color #714B67 y tema dark, icon, repository, license MIT, contributes.themes con las 4 variantes y scripts npm (build, check, package con @vscode/vsce).
5. README.md con capturas sugeridas, cómo instalar, cómo personalizar con workbench.colorCustomizations y editor.tokenColorCustomizations, y la mención de que la extensión de íconos viene aparte.
6. CHANGELOG.md, .vscodeignore y LICENSE.
7. Archivos de muestra para probar el tema: un modelo Python de Odoo, una vista XML con herencia y xpath, un componente OWL en JS y un ir.model.access.csv.
8. Los pasos para probar en local (F5 / Extension Development Host) y para publicar en el VS Code Marketplace y en Open VSX.

Trabaja por partes: primero palette.json y el script de build, después los temas generados, luego el contraste y al final el empaquetado y la documentación. Mantén los nombres en inglés en el código y los comentarios en español.