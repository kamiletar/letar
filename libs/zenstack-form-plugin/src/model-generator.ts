import type { DataField, DataFieldAttribute, DataModel, DataModelAttribute, Expression } from '@zenstackhq/language/ast'
import { findUnknownMetaFormPaths, parseMetaAttributes } from './parser.js'
import type {
  FormFieldMeta,
  I18nConfig,
  ModelFieldInfo,
  ModelInfo,
  ModelValidation,
  NativeAttributeApplication,
  ZodConstraints,
} from './types.js'

/**
 * Mapping from Prisma types to Zod types.
 */
const PRISMA_TO_ZOD: Record<string, string> = {
  String: 'z.string()',
  Int: 'z.number().int()',
  Float: 'z.number()',
  Decimal: 'z.number()',
  BigInt: 'z.bigint()',
  Boolean: 'z.boolean()',
  DateTime: 'z.date()',
  Json: 'z.unknown()',
  Bytes: 'z.unknown()',
}

/**
 * Get field type from AST.
 *
 * ZenStack AST structure:
 * - Primitives (String, Int, etc.): field.type.type = "Int" (string)
 * - References (enum, model): field.type.reference.ref.name = "RecipeType"
 */
function getFieldType(field: DataField): string {
  const typeRef = field.type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyType = typeRef as any

  // Primitives: anyType.type is a string ("String", "Int", "Float", etc.)
  if (typeof anyType?.type === 'string') {
    return anyType.type
  }

  // References (enum, model): anyType.reference?.ref?.name
  if (anyType?.reference?.ref?.name) {
    return anyType.reference.ref.name
  }

  // Fallback via $refText
  if (anyType?.type?.$refText) {
    return anyType.type.$refText
  }

  return 'String'
}

/**
 * Check if field type is an enum.
 */
function isEnumType(field: DataField, enumNames: Set<string>): boolean {
  const typeName = getFieldType(field)
  return enumNames.has(typeName)
}

/**
 * Check if field is required.
 */
function isRequired(field: DataField): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !(field.type as any)?.optional
}

/**
 * Check if field is an array.
 */
function isList(field: DataField): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(field.type as any)?.array
}

/**
 * Get default value from field attributes.
 */
function getDefaultValue(field: DataField): unknown | undefined {
  const defaultAttr = field.attributes.find((attr: DataFieldAttribute) => attr.decl?.$refText === '@default')

  if (!defaultAttr || defaultAttr.args.length === 0) {
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arg = defaultAttr.args[0] as any

  if (arg?.value?.$type === 'BooleanLiteral') {
    return arg.value.value
  }
  if (arg?.value?.$type === 'NumberLiteral') {
    // Explicitly convert to number — AST may store as string
    return Number(arg.value.value)
  }
  if (arg?.value?.$type === 'StringLiteral') {
    return arg.value.value
  }

  return undefined
}

/**
 * Check if field type is a model reference (not a primitive or enum).
 */
function isModelReference(field: DataField, enumNames: Set<string>): boolean {
  const typeName = getFieldType(field)

  // Prisma primitive — not a model
  if (PRISMA_TO_ZOD[typeName]) {
    return false
  }

  // Enum — not a model
  if (enumNames.has(typeName)) {
    return false
  }

  // Everything else is a model reference
  return true
}

/**
 * Найти атрибут поля по точному имени ссылки (с `@`, как хранит Langium в `decl.$refText`,
 * например `'@email'`).
 */
function findAttribute(field: DataField, refText: string): DataFieldAttribute | undefined {
  return field.attributes.find((attr: DataFieldAttribute) => attr.decl?.$refText === refText)
}

/**
 * Извлечь примитивное значение позиционного аргумента атрибута (Number/String/Boolean literal).
 */
function literalArgValue(arg: unknown): number | string | boolean | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = (arg as any)?.value

  if (value?.$type === 'NumberLiteral') {
    return Number(value.value)
  }
  if (value?.$type === 'StringLiteral') {
    return value.value
  }
  if (value?.$type === 'BooleanLiteral') {
    return value.value
  }

  return undefined
}

/**
 * Наследовать `@gte`/`@gt`/`@lte`/`@lt` для **Decimal**-полей — единственный тип, который не
 * проходит через `ZodUtils` (Фаза 0 spike, `libs/forms/PLAN.md`): `ZodUtils.addDecimalValidation`
 * трансформирует `string → Decimal`-инстанс, а наш контракт формы — `Decimal → z.number()`.
 * Остаётся на прежнем (Фаза 0-независимом) механизме: извлечение значения в `ZodConstraints`,
 * рендер через `generateConstraints` (`.min()`/`.max()`/`.gt()`/`.lt()` на `z.number()`).
 *
 * Остальные типы (`String`/`Int`/`Float`/`BigInt`, включая списки) — Фаза 1, `collectNativeAttributes`
 * ниже, сериализация в `NativeAttributeApplication[]` и применение через `ZodUtils.*` в кодогене.
 *
 * `@gt`/`@lt` дают отдельные ключи (`exclusiveMin`/`exclusiveMax`), а не `min`/`max` — Zod
 * `.min()`/`.max()` включительны и семантически соответствуют только `@gte`/`@lte`.
 */
function extractDecimalNativeConstraints(field: DataField): ZodConstraints {
  const constraints: ZodConstraints = {}

  const gteAttr = findAttribute(field, '@gte')
  if (gteAttr) {
    const value = literalArgValue(gteAttr.args[0])
    if (typeof value === 'number') {
      constraints.min = value
    }
  }

  const gtAttr = findAttribute(field, '@gt')
  if (gtAttr) {
    const value = literalArgValue(gtAttr.args[0])
    if (typeof value === 'number') {
      constraints.exclusiveMin = value
    }
  }

  const lteAttr = findAttribute(field, '@lte')
  if (lteAttr) {
    const value = literalArgValue(lteAttr.args[0])
    if (typeof value === 'number') {
      constraints.max = value
    }
  }

  const ltAttr = findAttribute(field, '@lt')
  if (ltAttr) {
    const value = literalArgValue(ltAttr.args[0])
    if (typeof value === 'number') {
      constraints.exclusiveMax = value
    }
  }

  return constraints
}

/**
 * Спецификация одного нативного атрибута для сериализации в `NativeAttributeApplication` (A3).
 */
interface NativeAttrSpec {
  /** Ключи `ZodConstraints`, которые покрывает этот атрибут — для проверки победы `@form.props` */
  constraintKeys: (keyof ZodConstraints)[]
  /**
   * Имена аргументов в порядке объявления атрибута в `stdlib.zmodel` (позиционное сопоставление
   * с `attr.args`, как и у существовавшего до Фазы 1 `extractDecimalNativeConstraints` выше).
   * `'message'` в конце — не аргумент для сериализации: `ZodUtils.*` (пакет 3.9.3) не читает
   * `message` ни в одном `case`-ветвлении, инлайнить его в литерал было бы мёртвым весом.
   */
  argNames: string[]
}

const STRING_NATIVE_ATTRS: Record<string, NativeAttrSpec> = {
  '@length': { constraintKeys: ['minLength', 'maxLength'], argNames: ['min', 'max', 'message'] },
  '@startsWith': { constraintKeys: ['startsWith'], argNames: ['text', 'message'] },
  '@endsWith': { constraintKeys: ['endsWith'], argNames: ['text', 'message'] },
  '@contains': { constraintKeys: ['contains'], argNames: ['text', 'message'] },
  '@regex': { constraintKeys: ['pattern'], argNames: ['regex', 'message'] },
  '@email': { constraintKeys: ['email'], argNames: ['message'] },
  '@datetime': { constraintKeys: ['datetime'], argNames: ['message'] },
  '@date': { constraintKeys: ['date'], argNames: ['message'] },
  '@time': { constraintKeys: ['time'], argNames: ['precision', 'message'] },
  '@url': { constraintKeys: ['url'], argNames: ['message'] },
  '@phone': { constraintKeys: ['phone'], argNames: ['message'] },
  '@trim': { constraintKeys: ['trim'], argNames: [] },
  '@lower': { constraintKeys: ['lower'], argNames: [] },
  '@upper': { constraintKeys: ['upper'], argNames: [] },
}

const NUMBER_NATIVE_ATTRS: Record<string, NativeAttrSpec> = {
  '@gte': { constraintKeys: ['min'], argNames: ['value', 'message'] },
  '@gt': { constraintKeys: ['exclusiveMin'], argNames: ['value', 'message'] },
  '@lte': { constraintKeys: ['max'], argNames: ['value', 'message'] },
  '@lt': { constraintKeys: ['exclusiveMax'], argNames: ['value', 'message'] },
}

/** `@length` на списке валидирует количество элементов, а не длину строки-элемента. */
const LIST_NATIVE_ATTRS: Record<string, NativeAttrSpec> = {
  '@length': { constraintKeys: ['minLength', 'maxLength'], argNames: ['min', 'max', 'message'] },
}

/**
 * Сериализовать один атрибут в `NativeAttributeApplication` по его спецификации.
 *
 * `message` (если задан литералом-строкой) захватывается отдельно от `args` — он не идёт в
 * `ZodUtils.*` (см. комментарий у `NativeAttributeApplication`), а используется только кодогеном
 * `applyNativeMessages` для постфактум-подмены текста ошибки.
 */
function serializeNativeAttribute(
  attr: DataFieldAttribute,
  refText: string,
  spec: NativeAttrSpec,
): NativeAttributeApplication {
  const args: NonNullable<NativeAttributeApplication['args']> = []
  let message: string | undefined

  attr.args.forEach((argNode, index) => {
    const argName = spec.argNames[index]
    if (!argName) {
      return
    }
    if (argName === 'message') {
      const value = literalArgValue(argNode)
      if (typeof value === 'string') {
        message = value
      }
      return
    }
    const value = literalArgValue(argNode)
    if (value !== undefined) {
      args.push({ name: argName, value })
    }
  })

  const application: NativeAttributeApplication = args.length > 0 ? { name: refText, args } : { name: refText }
  if (message !== undefined) {
    application.message = message
  }
  return application
}

/**
 * Наследовать нативные ZModel-атрибуты валидации для `String`/`Int`/`Float`/`BigInt`-полей
 * (включая списки) в структуру, готовую для рендера через `ZodUtils.*` (Фаза 1, решение A3
 * из Фазы 0 spike — `libs/forms/PLAN.md`).
 *
 * `@form.props` побеждает при пересечении ключей: `parser.ts` уже разобрал директиву к моменту
 * вызова, поэтому проверка ниже — окончательная, без риска задвоить валидацию одного constraint.
 */
function collectNativeAttributes(
  field: DataField,
  fieldType: string,
  fieldIsList: boolean,
  formPropsConstraints: ZodConstraints | undefined,
): NativeAttributeApplication[] {
  let specs: Record<string, NativeAttrSpec>
  if (fieldIsList) {
    specs = LIST_NATIVE_ATTRS
  } else if (fieldType === 'String') {
    specs = STRING_NATIVE_ATTRS
  } else if (fieldType === 'Int' || fieldType === 'Float' || fieldType === 'BigInt') {
    specs = NUMBER_NATIVE_ATTRS
  } else {
    return []
  }

  const result: NativeAttributeApplication[] = []
  for (const [refText, spec] of Object.entries(specs)) {
    const attr = findAttribute(field, refText)
    if (!attr) {
      continue
    }
    const overridden = spec.constraintKeys.some((key) => formPropsConstraints && key in formPropsConstraints)
    if (overridden) {
      continue
    }
    result.push(serializeNativeAttribute(attr, refText, spec))
  }
  return result
}

/**
 * Какую функцию `ZodUtils.*` вызывать для данного Prisma-типа. `Decimal` намеренно не входит —
 * см. `extractDecimalNativeConstraints`.
 */
function nativeValidatorFnFor(
  prismaType: string,
): 'addStringValidation' | 'addNumberValidation' | 'addBigIntValidation' | undefined {
  if (prismaType === 'String') {
    return 'addStringValidation'
  }
  if (prismaType === 'BigInt') {
    return 'addBigIntValidation'
  }
  if (prismaType === 'Int' || prismaType === 'Float') {
    return 'addNumberValidation'
  }
  return undefined
}

/**
 * Отрендерить `NativeAttributeApplication[]` как литерал массива `AttributeApplication` —
 * структурный контракт, который `ZodUtils.*`/`ExpressionUtils.isLiteral` проверяют по форме
 * (`{ kind: 'literal', value }`), не импортом `ExpressionUtils` — подтверждено прогоном spike.
 */
function renderNativeAttributesLiteral(attrs: NativeAttributeApplication[]): string {
  const items = attrs.map((a) => {
    if (!a.args || a.args.length === 0) {
      return `{ name: '${a.name}' }`
    }
    const argsStr = a.args
      .map((arg) => `{ name: '${arg.name}', value: { kind: 'literal', value: ${JSON.stringify(arg.value)} } }`)
      .join(', ')
    return `{ name: '${a.name}', args: [${argsStr}] }`
  })
  return `[${items.join(', ')}]`
}

/**
 * Атрибуты, у которых `ZodUtils.*` (`@zenstackhq/zod` 3.9.3, `addStringValidation`/
 * `addNumberValidation`/`addBigIntValidation`) вызывает Zod-метод только при наличии основного
 * позиционного аргумента (`if (value !== undefined) result = result...`) — источник истины:
 * `node_modules/@zenstackhq/zod/dist/index.mjs`, зафиксировано canary-тестом
 * `zod-native-message-mutation.spec.ts`. Атрибуты вне этого множества (`@email`/`@datetime`/
 * `@date`/`@time`/`@url`/`@phone`/`@trim`/`@lower`/`@upper`) вызывают метод безусловно.
 */
const NATIVE_ATTRS_REQUIRING_ARG = new Set([
  '@startsWith',
  '@endsWith',
  '@contains',
  '@regex',
  '@gte',
  '@gt',
  '@lte',
  '@lt',
])

/**
 * Сколько Zod-checks породит применение атрибута через `ZodUtils.*` — нужно, чтобы позиционно
 * сопоставить `message` с элементом `schema._zod.def.checks` в `applyNativeMessages` (рантайм-
 * хелпер, эмитится инлайн в generateModelCode). `ZodUtils.*` вызывает Zod-методы в ТОМ ЖЕ
 * порядке, что и элементы `attrs`, по одному check на атрибут — кроме `@length`, который может
 * дать 0/1/2 (независимо для `min` и `max`). Выводится заново из `name`/`args`, не хранится в
 * `NativeAttributeApplication` — см. её комментарий в `types.ts`.
 *
 * ⚠️ Отражает конкретную версию `@zenstackhq/zod` (см. `NATIVE_ATTRS_REQUIRING_ARG` выше) —
 * межверсионно не гарантировано, canary-тест обязан падать первым при апгрейде, не молча портить
 * сообщения.
 */
function deriveNativeCheckCount(attr: NativeAttributeApplication): number {
  if (attr.name === '@length') {
    const hasMin = attr.args?.some((a) => a.name === 'min') ?? false
    const hasMax = attr.args?.some((a) => a.name === 'max') ?? false
    return (hasMin ? 1 : 0) + (hasMax ? 1 : 0)
  }
  if (NATIVE_ATTRS_REQUIRING_ARG.has(attr.name)) {
    return attr.args && attr.args.length > 0 ? 1 : 0
  }
  return 1
}

/** Хотя бы один атрибут в списке несёт кастомный `message` — эмитить `applyNativeMessages`? */
function hasAnyNativeMessage(attrs: NativeAttributeApplication[] | undefined): boolean {
  return !!attrs?.some((a) => a.message !== undefined)
}

/**
 * Отрендерить `{ count, message }[]` для `applyNativeMessages` — порядок и длина строго совпадают
 * с `renderNativeAttributesLiteral` (тот же массив `attrs`, тот же `forEach`-порядок), это и даёт
 * позиционное соответствие с `schema._zod.def.checks`.
 *
 * `leadingEntries` — служебные записи БЕЗ message перед атрибутами, для check'ов, которые
 * пушит сам базовый Zod-тип (`PRISMA_TO_ZOD`) ДО того, как ZodUtils.* добавит свои — единственный
 * такой случай сейчас: `Int` рендерится как `z.number().int()`, и `.int()` пушит один
 * `number_format`-check раньше `.gte()/.lte()`. Без этого сдвига message съезжает на чужой check
 * (живьём поймано на `@gte`/`@lte` для `Int`-поля, см. `applyElementNativeAttributes`).
 */
function renderNativeMessagesLiteral(attrs: NativeAttributeApplication[], leadingEntries: string[] = []): string {
  const items = attrs.map((a) => {
    const count = deriveNativeCheckCount(a)
    const messagePart = a.message !== undefined ? JSON.stringify(a.message) : 'undefined'
    return `{ count: ${count}, message: ${messagePart} }`
  })
  return `[${[...leadingEntries, ...items].join(', ')}]`
}

/**
 * Отрендерить `ModelValidation[]` в литерал, который читает `ZodUtils.addCustomValidation`
 * (Фаза 2, v2.5.0): массив `{ name: '@@validate', args: [{value}, {value}?, {value}?] }`, где
 * каждый `value` — уже сериализованный узел `Expression` (`serializeExpression`/литерал).
 * `path` рендерится только если задан `message` — сохраняет позиционность аргументов
 * (`args?.[1]` — message, `args?.[2]` — path) без пустых placeholder-узлов.
 */
function renderValidationsLiteral(validations: ModelValidation[]): string {
  const items = validations.map((v) => {
    const args = [`{ value: ${v.conditionExpr} }`]
    if (v.message !== undefined) {
      args.push(`{ value: { kind: 'literal', value: ${JSON.stringify(v.message)} } }`)
      if (v.path !== undefined) {
        const pathItems = v.path.map((p) => `{ kind: 'literal', value: ${JSON.stringify(p)} }`).join(', ')
        args.push(`{ value: { kind: 'array', type: 'String', items: [${pathItems}] } }`)
      }
    }
    return `{ name: '@@validate', args: [${args.join(', ')}] }`
  })
  return `[${items.join(', ')}]`
}

/**
 * Обернуть Zod-тип элемента (`String`/`Int`/`Float`/`BigInt`) в `withNative(...)`, если для поля
 * есть нативные атрибуты. Для списков не вызывается — там нативные атрибуты относятся к самому
 * массиву (`@length` на списке), см. `applyListNativeAttributes`.
 */
function applyElementNativeAttributes(
  zodType: string,
  prismaType: string,
  attrs: NativeAttributeApplication[] | undefined,
): string {
  if (!attrs || attrs.length === 0) {
    return zodType
  }
  const fn = nativeValidatorFnFor(prismaType)
  if (!fn) {
    return zodType
  }
  const applied = `withNative(${zodType}, (s) => ZodUtils.${fn}(s, ${renderNativeAttributesLiteral(attrs)}))`
  if (!hasAnyNativeMessage(attrs)) {
    return applied
  }
  // `Int` → `z.number().int()` (PRISMA_TO_ZOD) — `.int()` пушит свой check раньше native-checks.
  const leading = prismaType === 'Int' ? ['{ count: 1 }'] : []
  return `applyNativeMessages(${applied}, ${renderNativeMessagesLiteral(attrs, leading)})`
}

/** Обернуть `z.array(...)` в `withNative(..., ZodUtils.addListValidation)`, если есть `@length`. */
function applyListNativeAttributes(zodType: string, attrs: NativeAttributeApplication[] | undefined): string {
  if (!attrs || attrs.length === 0) {
    return zodType
  }
  const applied = `withNative(${zodType}, (s) => ZodUtils.addListValidation(s, ${
    renderNativeAttributesLiteral(attrs)
  }))`
  return hasAnyNativeMessage(attrs)
    ? `applyNativeMessages(${applied}, ${renderNativeMessagesLiteral(attrs)})`
    : applied
}

/**
 * Сериализовать AST-выражение `@@validate` в рантайм-литерал `Expression`, который читает
 * `evalExpression` внутри `ZodUtils.addCustomValidation` (Фаза 2, v2.5.0, тот же приём инлайна
 * данных, что `NativeAttributeApplication` в Фазе 1 — но здесь форма другая: не плоские
 * `{name, args}`, а рекурсивная структура `{kind, ...}` по `$type` Langium-узла).
 *
 * Поддержаны узлы, которые реально появляются в булевых условиях `@@validate` по стандартной
 * грамматике ZModel (`Expression` в `@zenstackhq/language/ast`): литералы, ссылки на поля,
 * унарный `!`, бинарные операторы, вызовы функций (`length`/`contains`/...), массивы, `this`,
 * `null`. `MemberAccessExpr` не поддержан намеренно — в `@@validate` моделей форм-плагина не
 * встречался; попытка сериализовать бросает понятную ошибку кодогена, а не тихо ломает рантайм.
 */
/**
 * `ArrayExpression` рантайм-контракта (`@zenstackhq/schema`) требует поле `type` (тип элементов)
 * помимо `items` — сам `evalExpression` его не читает (подтверждено чтением исходника
 * `@zenstackhq/zod`), но TS-тип `Expression` того же пакета его требует структурно, иначе
 * `tsgo`/`tsc` валят сгенерированный файл `TS2322`. Определяется по первому литералу массива —
 * для `@@validate` в этом плагине массивы либо пустые, либо однородные (path-массивы строк).
 */
function inferArrayExprElementType(expr: Expression & { $type: 'ArrayExpr' }): string {
  const first = expr.items[0]
  switch (first?.$type) {
    case 'NumberLiteral':
      return 'Int'
    case 'BooleanLiteral':
      return 'Boolean'
    default:
      return 'String'
  }
}

function serializeExpression(expr: Expression): string {
  switch (expr.$type) {
    case 'BooleanLiteral':
      return `{ kind: 'literal', value: ${expr.value} }`
    case 'NumberLiteral':
      return `{ kind: 'literal', value: ${Number(expr.value)} }`
    case 'StringLiteral':
      return `{ kind: 'literal', value: ${JSON.stringify(expr.value)} }`
    case 'ReferenceExpr':
      return `{ kind: 'field', field: ${JSON.stringify(expr.target.$refText)} }`
    case 'ThisExpr':
      return `{ kind: 'this' }`
    case 'NullExpr':
      return `{ kind: 'null' }`
    case 'UnaryExpr':
      return `{ kind: 'unary', op: ${JSON.stringify(expr.operator)}, operand: ${serializeExpression(expr.operand)} }`
    case 'BinaryExpr':
      return `{ kind: 'binary', op: ${JSON.stringify(expr.operator)}, left: ${serializeExpression(expr.left)}, right: ${
        serializeExpression(expr.right)
      } }`
    case 'ArrayExpr':
      return `{ kind: 'array', type: ${JSON.stringify(inferArrayExprElementType(expr))}, items: [${
        expr.items.map(serializeExpression).join(', ')
      }] }`
    case 'InvocationExpr':
      return `{ kind: 'call', function: ${JSON.stringify(expr.function.$refText)}, args: [${
        expr.args.map((a) => serializeExpression(a.value)).join(', ')
      }] }`
    default:
      throw new Error(
        `@@validate: неподдерживаемый узел выражения '${(expr as { $type: string }).$type}' — `
          + `см. serializeExpression в model-generator.ts`,
      )
  }
}

/**
 * Прочитать `@@validate(condition, message?, path?)` с модели (Фаза 2, v2.5.0). Модель до сих
 * пор не читалась вообще — `extractModelInfo` смотрел только `model.fields`.
 */
function extractModelValidations(model: DataModel): ModelValidation[] {
  const validations: ModelValidation[] = []

  for (const attr of model.attributes as DataModelAttribute[]) {
    if (attr.decl?.$refText !== '@@validate') {
      continue
    }
    const conditionArg = attr.args[0]
    if (!conditionArg) {
      continue
    }
    const conditionExpr = serializeExpression(conditionArg.value)
    const message = typeof literalArgValue(attr.args[1]) === 'string'
      ? (literalArgValue(attr.args[1]) as string)
      : undefined

    let path: string[] | undefined
    const pathArgValue = attr.args[2]?.value
    if (pathArgValue?.$type === 'ArrayExpr') {
      path = pathArgValue.items
        .filter((item): item is Extract<Expression, { $type: 'StringLiteral' }> => item.$type === 'StringLiteral')
        .map((item) => item.value)
    }

    validations.push({ conditionExpr, message, path })
  }

  return validations
}

/** `@@strict()` на модели — переключает `z.object(...)` на `z.strictObject(...)` (Фаза 2). */
function hasStrictAttr(model: DataModel): boolean {
  return (model.attributes as DataModelAttribute[]).some((attr) => attr.decl?.$refText === '@@strict')
}

/**
 * Warning на `@meta("form.<key>", …)`, чей `<key>` не входит в набор распознаваемых — иначе
 * такая опечатка (или несуществующий ключ вроде `form.options`) молча пропадает: `parseMetaAttributes`
 * не бросает ошибку на несовпавшем пути, `zenstack generate` тоже не видит проблемы (это просто
 * строковый литерал атрибута). Живой прецедент — `@form.options` в трёх полях
 * `animatrona-tracker/schema/content.zmodel` (2026-09-04, найдено вручную при разборе
 * contact-request с форм-координатором, тогда ещё на legacy comment-синтаксисе).
 */
function warnUnknownFormDirectives(modelName: string, fieldName: string, metaPaths: string[]): void {
  for (const path of metaPaths) {
    console.warn(
      `[zenstack-form-plugin] ${modelName}.${fieldName}: неизвестный @meta("form.${path}", …) — `
        + `молча проигнорирован (опечатка?). Поддерживаемые ключи: title, placeholder, `
        + `description, fieldType, props.*, relation.*, exclude.`,
    )
  }
}

/**
 * Extract model information from AST.
 */
export function extractModelInfo(model: DataModel, enumNames: Set<string>): ModelInfo {
  const fields: ModelFieldInfo[] = []
  const excludedFields: string[] = []

  // System fields that are always excluded
  const systemFields = ['id', 'createdAt', 'updatedAt']

  for (const field of model.fields) {
    const fieldType = getFieldType(field)
    // Фаза 4 (v4.0.0) — legacy comment-синтаксис @form.* убран целиком, @meta("form.*", …)
    // единственный источник UI-метаданных.
    const formMeta = parseMetaAttributes(field.attributes)
    warnUnknownFormDirectives(model.name, field.name, findUnknownMetaFormPaths(field.attributes))

    // Check if field should be excluded
    const isSystemField = systemFields.includes(field.name)
    const isId = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === 'id')
    const hasRelationAttr = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === 'relation')
    const isModelRef = isModelReference(field, enumNames)
    // Фаза 1 (v2.4.0) — нативные `@omit`/`@computed` тоже исключают поле из формы, как и старый
    // `@form.exclude`: `@omit` прячет поле из Zod-схемы ORM целиком, `@computed` — поле,
    // вычисляемое сервером, недоступное для пользовательского ввода в принципе.
    const isOmitted = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === '@omit')
    const isComputed = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === '@computed')

    // Exclude: system fields, id, relation fields, model references
    // BUT: keep FK fields with @form.relation for select rendering
    const hasFormRelation = !!formMeta.relation
    const shouldExclude = formMeta.exclude || isId || hasRelationAttr || (isModelRef && !hasFormRelation)
      || isSystemField || isOmitted || isComputed

    if (shouldExclude) {
      excludedFields.push(field.name)
      continue
    }

    const fieldIsList = isList(field)

    if (fieldType === 'Decimal') {
      // Decimal — единственный тип вне A3 (Фаза 0 spike, несовместимость с
      // ZodUtils.addDecimalValidation), остаётся на прежнем механизме через constraints.
      const decimalConstraints = extractDecimalNativeConstraints(field)
      if (Object.keys(decimalConstraints).length > 0) {
        formMeta.constraints = { ...decimalConstraints, ...formMeta.constraints }
      }
    } else {
      // Остальные типы — A3: нативные атрибуты сериализуются отдельно от constraints и
      // применяются в кодогене через ZodUtils.*, а не через строковый generateConstraints.
      // @form.props побеждает при пересечении ключей — collectNativeAttributes уже это учитывает.
      const nativeAttributes = collectNativeAttributes(field, fieldType, fieldIsList, formMeta.constraints)
      if (nativeAttributes.length > 0) {
        formMeta.nativeAttributes = nativeAttributes
      }
    }

    const fieldInfo: ModelFieldInfo = {
      name: field.name,
      type: fieldType,
      isRequired: isRequired(field),
      isList: fieldIsList,
      isEnum: isEnumType(field, enumNames),
      enumName: isEnumType(field, enumNames) ? fieldType : undefined,
      defaultValue: getDefaultValue(field),
      formMeta,
    }

    fields.push(fieldInfo)
  }

  return {
    name: model.name,
    fields,
    excludedFields,
    validations: extractModelValidations(model),
    isStrict: hasStrictAttr(model),
  }
}

/**
 * Generate Zod constraints from @form.props.
 */
function generateConstraints(constraints: ZodConstraints | undefined, prismaType: string): string {
  if (!constraints) {
    return ''
  }

  const parts: string[] = []
  const isNumber = ['Int', 'Float', 'Decimal', 'BigInt'].includes(prismaType)
  const isString = prismaType === 'String'

  if (isNumber) {
    if (constraints.min !== undefined) {
      parts.push(`.min(${constraints.min})`)
    }
    if (constraints.max !== undefined) {
      parts.push(`.max(${constraints.max})`)
    }
    if (constraints.exclusiveMin !== undefined) {
      parts.push(`.gt(${constraints.exclusiveMin})`)
    }
    if (constraints.exclusiveMax !== undefined) {
      parts.push(`.lt(${constraints.exclusiveMax})`)
    }
    if (constraints.step !== undefined) {
      parts.push(`.multipleOf(${constraints.step})`)
    }
    if (constraints.positive) {
      parts.push('.positive()')
    }
    if (constraints.negative) {
      parts.push('.negative()')
    }
  }

  if (isString) {
    if (constraints.minLength !== undefined) {
      parts.push(`.min(${constraints.minLength})`)
    }
    if (constraints.maxLength !== undefined) {
      parts.push(`.max(${constraints.maxLength})`)
    }
    if (constraints.pattern) {
      parts.push(`.regex(/${constraints.pattern}/)`)
    }
    if (constraints.email) {
      parts.push('.email()')
    }
    if (constraints.url) {
      parts.push('.url()')
    }
    if (constraints.uuid) {
      parts.push('.uuid()')
    }
    // Фаза 1 (v2.4.0) — рендерятся только если попали сюда через @form.props (переопределение
    // нативного атрибута тем же ключом): собственно нативные @startsWith/.../@upper идут через
    // ZodUtils.* в generateZodType, здесь дублируются только вручную заданные в @form.props.
    if (constraints.startsWith !== undefined) {
      parts.push(`.startsWith('${constraints.startsWith}')`)
    }
    if (constraints.endsWith !== undefined) {
      parts.push(`.endsWith('${constraints.endsWith}')`)
    }
    if (constraints.contains !== undefined) {
      parts.push(`.includes('${constraints.contains}')`)
    }
    if (constraints.datetime) {
      parts.push('.datetime()')
    }
    if (constraints.date) {
      parts.push('.date()')
    }
    if (constraints.time !== undefined) {
      parts.push(typeof constraints.time === 'number' ? `.time({ precision: ${constraints.time} })` : '.time()')
    }
    if (constraints.phone) {
      // Zod v4 не имеет встроенного .phone() — телефон валидируется как обычный regex-паттерн
      // через ZodUtils на нативном пути; для @form.props-переопределения формат не диктуем.
      parts.push('.regex(/^\\+?[0-9()\\-\\s]{7,20}$/)')
    }
    if (constraints.trim) {
      parts.push('.trim()')
    }
    if (constraints.lower) {
      parts.push('.toLowerCase()')
    }
    if (constraints.upper) {
      parts.push('.toUpperCase()')
    }
  }

  return parts.join('')
}

/**
 * Generate Zod type for a field.
 */
function generateZodType(field: ModelFieldInfo, _enumNames: Set<string>): string {
  let zodType: string

  if (field.isEnum && field.enumName) {
    // Use imported enum schema
    zodType = `${field.enumName}FormSchema`
  } else {
    // Map Prisma type to Zod
    zodType = PRISMA_TO_ZOD[field.type] ?? 'z.string()'
  }

  // Apply constraints from @form.props (min, max, etc.)
  const constraintsStr = generateConstraints(field.formMeta.constraints, field.type)
  if (constraintsStr) {
    zodType = `${zodType}${constraintsStr}`
  }

  // Фаза 1 (v2.4.0, A3) — нативные атрибуты элемента (String/Int/Float/BigInt), применяются
  // ДО array-обёртки: ZodUtils.addStringValidation/addNumberValidation/addBigIntValidation
  // работают на скалярном типе, не на z.array(...).
  if (!field.isList) {
    zodType = applyElementNativeAttributes(zodType, field.type, field.formMeta.nativeAttributes)
  }

  // Arrays
  if (field.isList) {
    zodType = `z.array(${zodType})`
    // Нативный @length на списке валидирует количество элементов — оборачивает уже готовый
    // z.array(...), а не тип элемента.
    zodType = applyListNativeAttributes(zodType, field.formMeta.nativeAttributes)
  }

  // Optional fields (Prisma ? means nullable, not undefined)
  if (!field.isRequired) {
    zodType = `${zodType}.nullable().optional()`
  }

  // Default value
  if (field.defaultValue !== undefined) {
    let defaultStr: string
    if (typeof field.defaultValue === 'string') {
      defaultStr = `'${field.defaultValue}'`
    } else if (typeof field.defaultValue === 'boolean') {
      defaultStr = String(field.defaultValue)
    } else if (typeof field.defaultValue === 'number') {
      // BigInt types need BigInt() wrapper
      if (field.type === 'BigInt') {
        defaultStr = `BigInt(${field.defaultValue})`
      } else {
        defaultStr = String(field.defaultValue)
      }
    } else {
      defaultStr = JSON.stringify(field.defaultValue)
    }
    zodType = `${zodType}.default(${defaultStr})`
  }

  return zodType
}

/**
 * Parameters for UI meta generation.
 */
interface GenerateUIMetaParams {
  formMeta: FormFieldMeta
  modelName: string
  fieldName: string
  i18nConfig: I18nConfig | null
}

/**
 * Generate UI meta object for a field.
 */
function generateUIMeta(params: GenerateUIMetaParams): string | null {
  const { formMeta, modelName, fieldName, i18nConfig } = params
  const parts: string[] = []

  if (formMeta.title) {
    parts.push(`title: '${formMeta.title}'`)
  }
  if (formMeta.placeholder) {
    parts.push(`placeholder: '${formMeta.placeholder}'`)
  }
  if (formMeta.description) {
    parts.push(`description: '${formMeta.description}'`)
  }
  if (formMeta.fieldType) {
    parts.push(`fieldType: '${formMeta.fieldType}'`)
  }
  if (formMeta.props) {
    parts.push(`fieldProps: ${JSON.stringify(formMeta.props)}`)
  }
  if (formMeta.relation) {
    parts.push(`fieldProps: { relation: ${JSON.stringify(formMeta.relation)} }`)
  }

  // Add i18nKey when i18n is enabled
  if (i18nConfig?.enabled) {
    parts.push(`i18nKey: '${modelName}.${fieldName}'`)
  }

  if (parts.length === 0) {
    return null
  }

  return `{ ${parts.join(', ')} }`
}

/**
 * Generate code for a model.
 */
export function generateModelCode(
  modelInfo: ModelInfo,
  enumNames: Set<string>,
  i18nConfig: I18nConfig | null = null,
): string {
  const { name, fields, excludedFields, validations = [], isStrict = false } = modelInfo

  // Collect enum imports
  const enumImports = new Set<string>()
  for (const field of fields) {
    if (field.isEnum && field.enumName) {
      enumImports.add(field.enumName)
    }
  }

  // Фаза 1 (v2.4.0, A3) — модель использует ZodUtils, только если хотя бы у одного поля есть
  // нативные атрибуты валидации. Условный импорт — не тянуть ZodUtils (и decimal.js внутри
  // него, Фаза 0 spike) в файлы моделей, где нативных атрибутов нет вовсе.
  const usesNativeAttributes = fields.some(
    (field) => field.formMeta.nativeAttributes && field.formMeta.nativeAttributes.length > 0,
  )
  // Фаза 2 (v2.5.0) — кросс-полевая `@@validate` тоже идёт через ZodUtils (addCustomValidation).
  const usesCustomValidation = validations.length > 0
  const usesZodUtils = usesNativeAttributes || usesCustomValidation
  // message-i18n (v3.1.0) — эмитить applyNativeMessages, только если хоть один нативный атрибут
  // модели несёт кастомный message. `@@validate`.message сюда не относится — addCustomValidation
  // уже принимает message нативно, без постфактум-мутации (см. libs/forms/PLAN.md).
  const usesNativeMessages = fields.some((field) => hasAnyNativeMessage(field.formMeta.nativeAttributes))

  // Generate imports
  const imports = [`import { z } from 'zod/v4'`]
  if (usesZodUtils) {
    imports.push(`import { ZodUtils } from '@zenstackhq/zod'`)
  }
  for (const enumName of enumImports) {
    imports.push(`import { ${enumName}FormSchema } from './enums/${enumName}.form'`)
  }

  // Generate schema fields
  const schemaFields: string[] = []
  for (const field of fields) {
    const zodType = generateZodType(field, enumNames)
    const uiMeta = generateUIMeta({
      formMeta: field.formMeta,
      modelName: name,
      fieldName: field.name,
      i18nConfig,
    })

    if (uiMeta) {
      schemaFields.push(`  ${field.name}: ${zodType}\n    .meta({\n      ui: ${uiMeta}\n    })`)
    } else {
      schemaFields.push(`  ${field.name}: ${zodType}`)
    }
  }

  const excludedFieldsStr = excludedFields.map((f) => `'${f}'`).join(', ')

  // Фаза 2 (v2.5.0) — `@@strict()` переключает контейнер на z.strictObject(...). ⚠️ Не
  // проверено живьём с submit-пайплайном @letar/forms — см. libs/forms/PLAN.md.
  const objectFn = isStrict ? 'z.strictObject' : 'z.object'

  // Фаза 1 (v2.4.0, A3) — типизированная обёртка, без которой ZodUtils.* стирает тип схемы
  // до z.ZodSchema (z.infer становился бы unknown) — находка Фазы 0 spike, libs/forms/PLAN.md.
  const withNativeHelper = usesZodUtils
    ? `
/**
 * Применить ZodUtils.* с сохранением конкретного типа схемы (Фаза 0 spike: без этой обёртки
 * возвращаемый тип ZodUtils.* — базовый z.ZodSchema, и z.infer вырождается в unknown).
 */
function withNative<T extends z.ZodTypeAny>(schema: T, apply: (s: T) => unknown): T {
  return apply(schema) as T
}
`
    : ''

  // message-i18n (v3.1.0) — постфактум-подмена error у Zod-checks, см. NativeAttributeApplication
  // в types.ts и разбор блокера/находку в libs/forms/PLAN.md. Эмитится инлайн (та же логика, что
  // withNativeHelper выше), только когда реально нужен — не тянуть мёртвый код в файлы моделей
  // без кастомных message на нативных атрибутах.
  const applyNativeMessagesHelper = usesNativeMessages
    ? `
/**
 * Подставить кастомные message из ZModel-атрибутов (\`@gte(1, "…")\` и т.п.) — \`ZodUtils.*\`
 * (@zenstackhq/zod) не читает message-аргумент ни в одном case-ветвлении (см. libs/forms/PLAN.md,
 * разбор блокера message-i18n), поэтому текст ошибки подставляется постфактум мутацией
 * недокументированного внутреннего поля Zod v4 \`check._zod.def.error\`. Порядок \`entries\`
 * обязан совпадать с порядком атрибутов, переданных в ZodUtils.* — контракт закреплён
 * canary-тестом (zod-native-message-mutation.spec.ts в @letar/zenstack-form-plugin), который
 * падает первым при апгрейде Zod/ZodUtils, а не молча перестаёт подменять сообщения.
 */
function applyNativeMessages<T extends z.ZodTypeAny>(
  schema: T,
  entries: Array<{ count: number; message?: string }>,
): T {
  const checks = (schema as unknown as { _zod?: { def?: { checks?: unknown[] } } })._zod?.def?.checks
  if (!Array.isArray(checks)) {
    return schema
  }
  let index = 0
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const check = checks[index] as { _zod?: { def?: { error?: unknown } } } | undefined
      if (check?._zod?.def && entry.message !== undefined) {
        check._zod.def.error = () => entry.message
      }
      index++
    }
  }
  return schema
}
`
    : ''

  const objectLiteral = `${objectFn}({\n${schemaFields.join(',\n')}\n})`

  // Фаза 2 (v2.5.0) — кросс-полевая `@@validate` применяется только к CreateFormSchema.
  // UpdateFormSchema строится из БАЗОВОГО объекта до .refine()-обёртки: `addCustomValidation`
  // возвращает ZodEffects, у которого нет `.partial()` — а .partial() на объекте, потом
  // withNative(...) поверх него, дало бы partial-схему без кросс-полевой проверки для Update,
  // что тоже осмысленно (частичное обновление обычно не обязано соблюдать инвариант целиком),
  // но здесь выбран более простой путь: Update вообще без @@validate, Create — с ним.
  const schemaExports = usesCustomValidation
    ? `const ${name}BaseSchema = ${objectLiteral}

/**
 * Update schema for ${name} (all fields optional). Кросс-полевые \`@@validate\` не применяются —
 * строится из схемы до withNative-обёртки, у которой нет .partial() (Фаза 2, v2.5.0).
 */
export const ${name}UpdateFormSchema = ${name}BaseSchema.partial()

/**
 * Create schema for ${name} with UI metadata + кросс-полевая валидация из \`@@validate\`.
 */
export const ${name}CreateFormSchema = withNative(
  ${name}BaseSchema,
  (s) => ZodUtils.addCustomValidation(s, ${renderValidationsLiteral(validations)}),
)`
    : `/**
 * Create schema for ${name} with UI metadata.
 */
export const ${name}CreateFormSchema = ${objectLiteral}

/**
 * Update schema for ${name} (all fields optional).
 */
export const ${name}UpdateFormSchema = ${name}CreateFormSchema.partial()`

  return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

${imports.join('\n')}
${withNativeHelper}${applyNativeMessagesHelper}
${schemaExports}

/**
 * Fields excluded from forms.
 */
export const ${name}ExcludedFields = [${excludedFieldsStr}] as const

/**
 * Types.
 */
export type ${name}CreateForm = z.infer<typeof ${name}CreateFormSchema>
export type ${name}UpdateForm = z.infer<typeof ${name}UpdateFormSchema>
`
}
