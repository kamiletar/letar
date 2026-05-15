import { defineRouting } from 'next-intl/routing'

/** Все 40 поддерживаемых локалей */
export const ALL_LOCALES = [
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

/** RTL локали */
export const RTL_LOCALES = new Set(['ar', 'fa', 'he', 'ur'])

export const routing = defineRouting({
  locales: [...ALL_LOCALES],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
})

export type Locale = (typeof ALL_LOCALES)[number]
