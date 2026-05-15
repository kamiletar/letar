import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // На MVP активна только ru. en/cn — заглушки под W5/W9.
  locales: ['ru', 'en', 'cn'],
  defaultLocale: 'ru',
  // Главная без префикса (`/`), не-дефолтные с префиксом (`/en/...`, `/cn/...`)
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
