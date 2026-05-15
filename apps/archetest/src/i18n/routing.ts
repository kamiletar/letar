import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Поддерживаемые локали
  locales: ['ru', 'en'],

  // Локаль по умолчанию
  defaultLocale: 'ru',

  // Путь к локали по умолчанию без префикса
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
