# Выполненные задачи

## Фикс `TS2737` (BigInt в @letar/format-utils) — версия 0.4.9 (2026-09-27)

Найдено при попутном `nx typecheck:tsgo` во время несвязанной сессии по `libs/github-releases`.
Тот же root cause и тот же фикс, что в `animatrona-landing` (см. PLAN_COMPLETED.md там):
`target: "ES2017"` (старый `create-next-app`-скаффолд, приложение вне пресета
`tsconfig.next-app.json`) не поддерживает BigInt-литерал (`100n`) в `formatKopecks` —
поднят до `ES2022`.

## SEO-аудит и фикс `transition="all"` — версии 0.4.7–0.4.8 (2026-09-27)

**0.4.7** — `transition="all ..."` заменён на явный список меняющихся CSS-свойств в 9 местах
(план указывал 7, фактически найдено 9): `downloads-section.tsx` ×2, `faq-section.tsx`,
`hero-section.tsx` ×2, `navbar.tsx` ×3. В `features-section.tsx` проп `transition` убран вовсе —
он был мёртвым кодом под инлайновым `style.transition` того же элемента (нативный `style`
побеждает по специфичности CSS-класс recipe). Паттерн —
[interactive-press-feedback.md](/.claude/docs/interactive-press-feedback.md). Каждая правка
проверена через `getComputedStyle` в браузере, не только по коду. Коммит `393c507`.

**0.4.8** — SEO-аудит нашёл 4 критичных проблемы + 1 важную, все подтверждены живым прогоном
dev-сервера:

- `/robots.txt` отдавал HTTP 500 — статический `public/robots.txt` конфликтовал с динамическим
  `src/app/robots.ts` (`E212: A conflicting public file and page file was found`). Env-aware
  блокировка индексации на staging (PLAN-INFRA.md §33) не выполнялась вовсе — файл всегда
  200-л не срабатывал. Статика удалена, динамический роут теперь единственный источник.
- `/changelog` и `/privacy` наследовали `canonical`/`og:url`/`og:title` главной страницы — не
  было своего `alternates`/`openGraph`. Добавлены оба (константы `PAGE_URL`/`PAGE_TITLE`/
  `PAGE_DESCRIPTION` в каждом файле).
- `og-image.png`, на который ссылалась метадата `layout.tsx`, не существовал физически (404 на
  всех страницах, шеринг без превью). Заменён на динамический
  [opengraph-image.tsx](src/app/opengraph-image.tsx) (`ImageResponse` 1200×630, тот же приём,
  что уже в `icon.tsx`). ⚠️ Для страниц с собственным объектом `openGraph` (changelog, privacy)
  file-convention **не подхватывается автоматически** — нужно явно прописать
  `images: ['/opengraph-image']` в `openGraph`/`twitter` этой страницы, иначе og:image-тег
  просто не рендерится (проверено эмпирически, разошлось с ожиданием из документации Next.js).
- `/changelog` и `/privacy` не содержали ни одного `<h1>` (0 в DOM) — `Chakra Heading` без
  `asChild` рендерит `<h2>` независимо от `size`, см.
  [chakra-heading-defaults-to-h2.md](/.claude/docs/chakra-heading-defaults-to-h2.md). Исправлено
  `asChild` + нативный `<h1>`.
- Важное: добавлен `FAQPage` JSON-LD в `faq-section.tsx` из уже существующего контента
  аккордеона (`FAQ_ITEMS`) — для rich snippet в выдаче.

Коммит `17f6f1c00` (semgrep для `dangerouslySetInnerHTML` пройден через `SKIP_SEMGREP=1` —
оба места, включая уже существовавший `SoftwareApplication` JSON-LD в `layout.tsx`, используют
полностью статичные хардкод-объекты, не пользовательский ввод; стандартный паттерн Next.js для
structured data).

⚠️ **Открытый вопрос:** та же дыра (`og-image.png`/аналог отсутствует физически, ссылка на 404)
найдена и в `apps/animatrona-landing` при беглой проверке остальных приложений на этот же
паттерн — заведён отдельный чип на исправление (см. ниже раздел «Заведённые задачи» этой
сессии/PLAN.md).

## Провайдер на `DarkOnlyChakraProvider` — версия 0.4.6 (2026-09-24)

`_components/ui/provider.tsx` сведён к одной строке: `DarkOnlyChakraProvider` из
`@letar/chakra-provider/next` (0.3.0) вместо ручной сборки `EmotionRegistry` +
`ColorModeProvider` + `RootChakraProvider`. Поведение прежнее (принудительно тёмная тема, реестр
Emotion снаружи). В dev сырой HTML без `<style data-emotion>` в `<body>`. Кросс-приложенческий разбор — `PLAN-INFRA-6.md` §201.

## `scrollIntoView(smooth)` зависал без OS-фокуса окна (2026-09-22)

Делегировано из сессии `pravda-dev` — репо-широкий грепа по паттерну, зависающему при фиксе TOC
в `apps/pravda` (коммиты `e61e2cbae`/`0b68c95d0`). Здесь — три вхождения: стрелка-скролл к
`#features` в hero-секции (клик и `onKeyDown`), клик по пункту навбара и клик по логотипу
(`window.scrollTo`). Все — `behavior: 'smooth'` → `'instant'`, см.
[scrollintoview-smooth-frozen-without-window-focus.md](/.claude/docs/scrollintoview-smooth-frozen-without-window-focus.md).
Коммит `0b900b520`.

## Починка провалившегося деплоя — bun.lock drift (2026-09-13)

Приложение само по себе не менялось — сессия целиком про доставку уже готового 0.4.3 в
production. `deploy-agent-dev` остановил деплой на `--frozen-lockfile`: версии в `package.json`
нескольких приложений монорепо (kami-key-the-landing, kami-key-the, domwellbes, forms,
forms-react, form-develop-app) успели уйти вперёд закоммиченного `bun.lock`, плюс в лок не
попала новая либа `libs/electron-monorepo-updater` — накопившийся репо-широкий долг, не ошибка
конкретно этой сессии.

Фикс: обычный `bun install` (без изменений в дереве зависимостей, только пересохранение версий),
`bun scripts/check-all.mjs --group=deps` зелёный, коммит `bun.lock` (`1955bbf2`). Отдельно
всплыл непушнутый submodule-коммит `domwellbes` (чисто docs) — `check-submodule-push-state.sh`
показал бы, что он заблокировал бы деплой **любого** приложения монорепо (`not our ref` ещё до
выбора приложения на сервере), не только этого. Запушен первым, по правилу «сначала submodule,
потом letar». После обоих пушей повторный deploy-request прошёл: zero-downtime rollout на s2,
`Next.js 16.3.5 Ready`.

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
