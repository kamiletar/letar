# PLAN_COMPLETED — aira-web

## Выполненные задачи

- [x] Лендинг, навигация и SEO — зафиксировано задним числом (2026-07-30)
  - Пункты висели в `PLAN.md` как незакрытые, хотя код давно на месте. Точную дату восстановить
    нельзя: файлы старше `chore: initial commit` (2026-05-16, fresh start из lena)
  - Навигация: `header.tsx` (+ мобильное меню, `skip-to-content`), `footer.tsx`, `locale-switcher.tsx`
  - Секции: `hero.tsx`, `features.tsx`, `security-deep-dive.tsx`, `download-section.tsx`
  - Релизы: `lib/github.ts` — последний релиз из GitHub Releases API, ISR 1 час, разбор ассетов
    installer/portable по платформе и архитектуре. **Отдельных страниц списка и релиза нет** —
    осталось в `PLAN.md`
  - SEO: `opengraph-image.tsx`, `json-ld.tsx`, `sitemap.ts`, `robots.ts`, `lib/seo.ts`, `manifest.ts`
  - Деплой: `docker-compose.production.yml` (порт 3017) + staging-вариант
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
