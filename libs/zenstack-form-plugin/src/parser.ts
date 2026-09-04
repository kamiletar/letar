import type { DataFieldAttribute, Expression } from '@zenstackhq/language/ast'
import type { FormFieldMeta, ZodConstraints } from './types.js'

/**
 * Prop names that are Zod constraints (not UI props).
 */
const ZOD_CONSTRAINT_NAMES = new Set([
  // Number
  'min',
  'max',
  'step',
  'positive',
  'negative',
  // String
  'minLength',
  'maxLength',
  'pattern',
  'email',
  'url',
  'uuid',
  'exclusiveMin',
  'exclusiveMax',
  // Фаза 1 (v2.4.0) — паритет с нативными @startsWith/@endsWith/@contains/@datetime/@date/
  // @time/@phone/@trim/@lower/@upper
  'startsWith',
  'endsWith',
  'contains',
  'datetime',
  'date',
  'time',
  'phone',
  'trim',
  'lower',
  'upper',
])

/**
 * Extract label from enum value comment.
 *
 * Supports:
 * - `// Sweet` (inline comment)
 * - `/// Sweet` (doc comment)
 */
export function extractEnumLabel(comments: string[]): string | undefined {
  if (!comments || comments.length === 0) {
    return undefined
  }

  const comment = comments[0]?.trim()
  if (!comment) {
    return undefined
  }

  // Strip /// or // prefix
  const label = comment.replace(/^\/\/\/?/, '').trim()
  return label || undefined
}

/**
 * Convert SCREAMING_CASE to Title Case.
 *
 * @example
 * toTitleCase('SWEET') // 'Sweet'
 * toTitleCase('BANK_TRANSFER') // 'Bank Transfer'
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Разложить объект пропов (из `@form.props({...})` или собранный из `@meta("form.props.*", …)`,
 * Фаза 3) на Zod-constraints и UI-пропы — общая логика для обоих источников синтаксиса.
 */
function applyPropsSplit(meta: FormFieldMeta, allProps: Record<string, unknown>): void {
  const constraints: ZodConstraints = {}
  const uiProps: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(allProps)) {
    if (ZOD_CONSTRAINT_NAMES.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(constraints as any)[key] = value
    } else {
      uiProps[key] = value
    }
  }

  if (Object.keys(constraints).length > 0) {
    meta.constraints = { ...meta.constraints, ...constraints }
  }
  if (Object.keys(uiProps).length > 0) {
    meta.props = { ...meta.props, ...uiProps }
  }
}

/**
 * Parse @form.* directives from field comments.
 *
 * ⚠️ Фаза 3 (v3.0.0): legacy-путь. Основной синтаксис теперь `@meta("form.*", …)` —
 * см. {@link parseMetaAttributes}. Comment-директивы остаются рабочими (обратная совместимость,
 * `@meta` побеждает при конфликте ключей — см. `mergeFormMeta` в `model-generator.ts`), но новый
 * код должен использовать `@meta`.
 *
 * Supported directives:
 * - @form.title("...")
 * - @form.placeholder("...")
 * - @form.description("...")
 * - @form.fieldType("...")
 * - @form.props({...})
 * - @form.relation({...})
 * - @form.exclude
 */
export function parseFormMeta(comments: string[]): FormFieldMeta {
  const meta: FormFieldMeta = {}

  if (!comments || comments.length === 0) {
    return meta
  }

  // Join all comments into a single string for parsing
  const allComments = comments.join('\n')

  // @form.title("...")
  const titleMatch = allComments.match(/@form\.title\("([^"]+)"\)/)
  if (titleMatch) {
    meta.title = titleMatch[1]
  }

  // @form.placeholder("...")
  const placeholderMatch = allComments.match(/@form\.placeholder\("([^"]+)"\)/)
  if (placeholderMatch) {
    meta.placeholder = placeholderMatch[1]
  }

  // @form.description("...")
  const descriptionMatch = allComments.match(/@form\.description\("([^"]+)"\)/)
  if (descriptionMatch) {
    meta.description = descriptionMatch[1]
  }

  // @form.fieldType("...")
  const fieldTypeMatch = allComments.match(/@form\.fieldType\("([^"]+)"\)/)
  if (fieldTypeMatch) {
    meta.fieldType = fieldTypeMatch[1]
  }

  // @form.props({...}) — JS object literal (not strict JSON)
  // Split into Zod constraints (min, max, etc.) and UI props (everything else)
  const propsMatch = allComments.match(/@form\.props\((\{[\s\S]*?\})\)/)
  if (propsMatch) {
    try {
      // Convert JS object literal to valid JSON
      const jsonStr = propsMatch[1]
        .replace(/'/g, '"') // Single quotes → double
        .replace(/(\w+)\s*:/g, '"$1":') // key: → "key":
        .replace(/,\s*}/g, '}') // Remove trailing comma
      const allProps = JSON.parse(jsonStr) as Record<string, unknown>
      applyPropsSplit(meta, allProps)
    } catch {
      // Ignore parse errors
    }
  }

  // @form.relation({...}) — JS object literal
  const relationMatch = allComments.match(/@form\.relation\((\{[\s\S]*?\})\)/)
  if (relationMatch) {
    try {
      const jsonStr = relationMatch[1]
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*}/g, '}')
      meta.relation = JSON.parse(jsonStr)
    } catch {
      // Ignore parse errors
    }
  }

  // @form.exclude
  if (allComments.includes('@form.exclude')) {
    meta.exclude = true
  }

  return meta
}

/** Единственный источник правды для набора распознаваемых ключей `@form.*`/`@meta("form.*", …)` — используется и парсерами выше, и детекторами опечаток ниже. */
const KNOWN_FORM_DIRECTIVE_KEYS = new Set([
  'title',
  'placeholder',
  'description',
  'fieldType',
  'props',
  'relation',
  'exclude',
])

/**
 * Найти в comment-директивах ключи `@form.<key>`, которых нет среди распознаваемых
 * (`KNOWN_FORM_DIRECTIVE_KEYS`). `parseFormMeta` выше молча пропускает любой `@form.<key>`,
 * не совпавший ни с одним regex — опечатка или несуществующая директива (`@form.options`,
 * `@form.widget`) не даёт ошибки, поле просто остаётся без нужных метаданных. Живой прецедент —
 * `@form.options` в трёх полях `animatrona-tracker` (2026-09-04), не диагностировалось до этой
 * функции. Возвращает уникальные найденные ключи в порядке появления, без дублей.
 */
export function findUnknownFormDirectiveKeys(comments: string[]): string[] {
  if (!comments || comments.length === 0) {
    return []
  }
  const allComments = comments.join('\n')
  const found = new Set<string>()
  for (const match of allComments.matchAll(/@form\.([a-zA-Z]\w*)/g)) {
    const key = match[1]
    if (!KNOWN_FORM_DIRECTIVE_KEYS.has(key)) {
      found.add(key)
    }
  }
  return [...found]
}

/**
 * Преобразовать AST-выражение `@meta(…)`-аргумента в plain JS-значение.
 *
 * ⚠️ Ограничение upstream, не нашего парсера: `ObjectExpr` в качестве значения `@meta` роняет
 * `zenstack generate` целиком ещё на этапе генерации TS-схемы (`Unsupported attribute arg value:
 * ObjectExpr`) — до того, как этот плагин вообще запускается. Проверено живым прогоном
 * (Фаза 3, `libs/forms/PLAN.md`). Поэтому сюда `ObjectExpr` в принципе не долетает — ветки для
 * него нет и не нужно: любая попытка написать объектный литерал в `@meta` не доходит до этого
 * кода, схема не сгенерируется вовсе, ошибка будет от `zenstack generate`, не отсюда.
 */
function metaValueToPlain(expr: Expression | undefined): unknown {
  switch (expr?.$type) {
    case 'StringLiteral':
      return expr.value
    case 'NumberLiteral':
      return Number(expr.value)
    case 'BooleanLiteral':
      return expr.value
    case 'ArrayExpr':
      return expr.items.map((item) => metaValueToPlain(item))
    default:
      return undefined
  }
}

/**
 * Записать значение по точечному пути (`"grid.cols"` → `{ grid: { cols: value } }`) — только так
 * можно выразить вложенность в `@meta`, раз объектные литералы недоступны (см. {@link metaValueToPlain}).
 */
function setDeep(target: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.')
  let cur = target
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const existing = cur[key]
    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
      cur[key] = {}
    }
    cur = cur[key] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/**
 * Parse `@meta("form.*", value)` field attributes (Фаза 3, v3.0.0) — AST-based, основной
 * синтаксис. Побеждает `parseFormMeta()` (comment-путь) при конфликте ключей — слияние делает
 * вызывающая сторона (`mergeFormMeta` в `model-generator.ts`), эта функция сама по себе ничего
 * не мержит с legacy-путём.
 *
 * Плоский namespace вместо объектного литерала — единственный рабочий вариант (см.
 * {@link metaValueToPlain}):
 * - `@meta("form.title", "…")` / `placeholder` / `description` / `fieldType` — строка
 * - `@meta("form.exclude", true)` — булево (без значения — тоже считается `true`)
 * - `@meta("form.props.<key>", …)` — один UI-проп или Zod-constraint; `<key>` может быть
 *   вложенным путём (`"form.props.grid.cols"`) — собирается в объект перед разбором на
 *   constraints/uiProps через {@link applyPropsSplit}
 * - `@meta("form.relation.<key>", …)` — аналогично для `{ model?, labelField }`
 */
export function parseMetaAttributes(attributes: readonly DataFieldAttribute[]): FormFieldMeta {
  const meta: FormFieldMeta = {}
  const propsAcc: Record<string, unknown> = {}
  const relationAcc: Record<string, unknown> = {}
  let hasProps = false
  let hasRelation = false

  for (const attr of attributes) {
    if (attr.decl?.$refText !== '@meta') {
      continue
    }
    const keyArg = attr.args[0]?.value
    if (keyArg?.$type !== 'StringLiteral' || !keyArg.value.startsWith('form.')) {
      continue
    }
    const path = keyArg.value.slice('form.'.length)
    const value = metaValueToPlain(attr.args[1]?.value)

    if (path === 'title' && typeof value === 'string') {
      meta.title = value
    } else if (path === 'placeholder' && typeof value === 'string') {
      meta.placeholder = value
    } else if (path === 'description' && typeof value === 'string') {
      meta.description = value
    } else if (path === 'fieldType' && typeof value === 'string') {
      meta.fieldType = value
    } else if (path === 'exclude') {
      meta.exclude = value === undefined ? true : Boolean(value)
    } else if (path.startsWith('props.')) {
      hasProps = true
      setDeep(propsAcc, path.slice('props.'.length), value)
    } else if (path.startsWith('relation.')) {
      hasRelation = true
      setDeep(relationAcc, path.slice('relation.'.length), value)
    }
  }

  if (hasProps) {
    applyPropsSplit(meta, propsAcc)
  }
  if (hasRelation) {
    meta.relation = relationAcc as FormFieldMeta['relation']
  }

  return meta
}

/**
 * Найти в `@meta("form.<path>", …)`-атрибутах поля первый сегмент пути, не входящий в
 * `KNOWN_FORM_DIRECTIVE_KEYS`. `parseMetaAttributes` выше молча `continue`-ит на любом
 * несовпавшем `path` (последний `if/else if` в цепочке не имеет ветки `else` вовсе) — та же
 * дыра, что у comment-синтаксиса (`findUnknownFormDirectiveKeys`), только для основного
 * синтаксиса Фазы 3. `@meta("form.options", […])` синтаксически валиден для компилятора ZModel
 * (это просто строка-ключ атрибута), поэтому ошибка на этапе `zenstack generate` не возникает —
 * диагностировать может только сам плагин.
 */
export function findUnknownMetaFormPaths(attributes: readonly DataFieldAttribute[]): string[] {
  const found = new Set<string>()
  for (const attr of attributes) {
    if (attr.decl?.$refText !== '@meta') {
      continue
    }
    const keyArg = attr.args[0]?.value
    if (keyArg?.$type !== 'StringLiteral' || !keyArg.value.startsWith('form.')) {
      continue
    }
    const path = keyArg.value.slice('form.'.length)
    const topLevelKey = path.split('.')[0]
    if (!KNOWN_FORM_DIRECTIVE_KEYS.has(topLevelKey)) {
      found.add(path)
    }
  }
  return [...found]
}

/**
 * Слить `@meta`-мету (AST, Фаза 3) поверх legacy comment-меты (`@form.*`) — `@meta` побеждает при
 * пересечении ключей на уровне каждого отдельного поля метаданных (не всего объекта целиком:
 * поле может задавать `title` через `@form.title`, а `fieldType` — через `@meta`, оба сохранятся).
 * `constraints`/`props` мержатся по ключам внутри объекта той же логикой.
 */
export function mergeFormMeta(commentMeta: FormFieldMeta, metaAttrMeta: FormFieldMeta): FormFieldMeta {
  return {
    title: metaAttrMeta.title ?? commentMeta.title,
    placeholder: metaAttrMeta.placeholder ?? commentMeta.placeholder,
    description: metaAttrMeta.description ?? commentMeta.description,
    fieldType: metaAttrMeta.fieldType ?? commentMeta.fieldType,
    exclude: metaAttrMeta.exclude ?? commentMeta.exclude,
    relation: metaAttrMeta.relation ?? commentMeta.relation,
    constraints: (commentMeta.constraints || metaAttrMeta.constraints)
      ? { ...commentMeta.constraints, ...metaAttrMeta.constraints }
      : undefined,
    props: (commentMeta.props || metaAttrMeta.props) ? { ...commentMeta.props, ...metaAttrMeta.props } : undefined,
  }
}
