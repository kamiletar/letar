# PLAN_COMPLETED — aira-web

## Выполненные задачи

- [x] Инициализация приложения (2026-04-10)
  - Nx генерация, Chakra UI, тема teal/purple, MDX
  - Umami аналитика
- [x] v0.3.0 — 152-ФЗ: минимальное cookie-уведомление (2026-07-28)
  - Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика,
    без аккаунтов/форм — счётчик тоже собирает ПД (IP, cookies)
  - `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД)
  - `analytics-consent.tsx` — Umami инициализируется только после согласия
  - Страница `/[locale]/privacy` (10 локалей, текст политики пока только на русском — осознанное
    упрощение); `@letar/ui` добавлен в `transpilePackages` (`next.config.mjs`)
