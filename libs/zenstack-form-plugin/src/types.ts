/**
 * Zod constraints extracted from @form.props.
 * These values become Zod schema methods (.min(), .max(), etc.)
 */
export interface ZodConstraints {
  // Number constraints
  min?: number
  max?: number
  step?: number // → .multipleOf()
  positive?: boolean
  negative?: boolean
  // String constraints
  minLength?: number
  maxLength?: number
  pattern?: string // → .regex()
  email?: boolean
  url?: boolean
  uuid?: boolean
  // Exclusive number bounds (нативные @gt/@lt — .min()/.max() Zod включительны, этим двум нужны отдельные ключи)
  exclusiveMin?: number // → .gt()
  exclusiveMax?: number // → .lt()
  // Фаза 1 (v2.4.0) — паритет с нативными @startsWith/@endsWith/@contains/@datetime/@date/@time/
  // @phone/@trim/@lower/@upper. Ключи существуют, чтобы @form.props мог осознанно переопределить
  // (или явно продублировать) нативный атрибут того же поля — см. правило переопределения в
  // extractModelInfo (model-generator.ts).
  startsWith?: string
  endsWith?: string
  contains?: string
  datetime?: boolean
  date?: boolean
  time?: number | true // precision (@time(N)) или true (@time() без precision)
  phone?: boolean
  trim?: boolean
  lower?: boolean
  upper?: boolean
}

/**
 * Один нативный ZModel-атрибут валидации, сериализованный для инлайна как литерал
 * `AttributeApplication` в сгенерированном файле — рантайм-структура читается
 * `ZodUtils.*` из `@zenstackhq/zod` (Фаза 1, решение spike A3, см. `libs/forms/PLAN.md`).
 *
 * `args` НЕ включает `message` — `ZodUtils.*` (пакет 3.9.3) его не читает ни в одном из своих
 * `case`-ветвлений, значение было бы мёртвым весом в литерале, который читает `ZodUtils.*`.
 * `message` (ниже) идёт отдельным полем и применяется постфактум, отдельным кодогеном
 * (`applyNativeMessages` в `model-generator.ts`) — см. разбор блокера и находку в
 * `libs/forms/PLAN.md` (`message`-i18n).
 */
export interface NativeAttributeApplication {
  /** Ref-текст атрибута с `@`, как хранит Langium в `decl.$refText` (например `'@gte'`) */
  name: string
  /** Позиционные аргументы в порядке объявления атрибута в stdlib.zmodel, только литералы */
  args?: Array<{ name: string; value: number | string | boolean }>
  /**
   * Литерал последнего позиционного аргумента `message`, если задан. Не передаётся в
   * `ZodUtils.*` — используется только для постфактум-подмены `error` у соответствующего
   * Zod-check через мутацию недокументированного внутреннего поля `_zod.def.error` (Zod v4).
   * Число check'ов на этот атрибут выводится заново в кодогене (`deriveNativeCheckCount`) из
   * `name`/`args`, а не хранится здесь — само значение `checkCount` в этой структуре не нужно,
   * чтобы не ломать существующие структурные сравнения `nativeAttributes` в тестах парсера.
   */
  message?: string
}

/**
 * Form field metadata extracted from @form.* directives.
 */
export interface FormFieldMeta {
  /** Field label */
  title?: string
  /** Placeholder text */
  placeholder?: string
  /** Helper text / description */
  description?: string
  /** UI component type */
  fieldType?: string
  /** Zod constraints (min, max, minLength, etc.) — become schema methods */
  constraints?: ZodConstraints
  /**
   * Нативные ZModel-атрибуты валидации, применяемые через `ZodUtils.*` (Фаза 1, A3).
   * Уже отфильтрованы от атрибутов, чьи ключи-констрейнты переопределены через `@form.props`
   * (см. `extractModelInfo` в `model-generator.ts`). `Decimal`-поля сюда не попадают —
   * несовместимость с `ZodUtils.addDecimalValidation` зафиксирована в Фазе 0 spike, для них
   * действует прежний путь через `constraints` (see выше).
   */
  nativeAttributes?: NativeAttributeApplication[]
  /** UI props (everything else — passed to fieldProps) */
  props?: Record<string, unknown>
  /** Relation configuration */
  relation?: { model?: string; labelField: string }
  /** Exclude field from form */
  exclude?: boolean
}

/**
 * Enum value with a human-readable label.
 */
export interface EnumValueInfo {
  /** Value name (SWEET, SALTY, etc.) */
  name: string
  /** Human-readable label */
  label: string
}

/**
 * Enum information.
 */
export interface EnumInfo {
  /** Enum name */
  name: string
  /** Values with labels */
  values: EnumValueInfo[]
}

/**
 * Model field information.
 */
export interface ModelFieldInfo {
  /** Field name */
  name: string
  /** Prisma type */
  type: string
  /** Whether the field is required */
  isRequired: boolean
  /** Whether the field is an array */
  isList: boolean
  /** Whether the field is an enum */
  isEnum: boolean
  /** Enum name (if isEnum) */
  enumName?: string
  /** Default value */
  defaultValue?: unknown
  /** Form metadata */
  formMeta: FormFieldMeta
}

/**
 * Кросс-полевая проверка из `@@validate(condition, message?, path?)` (Фаза 2, v2.5.0).
 *
 * `conditionExpr` — уже сериализованный TS-литерал рантайм-структуры `Expression`, которую
 * читает `evalExpression` внутри `ZodUtils.addCustomValidation` (пакет `@zenstackhq/zod`):
 * `{ kind: 'binary', op: '>', left: { kind: 'field', field: 'endsAt' }, ... }` и т.д. Не строка
 * JS-кода — сериализатор AST-выражения `serializeExpression` (`model-generator.ts`), тот же
 * приём инлайна данных, что и `NativeAttributeApplication` в Фазе 1.
 */
export interface ModelValidation {
  /** Сериализованный литерал условия (Boolean-выражение) */
  conditionExpr: string
  /** Текст ошибки, если задан вторым аргументом (литерал-строка) */
  message?: string
  /** `path` третьим аргументом — к какому полю привязать ошибку */
  path?: string[]
}

/**
 * Model information.
 */
export interface ModelInfo {
  /** Model name */
  name: string
  /** Model fields */
  fields: ModelFieldInfo[]
  /** Excluded field names */
  excludedFields: string[]
  /** Кросс-полевые проверки из `@@validate` (Фаза 2). Опционально — старые фикстуры тестов без Фазы 2 не обязаны его задавать. */
  validations?: ModelValidation[]
  /**
   * `@@strict()` на модели — генерировать `z.strictObject(...)` вместо `z.object(...)`
   * (Фаза 2). ⚠️ Не проверено живьём с `@letar/forms` submit-пайплайном — см.
   * `libs/forms/PLAN.md`, риск, что форма шлёт служебные поля, которых `.strict()` не простит.
   */
  isStrict?: boolean
}

/**
 * Generator options.
 */
export interface GeneratorOptions {
  /** Output path */
  output: string
  /** Schema file path */
  schemaPath: string
}

/**
 * i18n configuration.
 */
export interface I18nConfig {
  /** Whether i18n mode is enabled */
  enabled: boolean
  /** Output path for translation files (relative to schema.zmodel) */
  output: string
  /** Default locale (source of truth — overwritten on each generation) */
  defaultLocale: string
  /** List of all locales */
  locales: string[]
  /** Path to custom validation translations file (optional) */
  validationTranslationsPath?: string
}

/**
 * Collected translation data for generation.
 */
export interface I18nTranslations {
  /** Model translations: { ModelName: { fieldName: { title: '...', placeholder: '...' } } } */
  models: Record<string, Record<string, Record<string, string>>>
  /** Enum translations: { EnumName: { VALUE: { label: '...' } } } */
  enums: Record<string, Record<string, Record<string, string>>>
}

/**
 * Validation error translations for Zod v4.
 *
 * Keys correspond to Zod v4 issue codes.
 * Interpolation params: {minimum}, {maximum}, {expected}, {received}, {options}, {keys}, {message}
 */
export interface ValidationTranslations {
  /** invalid_type — wrong data type */
  invalid_type: string
  /** required — field is required */
  required: string
  /** too_small — value below minimum */
  too_small: {
    string: string
    number: string
    array: string
    date: string
    set: string
    file: string
  }
  /** too_big — value above maximum */
  too_big: {
    string: string
    number: string
    array: string
    date: string
    set: string
    file: string
  }
  /** invalid_format — invalid string format (Zod v4, formerly invalid_string) */
  invalid_format: {
    email: string
    url: string
    uuid: string
    cuid: string
    regex: string
    datetime: string
    date: string
    time: string
    ip: string
    base64: string
    json_string: string
    emoji: string
    jwt: string
    lowercase: string
    uppercase: string
  }
  /** not_multiple_of — number not a multiple */
  not_multiple_of: string
  /** unrecognized_keys — unknown keys in object */
  unrecognized_keys: string
  /** invalid_value — invalid value (Zod v4, combines invalid_enum_value + invalid_literal) */
  invalid_value: string
  /** invalid_union — invalid union */
  invalid_union: string
  /** invalid_key — invalid key (z.record/z.map) */
  invalid_key: string
  /** invalid_element — invalid element (z.map/z.set) */
  invalid_element: string
  /** custom — custom error (.refine, .superRefine) */
  custom: string
}
