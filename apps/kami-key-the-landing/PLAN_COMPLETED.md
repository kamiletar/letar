# Выполненные задачи

## Версия 0.4.3 — автогенерация download-info из GitHub Releases (2026-09-13)

Закрыт открытый вопрос из версии 0.4.2 (`download-info.ts` было ручным полем, забыли обновить
при релизе 1.7.4 — сайт показывал v1.7.2). Новый `getLatestDownload()` (`src/lib/github.ts`)
переиспользует `fetchLatestRelease()` из `@letar/github-releases` (тот же источник, что уже
использует `/changelog`), находит `.exe`-ассет последнего релиза `kami-key-the-v*` и берёт его
`name`/`browser_download_url` из GitHub API как есть — без конструирования URL по шаблону, чтобы
не повторить баг с сменой точки→дефис в имени ассета между релизами.

`page.tsx` стал `async` Server Component, один раз запрашивает `download` и передаёт пропом в
`HeroSection`/`DownloadsSection` — обе остались Client Components (typing-эффект, hover-состояние),
просто получают данные не из констант, а из пропа. `download-info.ts` оставлен только как
`FALLBACK_DOWNLOAD` на случай сбоя GitHub API. ISR-кеширование то же, что у `/changelog` — 1ч
(`next.revalidate` внутри самого `fetch` в `@letar/github-releases`, без отдельного
`export const revalidate` на странице).

Проверено живьём через dev-сервер (webpack, порт 3011): секция «Скачать» и hero показывают
`v1.7.4 · 107.4 MB`, ссылка `.exe` — `KamiKeyThe-Setup-1.7.4.exe` (дефисы, реальный ассет с
GitHub), без ошибок в консоли. `nx typecheck:tsgo`/`nx lint`/`nx run-many -t format` зелёные.

## Версия 0.4.1 — фикс flexWrap в hero-секции на mobile (2026-09-11)

Часть кросс-приложенческого аудита нового класса бага (root `.claude/docs/chakra-flexwrap-column-direction-overflow.md`,
найден изначально в domwellbes на `PeriodRangeForm`): `Flex` с
`direction={{ base: 'column', sm: 'row' }}` и безусловным `flexWrap="wrap"` — на `base`
(`direction="column"`) `wrap` переносит элементы по cross-axis, т.е. горизонтально, а не вниз.
В hero-секции (`_components/hero-section.tsx`, блок из 4 карточек `HERO_MAPPINGS`) реального
переполнения на 375px замерами не подтверждено (нет жёсткого `maxH`), фикс превентивный —
`flexWrap={{ base: 'nowrap', sm: 'wrap' }}`, wrap включается только при `direction="row"` (`sm`+).
`nx typecheck:tsgo`/`nx lint` зелёные.

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
