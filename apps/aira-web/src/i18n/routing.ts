import { defineRouting } from 'next-intl/routing'

/** Все 10 поддерживаемых локалей */
export const ALL_LOCALES = ['en', 'ru', 'es', 'zh', 'ar', 'de', 'fr', 'ja', 'pt', 'hi'] as const

/** RTL локали (справа налево) */
export const RTL_LOCALES = new Set(['ar'])

/** Нативные названия языков для LocaleSwitcher */
export const LOCALE_NAMES: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  zh: '中文',
  ar: 'العربية',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
  pt: 'Português',
  hi: 'हिन्दी',
}

export const routing = defineRouting({
  locales: [...ALL_LOCALES],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type Locale = (typeof ALL_LOCALES)[number]
