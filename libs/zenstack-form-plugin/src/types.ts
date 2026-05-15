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
 * Model information.
 */
export interface ModelInfo {
  /** Model name */
  name: string
  /** Model fields */
  fields: ModelFieldInfo[]
  /** Excluded field names */
  excludedFields: string[]
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
