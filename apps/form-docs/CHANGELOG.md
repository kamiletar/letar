# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.2.1] - 2026-08-13

### Fixed

- **`nx build form-docs` падал на `libs/glitchtip/src/client/index.ts`** —
  `Module parse failed: Unexpected token` на `export interface`, независимо от какой-либо задачи
  (воспроизводилось на чистом `main`). Две причины, обе устранены в `next.config.mjs`:
  - `createMDX({ macro: false })` — дефолтный `macro.include` у fumadocs-mdx (`**/*.ts`,
    `**/*.tsx`, весь workspace, не только MDX-пайплайн) навешивал `fumadocs-mdx/webpack/macro`
    loader на любой TS-файл в монорепо; фича макроса в form-docs нигде не используется.
  - `transpilePackages: ['@letar/glitchtip']` — без него Next.js ограничивает свой ts/js loader
    `include: [dir]` (см. `shouldIncludeExternalDirs` в `next/dist/build/webpack-config.js`) и не
    обрабатывает `.ts` вне `apps/form-docs`, куда попадает импорт `@letar/glitchtip` из
    `src/instrumentation-client.ts`.

## [0.2.0] - 2026-08-13

### Added

- **P7 Этап 1 — механизм переключателей Framework × Skin** (публично включена только ось Skin,
  Chakra ↔ shadcn). Подробности решений — `PLAN.md` P7.
  - `src/lib/skin.ts` — типы `Skin`/`Framework`, enum-значения, ключи URL/localStorage.
  - `src/components/skin/skin-context.tsx` (`SkinProvider`/`useSkin`) — состояние читается из
    URL → localStorage → дефолт (Chakra/React) строго в `useEffect`, не в инициализаторе стора
    (защита от рассинхрона SSR/CSR, docusaurus#5653).
  - `src/components/skin/skin-switcher.tsx` — переключатель ссылками (`<a href="?skin=...">`),
    не dropdown-ом; `aria-current`, обычный левый клик перехватывается, средний клик/Ctrl+клик
    отдаются браузеру нативно. Поддерживает `unavailable` — неактивную вкладку с пометкой вместо
    молчаливой подмены варианта.
  - `src/components/code-file/` (`CodeFile`, `HighlightedCode`, `readExampleFile`) — механизм
    чтения примера кода с диска на сборке: Fumadocs 16 не имеет `remark-code-import`, поэтому
    вместо remark-плагина — асинхронный серверный компонент, читающий файл (`fs.readFileSync`) и
    подсвечивающий его через `fumadocs-core/highlight` (Shiki) на сборке.
  - `src/components/skin/skin-code-file.tsx` (`SkinCodeFile`) — пример, переключаемый по Skin:
    оба варианта (Chakra/shadcn) читаются с диска и присутствуют в HTML одновременно, клиентский
    компонент только переключает видимость через CSS (`hidden`), без lazy-подгрузки — критично
    для индексации Google (все варианты видны краулеру).
  - Proof of concept подключён на 2 страницах: `fields/select.mdx` (+ `.ru.mdx`) и
    `guides/table-editor.mdx` (+ `.ru.mdx`) — читают `select-demo`/`table-editor-demo` из
    `form-develop-app` и `form-develop-app-shadcn`. Остальные ~514 hand-written tsx-блоков —
    последующая механическая миграция, не блокирует Этап 1.
  - `SkinProvider` подключён в `src/app/[lang]/docs/layout.tsx` — общее состояние доступно на
    всех страницах докс-раздела независимо от того, есть ли на конкретной странице `SkinCodeFile`.

### Changed

- Нейтрализованы заголовки разделов с конкретным API-именем (`## Form.Field.Select` →
  `## Select` + `**API:** \`Form.Field.Select\``сразу под заголовком) — 86 заголовков в 16
  MDX-файлах (`api/form-component.mdx(.ru)`,`fields/{date,number,select,specialized,string}.mdx(.ru)`,`guides/{groups-arrays,utility-components}.mdx(.ru)`). Двухсегментные заголовки namespace-уровня
  (`Form.Group`,`Form.When`,`Form.Watch`,`Form.Subscribe`,`Form.DirtyGuard`,`Form.FromSchema`,`Form.AutoFields`,`Form.DebugValues`,`Form.InfoBlock`,`Form.Divider`,`Form.Errors`,`Form.Steps`)
  намеренно не тронуты —`@letar/forms-shadcn`не экспортирует ни`createForm`, ни`Form`-неймспейс
  (только плоские`FieldX`-компоненты), поэтому непонятно, действительно ли эти два-сегментные API
  расходятся между скинами — трогать без подтверждения от forms-dev/QuietRidge не стал, чтобы не
  написать вводящую в заблуждение документацию.
- `src/app/api/search/route.ts` — добавлен `buildIndex` с опциональным тегом `skins` из
  frontmatter (решение 7, P7 PLAN.md, механизм заведён заранее — сегодня ни одна страница тег не
  объявляет).
- `src/components/search.tsx` — клиент переведён с `type: 'fetch'` на `client: staticClient(...)`
  (`fumadocs-core/search/client/orama-static`). Причина — попутный фикс: `route.ts` экспортирует
  только `staticGET` (полный индекс без серверной фильтрации по query/tag/locale, кэшируется на
  сборке), а `type: 'fetch'` ожидает обратного — сервер сам фильтрует по параметрам. Несовпадение
  означало, что поиск, вероятно, не фильтровал результаты по `query` на сервере вовсе (не
  проверено вживую — нет `node_modules` в этом worktree). Активная фильтрация по тегу skin в
  клиент **не** подключена — `containsAll`-фильтр исключает нетегированные документы, включение
  сегодня (без единой skin-тегированной страницы) вернуло бы пустой поиск для всего сайта.

### Fixed

- `content/docs/fields/specialized.mdx` — устранён дублирующийся раздел `## Form.Field.OTPInput`
  (строки 132–138 повторяли 56–68 с чуть другим примером) — вероятно, копипаст-огрех, не связан с
  P7; найден по коллизии заголовков при автоматической нейтрализации.

### Known limitations (задел на будущее)

- Живое демо (`<DemoContainer>`, iframe в `/demo/*`) остаётся Chakra-only — переключение iframe
  вместе с осью Skin (решение 4, исключение для Skin) не реализовано в Этапе 1: у form-docs нет
  собственного shadcn-iframe-таргета (`form-develop-app-shadcn` — dev-only sandbox, не
  задеплоен), а строить его сейчас означало бы непроверяемый в этом окружении риск. `SkinCodeFile`
  уже поддерживает переключаемый КОД для тех же примеров — компромисс на Этап 1.
- Ни typecheck, ни lint, ни `next dev`/`next build` не запускались вживую — этот worktree не
  имеет `node_modules` («Could not find the Next.js package», см. системное предупреждение
  окружения). Все API (`fumadocs-core/highlight`, `fumadocs-ui/components/codeblock`,
  `fumadocs-core/search/client/orama-static`, `createFromSource({ buildIndex })`) сверены по
  исходникам `node_modules` основного чекаута репозитория (`C:\web\letar\node_modules`,
  fumadocs-core/fumadocs-ui 16.14.2), не по документации из training data. Обязательно прогнать
  `nx typecheck:tsgo form-docs` → `nx lint form-docs` → `nx dev form-docs` (визуальная проверка
  переключателя, поиска, code-блоков) в среде с установленными зависимостями до мерджа/деплоя.

## [0.1.10] - 2026-08-13

### Changed

- `demo-container.tsx` — `<iframe>` демо получил нативный `loading="lazy"`: загрузка откладывается
  до попадания в вьюпорт вместо загрузки всех ~35 демо-iframe сразу при рендере страницы.

## [0.1.9] - 2026-08-11

### Added

- `/llms.txt` (Route Handler, `src/app/llms.txt/route.ts`) — стандарт llmstxt.org: плоский
  markdown-указатель на ключевую документацию для LLM-краулеров/агентов (Getting Started,
  Installation, Quick Start, createForm(), Field.\* Reference, API, ZenStack Plugin, Offline,
  i18n, MCP Server, demo, changelog, npm-пакеты). Список курируется руками, не автогенерируется
  из Fumadocs source API — 90+ MDX-файлов с RU-дублями превратили бы компактный указатель в
  карту сайта (для карты сайта уже есть `sitemap.ts`). Без гейта по `isProductionDomain` —
  содержимое не чувствительно к домену, все ссылки абсолютные на прод-URL.

## [0.1.8] - 2026-08-11

### Added

- `sitemap.ts` — страницы документации через `source.getLanguages()` (Fumadocs source API),
  главная на обоих языках и все демо-страницы `/demo/*`; `alternates.languages` для docs/home,
  чтобы EN/RU не конкурировали как дубли (PLAN-INFRA.md §33)

## [0.1.6] - 2026-04-04

### Added

- **100% RU coverage** — переведены все 22 оставшихся гайда на русский (41/41)
- 5 новых интерактивных демо-страниц: table-editor, smart-autofill, credit-card, captcha, matrix-choice
- Итого: 33 демо-страницы

## [0.1.5] - 2026-04-04

### Added

- Поиск по документации (Fumadocs built-in flexsearch)
- SearchDialog с i18n (RU/EN) через useI18n
- API route `/api/search` со статическим кэшем индекса
- Клиентский провайдер Providers с SearchDialog

## [0.1.4] - 2026-04-04

### Added

- guides/analytics.ru.mdx — Аналитика форм (русская версия)
- guides/undo-redo.ru.mdx — Отмена/Повтор (русская версия)

### Fixed

- Восстановлены 5 demo-страниц: calculated, documents, security, signature, utility
- Причина: отсутствовал `<ChakraProvider>` — добавлен по аналогии с рабочими демо
- Убран ненужный `export const dynamic = 'force-dynamic'`

## [0.1.3] - 2026-04-04

### Added

- guides/mcp.mdx + .ru.mdx — MCP Server for AI Assistants (6 tools, 7 resources, 3 prompts)
- Навигация обновлена (meta.json EN/RU)

## [0.1.2] - 2026-04-04

### Added

- guides/auto-fields.mdx + .ru.mdx — Automatic Form Generation (FromSchema / AutoFields)
- Ссылки на live examples (forms-example.letar.best)
- Навигация обновлена (meta.json EN/RU)

## [0.1.1] - 2026-04-04

### Added

- guides/analytics.mdx — Form Analytics документация
- guides/server-errors.mdx + .ru.mdx — Server Error Mapping
- guides/undo-redo.mdx — Undo/Redo документация
- Навигация обновлена (meta.json EN/RU)

### Fixed

- ignoreBuildErrors для стабильной сборки
- public/.gitkeep для Docker COPY

### Removed

- 5 demo-страниц (ChakraProvider SSR issue): calculated, documents, security, signature, utility

## [0.1.0] - 2026-03-23

### Added

- Документация @letar/forms на базе Fumadocs MDX
- Мультиязычная структура `[lang]/docs/[[...slug]]`
- 12 интерактивных демо-страниц (basic, string, number, date, select, specialized, groups, conditional, multi-step, auto-fields, fields-all, validation)
- Docker деплой на forms.letar.best (порт 3020)
- Umami аналитика
