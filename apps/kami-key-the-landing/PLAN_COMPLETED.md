# Выполненные задачи

## Версия 0.4.0 — реальное скачивание + страница /changelog (2026-09-06)

Заглушка «Скоро» на секции «Скачать» и hero-бейдже заменена на реальную ссылку —
`kami-key-the-v1.7.2` на GitHub Releases (`kamiletar/letar`, первый реальный релиз в
репозитории — детали фикса инсталлятора в `apps/kami-key-the/PLAN.md`). Версия/размер вынесены в
`src/app/_components/download-info.ts`, обновлять вручную при следующем релизе.

Добавлена страница `/changelog` — живой fetch GitHub Releases API через общий
`@letar/github-releases` (ISR 1ч), `react-markdown`+`remark-gfm` для рендера release notes, по
образцу `apps/animatrona-landing/src/app/_components/changelog-section.tsx` (но отдельным
роутом, а не секцией на главной — у сайта нет раздела «блог»/«докс», под который её можно было бы
подверстать). Ссылки в navbar и футере, попутно почищена мёртвая ссылка «GitHub (скоро)» в
футере — ведёт на реальную страницу релизов.

Задеплоено на прод (s2) через deploy-agent-dev, кнопка скачивания проверена живым скачиванием.

## `--webpack` в dev/build — превентивный фикс Turbopack+Emotion hydration (2026-08-25)

Часть аудита `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md` (раздел «Аудит по
всему монорепо»). Приложение сочетает Chakra v3 `ChakraProvider` и `next-themes`'ный
`ThemeProvider` как прямого потомка (`_components/ui/provider.tsx`), `dev`/`build` в
`project.json` были голым `next dev -p 3011`/`next build` без флага бандлера — Turbopack по
умолчанию. Фикс — `--webpack` добавлен к обеим командам (эталон — `apps/mandala`). Живая
репродукция гонки клика не проводилась (превентивный фикс по структурному совпадению, как и на
`aira-web`/`auth-hub`) — `nx typecheck:tsgo`/`nx lint`/`nx build` зелёные.

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
