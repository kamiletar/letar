import type { DataField, DataFieldAttribute, DataModel } from '@zenstackhq/language/ast'
import { parseFormMeta } from './parser.js'
import type {
  FormFieldMeta,
  I18nConfig,
  ModelFieldInfo,
  ModelInfo,
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
 */
function serializeNativeAttribute(
  attr: DataFieldAttribute,
  refText: string,
  spec: NativeAttrSpec,
): NativeAttributeApplication {
  const args: NonNullable<NativeAttributeApplication['args']> = []

  attr.args.forEach((argNode, index) => {
    const argName = spec.argNames[index]
    if (!argName || argName === 'message') {
      return
    }
    const value = literalArgValue(argNode)
    if (value !== undefined) {
      args.push({ name: argName, value })
    }
  })

  return args.length > 0 ? { name: refText, args } : { name: refText }
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
  return `withNative(${zodType}, (s) => ZodUtils.${fn}(s, ${renderNativeAttributesLiteral(attrs)}))`
}

/** Обернуть `z.array(...)` в `withNative(..., ZodUtils.addListValidation)`, если есть `@length`. */
function applyListNativeAttributes(zodType: string, attrs: NativeAttributeApplication[] | undefined): string {
  if (!attrs || attrs.length === 0) {
    return zodType
  }
  return `withNative(${zodType}, (s) => ZodUtils.addListValidation(s, ${renderNativeAttributesLiteral(attrs)}))`
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
    const formMeta = parseFormMeta(field.comments)

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
  const { name, fields, excludedFields } = modelInfo

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

  // Generate imports
  const imports = [`import { z } from 'zod/v4'`]
  if (usesNativeAttributes) {
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

  // Фаза 1 (v2.4.0, A3) — типизированная обёртка, без которой ZodUtils.* стирает тип схемы
  // до z.ZodSchema (z.infer становился бы unknown) — находка Фазы 0 spike, libs/forms/PLAN.md.
  const withNativeHelper = usesNativeAttributes
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

  return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

${imports.join('\n')}
${withNativeHelper}
/**
 * Create schema for ${name} with UI metadata.
 */
export const ${name}CreateFormSchema = z.object({
${schemaFields.join(',\n')}
})

/**
 * Update schema for ${name} (all fields optional).
 */
export const ${name}UpdateFormSchema = ${name}CreateFormSchema.partial()

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
