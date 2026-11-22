# Changelog

Todos los cambios relevantes de **Odoo Color Theme** se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-11-21

### Añadido
- Cuatro variantes: **Odoo Dark**, **Odoo Light**, **Odoo Midnight** y **Odoo Community**.
- Unos 400 colores de interfaz por variante: editor, menús, inputs, dropdowns, notificaciones, quick input, peek view, minimap, scrollbars, diff/merge, terminal (16 ANSI), bracket pair colorization y decoraciones de Git.
- Resaltado para Python, XML/QWeb, JavaScript (OWL), SCSS y Markdown. También para CSV, con Rainbow CSV, y para `.po`, con una extensión de gettext.
- `semanticHighlighting` y `semanticTokenColors` pensados para Pylance: las referencias a clases se muestran como tipos y las declaraciones como clases, y `self`/`cls` van en itálica.
- Gramática de inyección para Python que distingue los atributos ORM (`_name`, `_inherit`, `_description`, `_order`, `_rec_name`, `_table`, …) y las referencias `fields.*` / `models.*`.
- La paleta vive en un único `palette.json` y el build no tiene dependencias.
- Scripts de calidad: contraste WCAG AA (`check-contrast.js`), validación de los temas (`validate-themes.js`) y test de resaltado con las gramáticas reales de VS Code (`test-grammar.js`).

### Ajustado por contraste (WCAG AA 4.5:1)
Estos colores de la especificación inicial no alcanzaban 4.5:1 contra su fondo (el del editor o el de la línea resaltada) y se cambiaron así:

| Variante | Rol | Original | Final |
|---|---|---|---|
| Dark / Midnight / Community | Comentarios y ANSI bright black | `#7A7078` | `#958B93` |
| Dark / Midnight / Community | Git ignorado | `#5C5359` | `#938890` |
| Dark / Midnight | Texto de status bar y badges (sobre `#017E84`) | `#E6F7F7` | `#F2FBFB` |
| Light | Comentarios | `#8A8F98` | `#686D76` |
| Light | Texto secundario | `#6B7280` | `#636A77` |
| Light | Clases | `#017E84` | `#01787E` |
| Light | Atributos ORM y constantes | `#B4521E` | `#B0501D` |

Además, Midnight usa una barra de título `#0E0B11` para que siga siendo más oscura que los paneles (`#110D14`).
