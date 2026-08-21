import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Поддерживаемые локали
  locales: ['ru', 'en'],

  // Локаль по умолчанию
  defaultLocale: 'ru',

  // Путь к локали по умолчанию без префикса
  localePrefix: 'as-needed',

  // ⚠️ Без этого next-intl middleware на первом заходе без cookie NEXT_LOCALE редиректит
  // непрефиксованный путь по Accept-Language браузера — Playwright/headless Chromium шлёт
  // en-US, поэтому /blog/ (RU по умолчанию) внезапно превращался в /en/blog/. Все RU-only
  // ассерты e2e (heading /hello-world/i — regex с дефисом не матчит "Hello World" с пробелом,
  // /Первая статья/, «Назад к блогу») стабильно валились по этой причине — совпало со всеми
  // упавшими тестами apps/kami-e2e/src/05-blog.spec.ts (agent-mail e2e-gate-status-form-example-kami,
  // 2026-08-21). Детерминированный RU по умолчанию — осознанный выбор, не обход теста: пользователь
  // всегда может переключить язык вручную, а SEO/URL стабильнее без скрытых редиректов.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
