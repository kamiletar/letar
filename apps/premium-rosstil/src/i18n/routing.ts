import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Поддерживаемые локали
  locales: ['ru'],

  // Локаль по умолчанию
  defaultLocale: 'ru',

  // Всегда показывать префикс локали в URL (/ru/about вместо /about)
  // Это нужно чтобы при добавлении других языков URL не менялись
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
