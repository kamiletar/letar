# Выполненные задачи

## tsconfig.json — убраны `references` на `libs/*` (2026-08-07)

Убраны ссылки на `../../libs/analytics` и `../../libs/ui` из `references` (хрупкий редирект на
`tsconfig.spec.json`, см. образец фикса `dashboard-agent` 0.11.1,
`.claude/rules/libs.md`). `references` пустой не остался — ключ был удалён целиком.
`nx typecheck:tsgo` и `nx build` зелёные.

## Версия 0.3.0 — 2026-07-28 (152-ФЗ: минимальное cookie-уведомление)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика, без
аккаунтов/форм. `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД),
`analytics-consent.tsx` (Umami только после согласия), минимальная страница `/privacy` (главная
страница без Navbar — `/privacy` рендерится только с `Footer`). `@letar/ui` не был подключён
(`package.json`/`next.config.js`) — добавлен.

## Версия 0.1.0

### Реализовано

- Базовая структура лендинга (Next.js 16 + Chakra UI v3)

---

**Последнее обновление:** 2026-04-04
