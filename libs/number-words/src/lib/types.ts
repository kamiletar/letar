/** Поддерживаемые локали ISO 639-1 */
export const SUPPORTED_LOCALES = [
  'ru',
  'en',
  'fr',
  'de',
  'ja',
  'zh',
  'ar',
  'ko',
  'es',
  'pt',
  'hi',
  'tr',
  'pl',
  'uk',
  'be',
  'kk',
  'uz',
  'tg',
  'ky',
  'tk',
  'az',
  'hy',
  'ka',
  'ro',
  'fa',
  'bn',
  'id',
  'ms',
  'vi',
  'th',
  'sw',
  'nl',
  'sv',
  'it',
  'el',
  'he',
  'ur',
  'mr',
  'ta',
  'te',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/** RTL локали */
export const RTL_LOCALES: ReadonlySet<SupportedLocale> = new Set(['ar', 'fa', 'he', 'ur'])

/** Маппинг ISO 639-1 → BCP 47 (to-words формат) */
export const LOCALE_MAP: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-SA',
  ko: 'ko-KR',
  es: 'es-ES',
  pt: 'pt-PT',
  hi: 'hi-IN',
  tr: 'tr-TR',
  pl: 'pl-PL',
  uk: 'uk-UA',
  be: 'be-BY',
  uz: 'uz-UZ',
  az: 'az-AZ',
  ka: 'ka-GE',
  ro: 'ro-RO',
  fa: 'fa-IR',
  bn: 'bn-IN',
  id: 'id-ID',
  ms: 'ms-MY',
  vi: 'vi-VN',
  th: 'th-TH',
  sw: 'sw-KE',
  nl: 'nl-NL',
  sv: 'sv-SE',
  it: 'it-IT',
  el: 'el-GR',
  he: 'he-IL',
  ur: 'ur-PK',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
}

/** Локали без поддержки в to-words (нужны кастомные реализации) */
export const CUSTOM_LOCALES: ReadonlySet<string> = new Set(['ru', 'kk', 'tg', 'ky', 'tk', 'hy'])

/** Локали с иероглифической/слоговой письменностью (без пробелов между словами) */
export const NO_SPACE_LOCALES: ReadonlySet<string> = new Set(['ja', 'zh', 'ko', 'th'])

/** Проверка: является ли локаль RTL */
export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale as SupportedLocale)
}

/** Проверка: поддерживается ли локаль */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}
