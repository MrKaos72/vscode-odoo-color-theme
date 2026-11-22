'use strict';
// Asignación de roles de sintaxis (definidos en palette.json > syntax) a scopes de TextMate
// y a selectores de semantic tokens. Aquí no hay colores: solo nombres de scopes.
//
// Notas importantes:
// - Los scopes de Python son los que emite hoy la gramática integrada de VS Code (MagicPython).
// - NO se definen reglas genéricas para `variable` ni `variable.other`: los semantic tokens de
//   Pylance (`variable`, `property`) caen a los scopes `variable.other.readwrite` y
//   `variable.other.property`, y una regla genérica taparía el color de la gramática de
//   inyección de Odoo (`_inherit`, `_name`, ...).
// - Tampoco se usa `variable.other.constant` genérico, porque la gramática de JS lo emite para
//   todo `const` y TypeScript hace caer ahí `variable.readonly`.

const SCOPES = {
  comment: ['comment', 'punctuation.definition.comment'],

  keyword: [
    'keyword',
    'keyword.control',
    'keyword.control.flow.python',
    'keyword.control.import.python',
    'keyword.operator.logical.python',
    'keyword.operator.new',
    'keyword.operator.expression',
    'keyword.control.at-rule',
    'storage.type',
    'storage.modifier',
    'storage.type.class.python',
    'storage.type.function.python',
    'punctuation.definition.template-expression',
    'punctuation.section.embedded',
  ],

  operator: [
    'keyword.operator',
    'punctuation',
    'punctuation.separator',
    'punctuation.accessor',
    'punctuation.terminator',
    'meta.brace',
  ],

  class: ['entity.name.type.class', 'entity.name.class', 'entity.name.type'],

  function: [
    'entity.name.function',
    'entity.name.function.member',
    'meta.function-call.generic.python',
    'support.function',
    'support.function.magic.python',
    'variable.function',
  ],

  string: ['string', 'punctuation.definition.string', 'string.quoted.docstring', 'string.template'],

  stringEscape: [
    'constant.character.escape',
    'constant.character.format.placeholder.other.python',
    'constant.other.placeholder',
  ],

  regex: ['string.regexp'],

  constant: [
    'constant',
    'constant.language',
    'constant.numeric',
    'constant.other',
    'constant.character.entity',
    'support.constant',
    'support.variable.magic.python',
    'keyword.other.unit',
    'constant.other.color',
    // Prefijos numéricos de Python (0x, 0o, 1j): si no, caerían en storage.type = keyword.
    'storage.type.number.python',
    'storage.type.imaginary.number.python',
  ],

  // Scope propio emitido por syntaxes/odoo-python.injection.json.
  orm: ['variable.other.constant.orm.odoo'],

  decorator: [
    'meta.function.decorator.python',
    'entity.name.function.decorator.python',
    'punctuation.definition.decorator.python',
    'meta.decorator',
    'punctuation.decorator',
    'entity.name.function.decorator',
    'entity.other.attribute-name.pseudo-class',
    'entity.other.attribute-name.pseudo-element',
  ],

  type: [
    'support.type',
    'support.class',
    'support.function.builtin',
    'support.type.exception',
    'entity.other.inherited-class',
    'support.type.odoo',
  ],

  self: [
    'variable.language.special.self.python',
    'variable.language.special.cls.python',
    'variable.parameter.function.language.special.self.python',
    'variable.parameter.function.language.special.cls.python',
    'variable.language.this',
    'variable.language.super',
  ],

  // XML / QWeb / HTML
  tag: ['entity.name.tag', 'entity.name.tag.localname.xml', 'entity.name.tag.namespace.xml'],
  tagPunctuation: ['punctuation.definition.tag', 'punctuation.separator.namespace.xml'],
  attribute: [
    'entity.other.attribute-name',
    'entity.other.attribute-name.localname.xml',
    'entity.other.attribute-name.namespace.xml',
  ],

  // CSS / SCSS
  cssClass: ['entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'],
  cssProperty: ['support.type.property-name', 'support.type.vendored.property-name'],
  cssVariable: ['variable.scss', 'variable.css', 'variable.argument.css'],

  // Markdown (README, docs de módulos)
  markupHeading: ['markup.heading', 'entity.name.section.markdown'],
  markupBold: ['markup.bold'],
  markupItalic: ['markup.italic'],
  markupLink: ['markup.underline.link', 'string.other.link'],
  markupCode: ['markup.inline.raw'],
  markupQuote: ['markup.quote'],
  markupInserted: ['markup.inserted'],
  markupDeleted: ['markup.deleted'],
  markupChanged: ['markup.changed'],

  invalid: ['invalid', 'invalid.illegal'],

  // CSV: scopes de la extensión Rainbow CSV (VS Code no trae gramática de CSV).
  csv1: ['rainbow1'],
  csv2: ['keyword.rainbow2'],
  csv3: ['entity.name.function.rainbow3'],
  csv4: ['comment.rainbow4'],
  csv5: ['string.rainbow5'],
  csv6: ['variable.parameter.rainbow6'],
  csv7: ['constant.numeric.rainbow7'],
  csv8: ['entity.name.type.rainbow8'],
  csv9: ['markup.bold.rainbow9'],
  csv10: ['invalid.rainbow10'],
};

// Semantic tokens (Pylance, TypeScript/JavaScript). El valor es el rol de sintaxis.
const SEMANTIC = {
  // Referencias a clases (fields.Char, models.Model, Component) = tipos;
  // la declaración (class SaleOrder) = color de clase.
  'class': 'type',
  'class.declaration': 'class',
  'class.defaultLibrary': 'type',
  'type': 'type',
  'typeParameter': 'type',
  'interface': 'type',
  'enum': 'type',
  'function': 'function',
  'method': 'function',
  'function.defaultLibrary': 'type',
  'decorator': 'decorator',
  'selfParameter': 'self',
  'clsParameter': 'self',
  'variable.readonly:python': 'constant',
  'enumMember': 'constant',
};

module.exports = { SCOPES, SEMANTIC };
