# Выполненные задачи

## `--webpack` в dev/build — превентивный фикс Turbopack+Emotion hydration (2026-08-25)

Часть аудита `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md` (раздел «Аудит по
всему монорепо»). Приложение сочетает Chakra v3 `ChakraProvider` и `next-themes`'ный
`ThemeProvider` как прямого потомка (`_components/ui/provider.tsx`), `dev`/`build` в
`project.json` были голым `next dev -p 3015`/`next build` без флага бандлера — Turbopack по
умолчанию. Фикс — `--webpack` добавлен к обеим командам (эталон — `apps/mandala`). Живая
репродукция гонки клика не проводилась (превентивный фикс по структурному совпадению, как и на
`aira-web`/`auth-hub`) — `nx typecheck:tsgo`/`nx lint`/`nx build` зелёные.

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

Ссылка «Конфиденциальность» в футере переведена на `TouchLink` (`@letar/ui`).

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
