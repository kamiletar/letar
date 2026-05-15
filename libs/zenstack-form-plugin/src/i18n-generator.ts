import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import type { EnumInfo, I18nConfig, I18nTranslations, ModelInfo, ValidationTranslations } from './types.js'

// ─── Built-in validation translations ──────────────────────────────────────────

/**
 * Built-in validation translations.
 * English and Russian are included out of the box.
 * For other languages, use the `validationTranslationsPath` plugin option.
 */
const BUILTIN_TRANSLATIONS: Record<string, ValidationTranslations> = {
  en: {
    invalid_type: 'Expected {expected}, received {received}',
    required: 'Required field',
    too_small: {
      string: 'Minimum {minimum} characters',
      number: 'Minimum {minimum}',
      array: 'Minimum {minimum} items',
      date: 'Date must be after {minimum}',
      set: 'Minimum {minimum} items',
      file: 'Minimum file size {minimum}',
    },
    too_big: {
      string: 'Maximum {maximum} characters',
      number: 'Maximum {maximum}',
      array: 'Maximum {maximum} items',
      date: 'Date must be before {maximum}',
      set: 'Maximum {maximum} items',
      file: 'Maximum file size {maximum}',
    },
    invalid_format: {
      email: 'Invalid email address',
      url: 'Invalid URL',
      uuid: 'Invalid UUID',
      cuid: 'Invalid CUID',
      regex: 'Does not match pattern',
      datetime: 'Invalid datetime',
      date: 'Invalid date',
      time: 'Invalid time',
      ip: 'Invalid IP address',
      base64: 'Invalid Base64',
      json_string: 'Invalid JSON',
      emoji: 'Must contain emoji',
      jwt: 'Invalid JWT',
      lowercase: 'Must be lowercase',
      uppercase: 'Must be uppercase',
    },
    not_multiple_of: 'Must be multiple of {multipleOf}',
    unrecognized_keys: 'Unknown fields: {keys}',
    invalid_value: 'Invalid value. Expected: {options}',
    invalid_union: 'Invalid data',
    invalid_key: 'Invalid key',
    invalid_element: 'Invalid element',
    custom: '{message}',
  },
  ru: {
    invalid_type: 'Ожидался тип {expected}, получен {received}',
    required: 'Обязательное поле',
    too_small: {
      string: 'Минимум {minimum} символов',
      number: 'Минимум {minimum}',
      array: 'Минимум {minimum} элементов',
      date: 'Дата должна быть не ранее {minimum}',
      set: 'Минимум {minimum} элементов',
      file: 'Минимальный размер файла {minimum}',
    },
    too_big: {
      string: 'Максимум {maximum} символов',
      number: 'Максимум {maximum}',
      array: 'Максимум {maximum} элементов',
      date: 'Дата должна быть не позднее {maximum}',
      set: 'Максимум {maximum} элементов',
      file: 'Максимальный размер файла {maximum}',
    },
    invalid_format: {
      email: 'Некорректный email',
      url: 'Некорректный URL',
      uuid: 'Некорректный UUID',
      cuid: 'Некорректный CUID',
      regex: 'Не соответствует формату',
      datetime: 'Некорректная дата/время',
      date: 'Некорректная дата',
      time: 'Некорректное время',
      ip: 'Некорректный IP-адрес',
      base64: 'Некорректный Base64',
      json_string: 'Некорректный JSON',
      emoji: 'Должен содержать эмодзи',
      jwt: 'Некорректный JWT',
      lowercase: 'Только строчные буквы',
      uppercase: 'Только заглавные буквы',
    },
    not_multiple_of: 'Должно быть кратно {multipleOf}',
    unrecognized_keys: 'Неизвестные поля: {keys}',
    invalid_value: 'Недопустимое значение. Ожидается: {options}',
    invalid_union: 'Невалидные данные',
    invalid_key: 'Невалидный ключ',
    invalid_element: 'Невалидный элемент',
    custom: '{message}',
  },
}

// ─── Translation collection ────────────────────────────────────────────────────

/**
 * Collect translations from model fields.
 */
export function collectModelTranslations(models: ModelInfo[]): I18nTranslations['models'] {
  const translations: I18nTranslations['models'] = {}

  for (const model of models) {
    const modelTranslations: Record<string, Record<string, string>> = {}

    for (const field of model.fields) {
      const fieldTranslations: Record<string, string> = {}

      if (field.formMeta.title) {
        fieldTranslations.title = field.formMeta.title
      }
      if (field.formMeta.placeholder) {
        fieldTranslations.placeholder = field.formMeta.placeholder
      }
      if (field.formMeta.description) {
        fieldTranslations.description = field.formMeta.description
      }

      if (Object.keys(fieldTranslations).length > 0) {
        modelTranslations[field.name] = fieldTranslations
      }
    }

    if (Object.keys(modelTranslations).length > 0) {
      translations[model.name] = modelTranslations
    }
  }

  return translations
}

/**
 * Collect translations from enums.
 */
export function collectEnumTranslations(enums: EnumInfo[]): I18nTranslations['enums'] {
  const translations: I18nTranslations['enums'] = {}

  for (const enumInfo of enums) {
    const enumTranslations: Record<string, Record<string, string>> = {}

    for (const value of enumInfo.values) {
      enumTranslations[value.name] = { label: value.label }
    }

    translations[enumInfo.name] = enumTranslations
  }

  return translations
}

// ─── Validation translations ───────────────────────────────────────────────────

/**
 * Load custom validation translations from a user-provided file.
 * The file should export a default Record<string, ValidationTranslations>.
 */
async function loadCustomTranslations(
  translationsPath: string,
  schemaDir: string
): Promise<Record<string, ValidationTranslations> | undefined> {
  try {
    const fullPath = resolve(schemaDir, translationsPath)
    const mod = await import(fullPath)
    return mod.default ?? mod
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[zenstack-form-plugin] Could not load custom translations from ${translationsPath}`)
    return undefined
  }
}

/**
 * Get validation translations for a locale.
 *
 * Resolution order:
 * 1. Custom translations (from validationTranslationsPath)
 * 2. Built-in translations (en, ru)
 * 3. Fallback to English
 */
export function getValidationTranslations(
  locale: string,
  customTranslations?: Record<string, ValidationTranslations>
): ValidationTranslations {
  return customTranslations?.[locale] ?? BUILTIN_TRANSLATIONS[locale] ?? BUILTIN_TRANSLATIONS.en
}

// ─── File utilities ────────────────────────────────────────────────────────────

/**
 * Read an existing JSON translation file.
 */
async function readExistingTranslations(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Deep merge two objects.
 * - New keys are added with empty values
 * - Existing translations are preserved
 * - Obsolete keys are removed
 */
function mergeTranslations(
  source: Record<string, unknown>,
  existing: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const existingValue = existing[key]
      if (typeof existingValue === 'object' && existingValue !== null && !Array.isArray(existingValue)) {
        result[key] = mergeTranslations(value as Record<string, unknown>, existingValue as Record<string, unknown>)
      } else {
        result[key] = createEmptyTranslations(value as Record<string, unknown>)
      }
    } else if (typeof value === 'string') {
      const existingValue = existing[key]
      result[key] = typeof existingValue === 'string' && existingValue !== '' ? existingValue : ''
    }
  }

  return result
}

/**
 * Create an object with empty string values (placeholder for translations).
 */
function createEmptyTranslations(source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = createEmptyTranslations(value as Record<string, unknown>)
    } else if (typeof value === 'string') {
      result[key] = ''
    }
  }

  return result
}

// ─── Key collection for TypeScript types ───────────────────────────────────────

/**
 * Recursively collect keys from a validation translations object.
 */
function collectValidationKeys(obj: Record<string, unknown>, prefix: string): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`
    if (typeof value === 'string') {
      keys.push(fullKey)
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...collectValidationKeys(value as Record<string, unknown>, fullKey))
    }
  }

  return keys
}

/**
 * Collect all translation keys for TypeScript type generation.
 */
function collectAllKeys(
  translations: I18nTranslations,
  validationTranslations: ValidationTranslations | null,
  prefix = ''
): string[] {
  const keys: string[] = []

  // Model keys: Product.name.title, Product.name.placeholder, etc.
  for (const [modelName, fields] of Object.entries(translations.models)) {
    for (const [fieldName, props] of Object.entries(fields)) {
      for (const propName of Object.keys(props)) {
        keys.push(`${prefix}${modelName}.${fieldName}.${propName}`)
      }
    }
  }

  // Enum keys: RecipeType.SWEET.label, etc.
  for (const [enumName, values] of Object.entries(translations.enums)) {
    for (const [valueName, props] of Object.entries(values)) {
      for (const propName of Object.keys(props)) {
        keys.push(`${prefix}${enumName}.${valueName}.${propName}`)
      }
    }
  }

  // Validation keys: validation.too_small.string, validation.invalid_format.email, etc.
  if (validationTranslations) {
    keys.push(
      ...collectValidationKeys(validationTranslations as unknown as Record<string, unknown>, `${prefix}validation`)
    )
  }

  return keys.sort()
}

/**
 * Generate a TypeScript file with translation key types.
 */
function generateKeysTypeScript(keys: string[]): string {
  if (keys.length === 0) {
    return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

/**
 * All form translation keys (empty — no translations)
 */
export type FormI18nKey = never
`
  }

  const keyLiterals = keys.map((k) => `  | '${k}'`).join('\n')

  return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

/**
 * All form translation keys.
 *
 * Pattern:
 * - {ModelName}.{fieldName}.{title|placeholder|description}
 * - {EnumName}.{VALUE}.{label}
 * - validation.{code} — Zod validation errors
 * - validation.{code}.{origin} — errors with type (string, number, array, date)
 */
export type FormI18nKey =
${keyLiterals}

/**
 * Total key count: ${keys.length}
 */
export const FORM_I18N_KEY_COUNT = ${keys.length}
`
}

/**
 * Write a file, creating directories as needed.
 */
async function writeFileWithDir(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf-8')
}

// ─── Main generation ───────────────────────────────────────────────────────────

/**
 * Main function: generate i18n translation files.
 */
export async function generateI18nFiles(
  translations: I18nTranslations,
  config: I18nConfig,
  schemaDir: string
): Promise<void> {
  const outputDir = resolve(schemaDir, config.output)

  // Load custom translations if path is provided
  const customTranslations = config.validationTranslationsPath
    ? await loadCustomTranslations(config.validationTranslationsPath, schemaDir)
    : undefined

  // Generate files for each locale
  for (const locale of config.locales) {
    const filePath = join(outputDir, `${locale}.json`)

    const validationTranslations = getValidationTranslations(locale, customTranslations)

    // Merge models, enums, and validation into a single JSON object
    const fullTranslations: Record<string, unknown> = {
      ...translations.models,
      ...translations.enums,
      validation: validationTranslations,
    }

    if (locale === config.defaultLocale) {
      // Default locale: full overwrite (source of truth)
      await writeFileWithDir(filePath, JSON.stringify(fullTranslations, null, 2) + '\n')
    } else {
      // Other locales: merge strategy (preserves existing translations)
      const existing = await readExistingTranslations(filePath)
      const merged = existing
        ? mergeTranslations(fullTranslations, existing as Record<string, unknown>)
        : createEmptyTranslations(fullTranslations)

      await writeFileWithDir(filePath, JSON.stringify(merged, null, 2) + '\n')
    }
  }

  // Generate TypeScript key types
  const validationForKeys = getValidationTranslations(config.defaultLocale, customTranslations)
  const allKeys = collectAllKeys(translations, validationForKeys)
  const keysCode = generateKeysTypeScript(allKeys)
  await writeFileWithDir(join(outputDir, 'keys.ts'), keysCode)

  // eslint-disable-next-line no-console
  console.log(
    `[zenstack-form-plugin] Generated i18n files: ${config.locales.length} locale(s), ${allKeys.length} key(s)`
  )
}
