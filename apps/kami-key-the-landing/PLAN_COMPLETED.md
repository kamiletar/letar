# Выполненные задачи

## tsconfig.json — убраны `references` на `libs/*` (2026-08-07)

Ссылки на библиотеки в `references` вели на solution-конфиг библиотеки, который сам ссылается на
`tsconfig.lib.json`/`tsconfig.spec.json` — TypeScript берёт последний из списка как цель
редиректа, у большинства библиотек это `tsconfig.spec.json`, чей output не собирается ни одним
Nx-таргетом. Итог — вечный `TS6305`. Убраны все ссылки на `../../libs/*` (`analytics`, `ui`,
`seo`), `references` не пустой не был — ключ удалён целиком. Образец фикса —
`apps/dashboard-agent` (0.11.1, `.claude/rules/libs.md`). `nx typecheck:tsgo` и `nx build` зелёные.

## Версия 0.2.0 — 2026-07-28 (152-ФЗ: минимальное cookie-уведомление)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика, без
аккаунтов/форм. `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД),
`analytics-consent.tsx` (Umami только после согласия), минимальная страница `/privacy`. `@letar/ui`
не был подключён (`package.json`/`next.config.js`) — добавлен.

## Версия 0.1.0

### Реализовано

- Базовая структура лендинга (Next.js 16 + Chakra UI v3)

---

**Последнее обновление:** 2026-04-04
