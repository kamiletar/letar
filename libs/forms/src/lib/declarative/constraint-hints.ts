'use client'

import type {
  ZodArrayConstraints,
  ZodConstraints,
  ZodDateConstraints,
  ZodNumberConstraints,
  ZodStringConstraints,
} from './schema-constraints'

// =============================================================================
// Translation types
// =============================================================================

/**
 * String templates for constraint hints.
 * Placeholders: {n}, {min}, {max}, {chars}, {items}, {suffix}
 */
export type ConstraintHintTranslations = {
  string_exact: string
  string_range: string
  string_max: string
  string_min: string
  number_range: string
  number_max: string
  number_min: string
  number_integer: string
  number_integer_suffix: string
  date_range: string
  date_after: string
  date_before: string
  array_exact: string
  array_range: string
  array_max: string
  array_min: string
}

// =============================================================================
// Built-in translations (en, ru)
// =============================================================================

const EN_TRANSLATIONS: ConstraintHintTranslations = {
  string_exact: 'Exactly {n} {chars}',
  string_range: 'From {min} to {max} characters',
  string_max: 'Maximum {n} {chars}',
  string_min: 'Minimum {n} {chars}',
  number_range: 'From {min} to {max}{suffix}',
  number_max: 'Maximum {max}{suffix}',
  number_min: 'Minimum {min}{suffix}',
  number_integer: 'Integer',
  number_integer_suffix: ' (integer)',
  date_range: 'From {min} to {max}',
  date_after: 'Not before {min}',
  date_before: 'Not after {max}',
  array_exact: 'Exactly {n} {items}',
  array_range: 'From {min} to {max} items',
  array_max: 'Maximum {n} {items}',
  array_min: 'Minimum {n} {items}',
}

const RU_TRANSLATIONS: ConstraintHintTranslations = {
  string_exact: 'Ровно {n} {chars}',
  string_range: 'От {min} до {max} символов',
  string_max: 'Максимум {n} {chars}',
  string_min: 'Минимум {n} {chars}',
  number_range: 'От {min} до {max}{suffix}',
  number_max: 'Максимум {max}{suffix}',
  number_min: 'Минимум {min}{suffix}',
  number_integer: 'Целое число',
  number_integer_suffix: ' (целое)',
  date_range: 'С {min} по {max}',
  date_after: 'Не ранее {min}',
  date_before: 'Не позднее {max}',
  array_exact: 'Ровно {n} {items}',
  array_range: 'От {min} до {max} элементов',
  array_max: 'Максимум {n} {items}',
  array_min: 'Минимум {n} {items}',
}

const BUILTIN_TRANSLATIONS: Record<string, ConstraintHintTranslations> = {
  en: EN_TRANSLATIONS,
  ru: RU_TRANSLATIONS,
}

// =============================================================================
// Pluralization via Intl.PluralRules
// =============================================================================

type PluralForms = { one: string; few?: string; many?: string; other: string }

const CHAR_PLURALS: Record<string, PluralForms> = {
  en: { one: 'character', other: 'characters' },
  ru: { one: 'символ', few: 'символа', many: 'символов', other: 'символов' },
}

const ITEM_PLURALS: Record<string, PluralForms> = {
  en: { one: 'item', other: 'items' },
  ru: { one: 'элемент', few: 'элемента', many: 'элементов', other: 'элементов' },
}

function pluralizeWord(n: number, locale: string, plurals: Record<string, PluralForms>): string {
  const lang = locale.split('-')[0]!
  const forms = plurals[lang] ?? plurals.en!
  const rule = new Intl.PluralRules(locale).select(n)
  return (forms as Record<string, string>)[rule] ?? forms.other
}

// =============================================================================
// Formatting via Intl
// =============================================================================

function formatNumber(n: number, locale: string): string {
  if (Number.isInteger(n)) {
    return new Intl.NumberFormat(locale).format(n)
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

// =============================================================================
// Template engine
// =============================================================================

function template(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
}

// =============================================================================
// Translation resolution
// =============================================================================

function getTranslations(locale: string, custom?: Partial<ConstraintHintTranslations>): ConstraintHintTranslations {
  const lang = locale.split('-')[0]!
  const base = BUILTIN_TRANSLATIONS[lang] ?? BUILTIN_TRANSLATIONS[locale] ?? EN_TRANSLATIONS
  if (custom) {
    return { ...base, ...custom }
  }
  return base
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Generates a human-readable hint from constraints.
 *
 * Supports i18n via locale parameter (en, ru built-in).
 * For other languages, pass customTranslations.
 *
 * @param constraints - constraints from Zod schema
 * @param locale - locale (default 'en')
 * @param customTranslations - custom string templates
 *
 * @example
 * ```tsx
 * generateConstraintHint(constraints)        // → "Minimum 2 characters"
 * generateConstraintHint(constraints, 'ru')  // -> "Минимум 2 символа"
 * ```
 */
export function generateConstraintHint(
  constraints: ZodConstraints | undefined,
  locale: string = 'en',
  customTranslations?: Partial<ConstraintHintTranslations>
): string | undefined {
  if (!constraints) {
    return undefined
  }

  const t = getTranslations(locale, customTranslations)

  switch (constraints.schemaType) {
    case 'string':
      return generateStringHint(constraints.string, locale, t)
    case 'number':
      return generateNumberHint(constraints.number, locale, t)
    case 'date':
      return generateDateHint(constraints.date, locale, t)
    case 'array':
      return generateArrayHint(constraints.array, locale, t)
    default:
      return undefined
  }
}

// =============================================================================
// Type-specific generators
// =============================================================================

function generateStringHint(
  constraints: ZodStringConstraints | undefined,
  locale: string,
  t: ConstraintHintTranslations
): string | undefined {
  if (!constraints) return undefined

  const { minLength, maxLength, inputType } = constraints

  // Special types - only maxLength
  if (inputType === 'email' || inputType === 'url') {
    if (maxLength) {
      return template(t.string_max, { n: maxLength, chars: pluralizeWord(maxLength, locale, CHAR_PLURALS) })
    }
    return undefined
  }

  if (minLength !== undefined && maxLength !== undefined) {
    if (minLength === maxLength) {
      return template(t.string_exact, { n: minLength, chars: pluralizeWord(minLength, locale, CHAR_PLURALS) })
    }
    return template(t.string_range, { min: minLength, max: maxLength })
  }

  if (maxLength !== undefined) {
    return template(t.string_max, { n: maxLength, chars: pluralizeWord(maxLength, locale, CHAR_PLURALS) })
  }

  if (minLength !== undefined) {
    return template(t.string_min, { n: minLength, chars: pluralizeWord(minLength, locale, CHAR_PLURALS) })
  }

  return undefined
}

function generateNumberHint(
  constraints: ZodNumberConstraints | undefined,
  locale: string,
  t: ConstraintHintTranslations
): string | undefined {
  if (!constraints) return undefined

  const { min, max, isInteger } = constraints
  const suffix = isInteger ? t.number_integer_suffix : ''

  if (min !== undefined && max !== undefined) {
    return template(t.number_range, { min: formatNumber(min, locale), max: formatNumber(max, locale), suffix })
  }

  if (max !== undefined) {
    return template(t.number_max, { max: formatNumber(max, locale), suffix })
  }

  if (min !== undefined) {
    return template(t.number_min, { min: formatNumber(min, locale), suffix })
  }

  if (isInteger) {
    return t.number_integer
  }

  return undefined
}

function generateDateHint(
  constraints: ZodDateConstraints | undefined,
  locale: string,
  t: ConstraintHintTranslations
): string | undefined {
  if (!constraints) return undefined

  const { min, max } = constraints

  if (min && max) {
    return template(t.date_range, { min: formatDate(min, locale), max: formatDate(max, locale) })
  }

  if (min) {
    return template(t.date_after, { min: formatDate(min, locale) })
  }

  if (max) {
    return template(t.date_before, { max: formatDate(max, locale) })
  }

  return undefined
}

function generateArrayHint(
  constraints: ZodArrayConstraints | undefined,
  locale: string,
  t: ConstraintHintTranslations
): string | undefined {
  if (!constraints) return undefined

  const { minItems, maxItems } = constraints

  if (minItems !== undefined && maxItems !== undefined) {
    if (minItems === maxItems) {
      return template(t.array_exact, { n: minItems, items: pluralizeWord(minItems, locale, ITEM_PLURALS) })
    }
    return template(t.array_range, { min: minItems, max: maxItems })
  }

  if (maxItems !== undefined) {
    return template(t.array_max, { n: maxItems, items: pluralizeWord(maxItems, locale, ITEM_PLURALS) })
  }

  if (minItems !== undefined) {
    return template(t.array_min, { n: minItems, items: pluralizeWord(minItems, locale, ITEM_PLURALS) })
  }

  return undefined
}
