# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Общайся со мной на русском

## Документация

Полная документация — в `.claude/docs/`. Ниже индекс: ссылка + условие, при котором док нужен.
⭐ — читать до начала работы в теме, ⚠️ — ловушка, которая выглядит как успех.

**Репозиторий и среда:** [repo-structure](/.claude/docs/repo-structure.md) ⭐ публичный монорепо +
приватные submodules · [environment](/.claude/docs/environment.md) приложения, dev-порты, команды ·
[architecture](/.claude/docs/architecture.md) · [code-style](/.claude/docs/code-style.md) ·
[documentation-guidelines](/.claude/docs/documentation-guidelines.md) ·
[plan-decomposition-pattern](/.claude/docs/plan-decomposition-pattern.md) когда и как резать
разросшийся `PLAN.md`/`ROADMAP.md` на части с точкой входа ·
[tsconfig-presets](/.claude/docs/tsconfig-presets.md) общий пресет Next.js-приложений, `${configDir}` ·
[agent-skills-mirror](/.claude/docs/agent-skills-mirror.md) зеркало `.claude/skills/` для Codex ·
[nextjs16-agent-guide-files](/.claude/docs/nextjs16-agent-guide-files.md) `next dev` сам пишет
`apps/<app>/AGENTS.md` ·
[llms-txt-pattern](/.claude/docs/llms-txt-pattern.md) `llms.txt` (llmstxt.org) — кому нужен,
статика `public/` vs роут (роут только при зависимости от БД/`BASE_URL`), курируемый список
вместо дубля `sitemap.xml`, машинный контракт (JSON-LD + `window`-API) и ⚠️ юридические запреты
формулировок действуют в нём так же, как на страницах сайта ·
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md) разборы гонок между
агентами: почему правила git такие строгие ·
[git-pathspec-commit-worktree-not-index](/.claude/docs/git-pathspec-commit-worktree-not-index.md)
⚠️ `git commit -- <pathspec>` берёт рабочее дерево, а не индекс: молча теряет `git rm --cached`
на игнорируемом пути, забирает чужой WIP из каталога в pathspec и оставляет индекс
рассинхронизированным (`MM` со staged-удалением того, что уже в `HEAD`) ·
[nx-convert-to-inferred-scope-regression](/.claude/docs/nx-convert-to-inferred-scope-regression.md)
⚠️ `nx g @nx/*:convert-to-inferred` тихо меняет реальный охват таргета у проектов с кастомными
настройками — диффать до/после, не доверять «отработал без ошибок» ·
[nx-target-without-executor-silent-noop](/.claude/docs/nx-target-without-executor-silent-noop.md)
⚠️ таргет в `project.json` без `executor` (только `options`, добавка к inferred-таргету плагина) —
если путь проекта выпал из `include` плагина в `nx.json`, Nx молча подставляет `nx:noop`: команда
завершается за ~21мс с `Successfully ran target`, ноль тестов реально не запущено, `nx show
projects --with-target` этого не ловит ·
[nx-temp-build-dir-breaks-project-graph](/.claude/docs/nx-temp-build-dir-breaks-project-graph.md)
⚠️ временный distDir внутри `apps/` (`NEXT_DIST_DIR=.next-prodcheck`) роняет граф Nx **у всех**
параллельных агентов, а ошибка не намекает на чужой каталог; закрыто шаблонами в `.nxignore` —
там же, почему `**/dist*` брать нельзя и как проверить, что правило вправду исключает ·
[tsgo-stray-declarations](/.claude/docs/tsgo-stray-declarations.md) ⚠️ `typecheck:tsgo` иногда
эмитит `.d.ts`/`.d.ts.map` рядом с исходником вместо `outDir` — не воспроизведено детерминированно
на чистом дереве, гигиена (`.d.ts.map` в `.gitignore`) и cleanup-команда ·
[bun-lockfile-private-submodules](/.claude/docs/bun-lockfile-private-submodules.md) ⚠️
`--frozen-lockfile` падает везде, где submodule не выкачаны; чистка `bun.lock` не держится ·
[bun-install-stale-isolated-cache](/.claude/docs/bun-install-stale-isolated-cache.md) ⚠️
несколько версий пакета в `node_modules/.bun` после снятия пина — не признак незавершённого
резолва, обычный `bun install` не прунит устаревшие isolated-копии; сверять по `bun.lock`,
чинить — `bun install --force` ·
[bun-isolated-linker-alias-shared-bucket-collision](/.claude/docs/bun-isolated-linker-alias-shared-bucket-collision.md)
⚠️ npm-alias-схема двух версий одного пакета (`"typescript": "npm:@typescript/typescript6@^6.0.2"`

- `"@typescript/native": "npm:typescript@^7.0.2"`) не работает под bun isolated linker — оба
  алиаса резолвятся в один общий bucket по `package.json.name` тарболла, не по ключу-алиасу;
  уронило `nx lint` на всём монорепо разом ·
  [root-pin-peer-drift](/.claude/docs/root-pin-peer-drift.md) ⚠️ точный пин в корневом
  `package.json` — тихая мина: override/resolution перебивает его молча или caret-соседи уезжают
  вперёд без него; `bun install` не печатает peer-warnings ни в каком режиме, проверка —
  `bun scripts/check-all.mjs --group=deps` (раннер проверок целостности, состав — см. ниже
  § «Проверки целостности монорепо»); там же ⚠️ обратная сторона: пин, поставленный как фикс
  бага, JSON объяснить не может — `deps update` снимает его как любую отставшую версию (так
  вернулось падение прод-сборки, §142), причины намеренных пинов живут в
  `scripts/intentional-pins.json` и сверяются gate-проверкой `intentional-pins` ·
  [nested-package-resolution-under-bun-isolated-installs](/.claude/docs/nested-package-resolution-under-bun-isolated-installs.md)
  ⚠️ голый `import('@foo/bar')` от скрипта в `scripts/` не резолвит транзитивную зависимость чужого
  пакета под изолированной установкой bun, хотя она есть в `bun.lock` — фикс: `createRequire` от
  уже резолвленного entry-файла пакета-родителя, не от своего местоположения ·
  [shared-get-client-ip-consolidation](/.claude/docs/shared-get-client-ip-consolidation.md)
  консолидация дубля «последний хоп x-forwarded-for» (aboi + `@letar/demo-protection`) в
  `getClientIpFromHeaders`; третья копия в driving-school (`api-logger.ts`) осознанно оставлена
  отдельной — другой контракт возврата и доп. заголовок `cf-connecting-ip` ·
  [lib-consumer-missing-lib-dom](/.claude/docs/lib-consumer-missing-lib-dom.md) ⚠️ барабанный
  реэкспорт библиотеки (`@letar/hooks`) затягивает в `tsc --build` потребителя чужие файлы с
  `window`/`StorageEvent` — падает не на своих исходниках, а на файле, который потребитель
  вообще не импортирует напрямую; фикс — `"dom"` в `lib` потребителя, не в библиотеке-источнике

**MCP-серверы:** [mcp-servers](/.claude/docs/mcp-servers.md) состав и назначение ·
[mcp-server-pattern](/.claude/docs/mcp-server-pattern.md) тонкий локальный сервер по stdio ·
[mcp-sse-bridge](/.claude/docs/mcp-sse-bridge.md) мост stdio-процесс ↔ открытая страница ·
[mcp-tool-handler-testing-pattern](/.claude/docs/mcp-tool-handler-testing-pattern.md) тест
инструментов через настоящий `Client` + `InMemoryTransport`, не рефлексию по приватным полям
`McpServer` — невалидные аргументы дают `isError: true`, не `throw` ·
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md) баги координации: contact
approval, kebab-case в `to`, обнулённая база

**База данных и ZenStack:** [database](/.claude/docs/database.md) ·
[seed-scripts](/.claude/docs/seed-scripts.md) идемпотентный `prisma/seed.ts` ·
[zenstack-decimal-optional-fields](/.claude/docs/zenstack-decimal-optional-fields.md) optional
`Decimal` не принимает `number` ·
[zenstack-typed-interface-json-snapshot](/.claude/docs/zenstack-typed-interface-json-snapshot.md)
именованный `interface` без index signature не проходит в `Json`-поле, фикс —
`JSON.parse(JSON.stringify(...))` ·
[zenstack-nullable-json-field-null-sentinel](/.claude/docs/zenstack-nullable-json-field-null-sentinel.md)
⚠️ nullable `Json`-поле не принимает JS `null` — `invalid_union`-ошибка Zod указывает на
посторонние поля, фикс — `JsonNull` из `@zenstackhq/orm` ·
[zenstack-public-write-read-back](/.claude/docs/zenstack-public-write-read-back.md) публичный
`@@allow('create')` не даёт прочитать запись назад ·
[zenstack-generated-prisma-client](/.claude/docs/zenstack-generated-prisma-client.md) лишний
`generator client` — не признак дрейфа схемы ·
[zenstack-view-unused-preview-feature](/.claude/docs/zenstack-view-unused-preview-feature.md)
`view`-конструкция (SQL VIEW прямо в ZModel) — preview-фича, в монорепо пока не используется ни
разу, миграции под неё ZenStack не генерирует ·
[zenstack-v3-orm-error-codes](/.claude/docs/zenstack-v3-orm-error-codes.md) ⚠️ `error.dbErrorCode`
(сырой `SQLSTATE`, `23505`), не Prisma-код `P2002` — classic `@prisma/client` в других
приложениях монорепо ловит иначе, не путать ·
[zenstack-self-only-user-policy-staff-picker](/.claude/docs/zenstack-self-only-user-policy-staff-picker.md)
⚠️ self-only read-политика `User` (`auth().id == this.id`) молча режет список сотрудников до одной
записи в любом staff-lookup под enhanced-клиентом — фикс сырым `prisma`; `studio` отмечен как
кандидат на перепроверку при появлении non-owner staff-роли ·
[zenstack-required-relation-nested-select-null](/.claude/docs/zenstack-required-relation-nested-select-null.md)
⚠️ обязательная relation через nested `select` под более узкой policy связанной модели тихо
резолвится в `null` вместо ошибки — краш на `.id` только на конкретных данных (черновик рядом с
опубликованной записью), плюс `take` считает по родителю и съедает слоты лимита на отфильтрованных
null-строках ·
[zenstack-relation-traversal-fk-repoint-bypass](/.claude/docs/zenstack-relation-traversal-fk-repoint-bypass.md)
⚠️ relation-traversal в `@@allow`/`@@deny` (`parent.status == DRAFT` и т.п.) проверяет текущее
состояние связи, а не то, на что FK переставляется в том же `update()` — обход immutability
опубликованной/терминальной записи; защита только field-level `@deny('update', true)` на самом FK ·
[tree-model-parent-select](/.claude/docs/tree-model-parent-select.md) self-referencing `parentId` ·
[zenstack-append-only-terminal-event-pattern](/.claude/docs/zenstack-append-only-terminal-event-pattern.md)
append-only лог событий без статусного поля — терминальность через общий unique `idempotencyKey`
(TOCTOU-safe на `INSERT`, не на предварительном `SELECT`); ловушка — не защищает нетерминальные
события того же лога, для них отдельный check-then-act ·
[zenstack-multifile-schema-circular-imports](/.claude/docs/zenstack-multifile-schema-circular-imports.md)
декомпозиция `schema.zmodel` на файлы — циклические импорты между ними подтверждённо рабочие,
единственная ловушка — `import` до `datasource`/`generator`/`plugin` ·
[zmodel-comment-directives-vs-ast](/.claude/docs/zmodel-comment-directives-vs-ast.md) `@meta`
field-атрибут (AST) vs `///`-комментарий (regex) — два независимых парсера в
`zenstack-form-plugin`, не один общий; почему объектный литерал ломает именно `@meta` (падает в
upstream-генераторе TS-схемы, `ObjectExpr` не поддержан), а comment-директиву — нет; почему
кодмод построчный, не AST-based ·
[zenstack-field-level-allow-does-not-narrow](/.claude/docs/zenstack-field-level-allow-does-not-narrow.md)
⚠️ field-level `@allow` только добавляет разрешение поверх модельной `@@allow`, не сужает —
сужение только через field-level `@deny`; найдено трижды подряд (`User.roles` privilege
escalation, `Payment.settlementId`, `DeliveryDiscrepancy`) ·
[precommit-hook-install-staleness](/.claude/docs/precommit-hook-install-staleness.md) ⚠️
установленный pre-commit-хук — копия на момент последнего `install.sh`, не симлинк: новый скрипт
в `scripts/hooks/` (например `schema-migration-check`) не появляется в уже установленных
submodule сам; коммит без миграции schema.zmodel прошёл в domwellbes чисто, потому что хуки там
не переустанавливались 11 дней — на 2026-09-01 тот же дрейф ещё у `aboi`/`driving-school`/
`dsperevod`

**Формы, UI, компоненты:** [forms](/.claude/docs/forms.md) ⭐ ·
[react-duplicate-responsive-dom](/.claude/docs/react-duplicate-responsive-dom.md) ⚠️ два JSX-блока
на `display={{ base:/md: }}` с одинаковым интерактивным контентом — дубль в DOM, не адаптивность ·
[form-analytics-goals](/.claude/docs/form-analytics-goals.md) цели формы в Метрике/Umami через
`useFormAnalytics`, consent-aware бесплатно ·
[tristate-cascade-boolean-pattern](/.claude/docs/tristate-cascade-boolean-pattern.md) nullable
boolean с явным «наследовать» через строковый энум + NativeSelect ·
[letar-forms-field-date-runtime-string](/.claude/docs/letar-forms-field-date-runtime-string.md) ⚠️
`Field.Date` отдаёт string в onSubmit даже при `z.coerce.date()` — typecheck не ловит ·
[letar-forms-lazy-component-ssr-stuck-suspense](/.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md)
⚠️ `createLazyComponent` (TableEditor/DataGrid/RichText/extraSelects) вешал серверный Suspense —
раскрытие зависит от `requestAnimationFrame`, в скрытой/фоновой вкладке (headless e2e) не тикает ·
[letar-forms-lazy-component-eager-jsx-seed-crash](/.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md)
⚠️ JSX-элемент/иконка, созданные на верхнем уровне модуля (не в `render`), падают
`ReferenceError: React is not defined` под `tsx` (`nx db:seed`) — Next.js собирает JSX
автоматическим runtime независимо от `tsconfig`, `tsx`/esbuild под `"jsx": "preserve"` — нет ·
[letar-forms-post-submit-reset-stale-initialvalue](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md)
⚠️ пост-сабмит `reset(dataToSubmit)` снимает `isTouched` — следующий рендер со статическим
`initialValue` (не «что реально отправлено») перетирает поле, бьёт по любому полю, не только
select ·
[letar-forms-missing-i18nprovider-english-hints](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md)
⚠️ без `<FormI18nProvider locale="ru">` в дереве провайдеров подсказки валидации
(`z.string().min/max`) молча остаются на английском, хотя RU-локализация в библиотеке уже
реализована — ни typecheck, ни рендер без ошибок этого не покажут ·
[letar-forms-select-nullable-meta-options-lost](/.claude/docs/letar-forms-select-nullable-meta-options-lost.md)
⚠️ `Field.Select` без явного `options` на поле, обёрнутом в `.nullable().optional()` (стандартный
вывод `@letar/zenstack-form-plugin` для nullable enum) — резолвер не разворачивает
`ZodNullable`/`ZodOptional` перед поиском `.meta()`, дропдаун рендерится пустым, хотя значение
хранится и сабмитится корректно ·
[ui-components](/.claude/docs/ui-components.md) · [images](/.claude/docs/images.md) ·
[font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md) описание
шрифта на сайте лжёт — покрытие символов проверять разбором `cmap` файла; для Node-стека
монорепо — fontkit+subset-font (чтение cmap из woff2 и сам субсеттинг, не только верификация) ·
[sharp-raw-composite-alpha-pitfall](/.claude/docs/sharp-raw-composite-alpha-pitfall.md) ⚠️
`composite()` над raw-буферами тихо добавляет alpha-канал даже при `create({channels:3})` ·
[sharp-svg-textpath-not-rendered](/.claude/docs/sharp-svg-textpath-not-rendered.md) ⚠️
`<textPath>` не рендерится вовсе (0 закрашенных пикселей, без ошибки) — замена посимвольными
списками `x`/`y`/`rotate` на `<text>` ·
[gallery-pattern](/.claude/docs/gallery-pattern.md) Dropzone + SortablePhotoGrid ·
[period-navigation-pattern](/.claude/docs/period-navigation-pattern.md) навигация по периоду без JS ·
[data-flag-driving-ui](/.claude/docs/data-flag-driving-ui.md) ⚠️ `isDemo`/`isDraft` попал в условие
рендера — контент демо-записи не виден никогда ·
[content-block-edit-gate-not-wired](/.claude/docs/content-block-edit-gate-not-wired.md) ⚠️ кнопка
редактирования секции контента рядом с блоком не доказывает, что блок реально читает то, что она
пишет — проверять грепом по использованию ключей в JSX, не визуальным соседством ·
[faceted-catalog-pitfalls](/.claude/docs/faceted-catalog-pitfalls.md) фасетные фильтры каталога ·
[raf-vs-timers-background-tab](/.claude/docs/raf-vs-timers-background-tab.md) ⚠️ `rAF` замирает в
фоновой вкладке, `setTimeout`/`setInterval` там душится до раза в секунду/минуту — выбор не
взаимозаменяем ·
[react-use-transition-initial-pending-race](/.claude/docs/react-use-transition-initial-pending-race.md)
⚠️ `useTransition().isPending` синхронно `false` до первого тика эффекта — окно между монтированием
и стартом `startTransition` внутри `useEffect`, где `data===null` и `isPending===false`
одновременно; ловится только там, где эффект (не клик) триггерит `startTransition` ·
[sticky-actionbar-cookiebanner-zindex-race](/.claude/docs/sticky-actionbar-cookiebanner-zindex-race.md)
⚠️ на короткой странице без скролла `StickyActionBar` (position:sticky) может ещё не «застрять» и
стоять в потоке у нижнего края — там же, где `position:fixed` CookieBanner с выше zIndex,
перехватывает клик по CTA; firefox/webkit чувствительнее chromium к font-metrics разнице

**Данные и состояние:** [data-fetching](/.claude/docs/data-fetching.md) ·
[tanstack-query-client-recreated-per-render](/.claude/docs/tanstack-query-client-recreated-per-render.md)
⚠️ `createQueryClient()` в теле провайдера (было во всех трёх провайдерах
`@letar/query-provider`) выдаёт новый пустой клиент на каждый ре-рендер, а провайдер стоит в
layout — его перерисовывает любая мягкая навигация и любой `revalidatePath` из server action;
снаружи выглядит как «первое действие применилось, следующие молча не доехали до экрана» при
исправно отработавшем сервере, фикс — `useState(() => …)`, сторож — тест по исходникам
библиотеки; там же смежная ловушка: `mutationFn` поверх server action, отвечающего
`{ error }` значением, обязан бросать — иначе откат оптимистичной правки не срабатывает ·
[pwa-offline](/.claude/docs/pwa-offline.md) ·
[serwist-turbopack-stale-sw-artifact](/.claude/docs/serwist-turbopack-stale-sw-artifact.md) ⚠️
`@serwist/next` работает только с webpack, а `public/sw.js` в `.gitignore` — собрал приложение
Turbopack'ом (голый `next build` вместо `next build --webpack` из `project.json`), и отдаётся
протухший воркер прошлой сборки: регистрируется, навсегда виснет в `installing`, `unregister()`
на нём не резолвится; выглядит как сломанный оффлайн-режим приложения. Там же — `register: false`
у `withSerwistInit`: по умолчанию Serwist сам регистрирует воркер на каждой странице в обход
консент-гейта ·
[serwist-domwellbes-webpack-build-blocked](/.claude/docs/serwist-domwellbes-webpack-build-blocked.md)
⚠️ `next build --webpack` (обязателен для `@serwist/next`) у `domwellbes` падает по двум
независимым причинам — OOM на дефолтном лимите памяти V8 и `ContextError` ChakraProvider на
`/_global-error` при поднятом лимите; Serwist оттуда откачен, реализован только `manifest.ts`
(installable app shell без офлайн-кеша) ·
[react-effect-stable-ref-pitfall](/.claude/docs/react-effect-stable-ref-pitfall.md) эффект с deps на
ref/DOM не перезапускается ·
[route-announcer-persistent-layout-required](/.claude/docs/route-announcer-persistent-layout-required.md)
⚠️ `RouteAnnouncer` молча не объявляет ни одной навигации, если подключён не в persistent
`layout.tsx`, а в per-page-компонент

**Next.js — ловушки:**
[nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md) миграция
с deprecated `composePlugins`/`withNx` (`@nx/next`) на голый `next.config` + явный
`transpilePackages` ·
[transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md)
⭐ точка входа по теме `transpilePackages` — прочие доки ссылаются сюда за механизмом.
⚠️ ловушка обратного направления: для `@letar/*` работает **наличие** ключа `transpilePackages`
(снимает `include: [dir]`), а не перечисленные в нём имена — bun линкует либы симлинком на
`libs/`, реальный путь без `node_modules`, проверка по списку до них не доходит; отсутствие
записи о конкретном пакете ничего не ломает (доказано зелёной сборкой с `['@letar/ui']`),
а удаление ключа целиком ломает сразу; красный гейт `check-transpile-packages` = разъехался
список, а не сломалась прод-сборка ·
[nextron-renderer-transpile-packages-required](/.claude/docs/nextron-renderer-transpile-packages-required.md)
⚠️ прежний claim «`transpilePackages` для `@letar/*` обязателен и в nextron-рендерере
(`animatrona`)» опровергнут причинной проверкой 2026-09-03 — сборка зелёная и без ключа вовсе;
существующий список трогать не нужно (безвреден), но обязательным не является ·
[nextjs-standalone-tracing](/.claude/docs/nextjs-standalone-tracing.md)
ECONNREFUSED/ERR_DLOPEN_FAILED при зелёном билде ·
[nextjs-build-time-oidc-discovery-network-dependency](/.claude/docs/nextjs-build-time-oidc-discovery-network-dependency.md)
⚠️ `nx build` hub-client приложения (kami/time/aprel8008/domwellbes) эagerly бьёт в сеть на OIDC
discovery ещё на этапе `betterAuth()` — не баг `@letar/auth`, архитектура плагина `genericOAuth`;
не путать с параллельным сетевым сбоем на совсем другом хосте в том же логе ·
[nextjs-server-action-redirect-race](/.claude/docs/nextjs-server-action-redirect-race.md) ·
[nextjs-server-action-decimal-serialization](/.claude/docs/nextjs-server-action-decimal-serialization.md)
«Only plain objects can be passed to Client Components» ·
[nextjs-static-export-rsc-paths](/.claude/docs/nextjs-static-export-rsc-paths.md) ·
[nextjs-ssr-browser-only-libs](/.claude/docs/nextjs-ssr-browser-only-libs.md) `self is not defined` ·
[nextjs-dynamic-ssr-false-still-server-compiled](/.claude/docs/nextjs-dynamic-ssr-false-still-server-compiled.md)
⚠️ `dynamic(ssr:false)` не исключает модуль из server-резолва импортов (RSC client reference) —
несовпадение `"node"`/`"browser"` exports транзитивной зависимости всё равно валит билд; лечится
не пином версии (пин пережил неделю и был снят обычным `deps update`), а сравнением с
`process.env.NODE_ENV` на верхнем уровне модуля — бандлер выбрасывает мёртвую ветку вместе с
поддеревом; ложный след — «рассинхрон версий solid-js», хотя `use` отсутствует в SSR-сборке
любой версии ·
[webpack-only-app-silent-export-drift](/.claude/docs/webpack-only-app-silent-export-drift.md) ⚠️
15 приложений собираются `next build --webpack`, остальные Turbopack (до 2026-09-03 док утверждал
«auth-hub — единственное», затем «14» — само число устарело в тот же день); расхождения тихие —
предупреждение в логе + `undefined` в рантайме при `exit=0`, и этот лог дважды приняли за падение
сборки; список считать `grep -l 'next build --webpack' apps/*/project.json`, не по памяти ·
[nextjs16-turbopack-default-emotion-hydration](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)
⚠️ Turbopack по умолчанию + Chakra `<Global>` → hydration mismatch, флаки в e2e ·
[turbopack-private-submodule-root](/.claude/docs/turbopack-private-submodule-root.md) «Could not find
the Next.js package» ·
[nextjs-rsc-aspectratio-children-only](/.claude/docs/nextjs-rsc-aspectratio-children-only.md) ⚠️
`AspectRatio` в Server Component → 500, но страница визуально ОК ·
[ssr-hydration-persisted-state](/.claude/docs/ssr-hydration-persisted-state.md) ⚠️ чтение
localStorage/cookie в инициализаторе `useState` — не ошибка гидратации в консоли, а тихо
неработающий клик ·
[nextjs-public-env-build-time-inlining](/.claude/docs/nextjs-public-env-build-time-inlining.md) ⚠️
`NEXT_PUBLIC_*` литералом в `docker-compose.yml` не попадает в клиентский бандл — нужен `.env.docker` ·
[nextjs-root-notfound-no-root-layout](/.claude/docs/nextjs-root-notfound-no-root-layout.md) ⚠️
корневой `not-found.tsx` без `app/layout.tsx` сам рендерит `<html>/<body>` — дублирование тега,
hydration mismatch на невалидном сегменте локали ·
[nextjs-streaming-soft-404-loading-boundary](/.claude/docs/nextjs-streaming-soft-404-loading-boundary.md)
⚠️ `notFound()` отдаёт 200 вместо 404, если выше по дереву есть любой `loading.tsx` — один
корневой `app/loading.tsx` делает soft-404 из всего сайта, точечное удаление у маршрута не
помогает; воспроизводится и на прод-сборке, смягчено автоматическим `noindex` от Next ·
[nextjs-compound-component-server-boundary](/.claude/docs/nextjs-compound-component-server-boundary.md)
⚠️ compound-экспорт (`Object.assign`) для клиентского компонента не резолвится через границу
Server→Client — property-access ломается, `undefined`; тот же класс бьёт по **обычной
константе** из `'use client'`-модуля (объект с именами событий аналитики резолвился в
`undefined` в серверном компоненте, событие уходило с пустым именем) ·
[nextjs-revalidatepath-outside-request-scope](/.claude/docs/nextjs-revalidatepath-outside-request-scope.md)
⚠️ `revalidatePath` из функции, переиспользуемой в фоновой задаче (`@letar/jobs`) без request
scope — Invariant вместо обновления кеша ·
[nextjs-client-page-metadata-wrapper](/.claude/docs/nextjs-client-page-metadata-wrapper.md)
`'use client'`-страница + `export const metadata` несовместимы на одном файле — разбить на
server-обёртку `page.tsx` + `page.client.tsx` ·
[nextjs-metadata-inheritance-canonical-trap](/.claude/docs/nextjs-metadata-inheritance-canonical-trap.md)
⚠️ страница без своей `metadata` наследует `canonical` **главной** от корневого layout; связка
«canonical на главную + noindex» опаснее отсутствия обоих, снимается только явным `null`
(`undefined` наследование не убирает, а `languages: null` не компилируется); `alternates`
заменяется целиком — своя `canonical` молча теряет унаследованный `hreflang`; в aboi так стояли
24 маршрута из ~50 (авторизация, админка, личный кабинет) ·
[nextjs-favicon-icon-tsx-both-needed](/.claude/docs/nextjs-favicon-icon-tsx-both-needed.md) ⚠️
`icon.tsx` не заменяет `favicon.ico` — боты/краулеры бьют в корень мимо `<head>`; вместе они дают
два тега `link[rel~="icon"]`, подмена href первого найденного молча не работает ·
[nextjs-react19-hoistable-link-mutation-pitfall](/.claude/docs/nextjs-react19-hoistable-link-mutation-pitfall.md)
⚠️ мутация/удаление React-управляемого `<link>`/`<meta>` (hoistable-ресурс Next float API)
нестабильна — чужой ре-рендер где угодно в дереве молча вставляет дубль поверх; не воспроизводится
на dev, только на прод-сборке ·
[nextjs-intl-setrequestlocale-ssg](/.claude/docs/nextjs-intl-setrequestlocale-ssg.md) ⚠️
`setRequestLocale` только в корневом `[locale]/layout.tsx` не хватает для SSG — нужен в каждом
`page.tsx`; но сначала проверь, не форсит ли динамику Dynamic API выше по дереву (found: studio,
mandala — реальный фикс; aboi, kami, time, archetest — ложная тревога, динамика легитимна) ·
[nextjs-intl-matcher-metadata-routes](/.claude/docs/nextjs-intl-matcher-metadata-routes.md) ⚠️
next-intl matcher не ловит `icon`/`apple-icon`/`opengraph-image`/`twitter-image` — эти роуты
отдаются без расширения в URL независимо от расширения файла-источника (`.svg`/`.png`/`.tsx`
одинаково), нужно явное перечисление через `@letar/i18n-proxy`; ручной аудит по «есть расширение
у файла — уже отфильтровано» дважды дал ложноотрицательный результат (kami, time, aboi) ·
[vitest-server-action-request-scope-apis](/.claude/docs/vitest-server-action-request-scope-apis.md)
⚠️ server action, вызванный напрямую под vitest (минуя HTTP) — `headers()`/`revalidatePath()` вне
request-scope бросают, мокать оба модуля; `redirect()` безопасен сам по себе, но 12 приложений
глобально мокают `next/navigation` без него в `vitest.setup.tsx` — нужен `importOriginal` или
проверка `.digest` подстрокой

**Chakra v3 — ловушки:** [chakra-css-memo-prop-order-hydration](/.claude/docs/chakra-css-memo-prop-order-hydration.md)
⚠️ кеш `css()` считает ключ по отсортированным ключам объекта (регрессия 3.29.0), а результат
зависит от порядка — один и тот же `<Text>` получает разные классы emotion на сервере и клиенте,
«attributes didn't match» при визуально одинаковом CSS; не путать с багом Turbopack+Emotion ниже,
`--webpack` не помогает, чинится патчем зависимости — а сам патч прибит к точной версии, и bun
при её расхождении молчит (код 0, ни строки), поэтому bump без
`bun scripts/check-patched-deps.mjs` тихо возвращает баг во все приложения ·
[chakra-multi-system-ssr-barrel-trap](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md) ⚠️
импорт шрифта/константы из барреля с `createSystem()` в Server Component исполняет весь модуль и
роняет SSR (`accordionAnatomy.extendWith is not a function`) ·
[chakra-strict-tokens-global-typegen](/.claude/docs/chakra-strict-tokens-global-typegen.md) ⚠️
`strictTokens` пишет типы в `node_modules/@chakra-ui/react` — не per-app флаг, ломает typecheck
всех приложений монорепо ·
[chakra-hover-condition-already-media-gated](/.claude/docs/chakra-hover-condition-already-media-gated.md)
⚠️ `_hover` в Chakra v3 уже завёрнут в `@media (hover: hover)` — своя обёртка лишняя и даёт
28 ошибок TS2322 в строках, к которым не прикасался ·
[interactive-press-feedback](/.claude/docs/interactive-press-feedback.md) ⚠️ `_active` со сжатием
на 1% — состояние формально есть, глазу его нет; глубина берётся от `_active` кнопки того же
масштаба в теме приложения; там же — резолв стиля через `system.css()` вместо браузера ·
[chakra-layer-style-property-allowlist](/.claude/docs/chakra-layer-style-property-allowlist.md)
⚠️ `LayerStyleProperty` — закрытый список: `touchAction`, `transitionDuration` и прочее вне его
роняют весь `value` в ветку реестра токенов, TS2322 на каждой строке блока при исправном рантайме ·
[chakra-recipe-variant-property-override](/.claude/docs/chakra-recipe-variant-property-override.md)
⚠️ в своём `defineRecipe`/`defineSlotRecipe` порядок ключей в JS не совпадает с порядком CSS-
каскада — `textStyle` тихо перебивает соседний `fontSize`, вариантный `_hover` наследуется мимо
`base._hover` ·
[pressable-overflow-clips-focus-ring](/.claude/docs/pressable-overflow-clips-focus-ring.md) ⚠️
`Pressable` из `@letar/ui` даёт `overflow: hidden` под ripple — обрезает focus ring обёрнутой
кнопки, если их прямоугольники совпадают; `getComputedStyle` на кнопке врёт, свойство применено,
но не отрисовано ·
[admin-table-horizontal-overflow](/.claude/docs/admin-table-horizontal-overflow.md) ⚠️
`Table.Root` без `Table.ScrollArea` раздвигает **весь документ**, а не прокручивается сам —
на телефоне читается как «поехала вёрстка»; lint/typecheck/тесты зелёные, на десктопе не видно,
ширина зависит от данных, поэтому «на dev нормально» ничего не доказывает; в studio разъезжались
4 страницы из 12 (до 777px при экране 375px), там же скрипт аудита и почему его нельзя запускать
через Bash-тул на Windows ·
[theme-hardcode-gate-coverage](/.claude/docs/theme-hardcode-gate-coverage.md) гейт сырых
цветов/теней/transition (`theme:check`) — на 2026-09-03 у четырёх приложений (`aboi`, `dashboard`,
`domwellbes`, `studio`), считать `grep -rl '"theme:check"' apps/*/project.json`, не `git grep`
(три из четырёх — submodule); до 2026-09-03 и док, и эта строка утверждали «только у одного
приложения из ~30», хотя сам док ниже описывал три; слепые зоны и структурные отличия (нет
`src/theme/` у части приложений) — почему тиражирование через generator всё ещё не закрыто ·
[chakra-semantic-token-contract](/.claude/docs/chakra-semantic-token-contract.md) ⚠️ стоковые
рецепты Chakra читают `bg.panel`/`fg.error`/`border.control`/`l1..l3`/`colorPalette.*` напрямую —
не переопределил в своих `semanticTokens` → холодные цвета мимо палитры и провал WCAG AA; замер
«14 из 15 приложений с темой пробел не закрыли» — на 2026-08-19, каталог `src/theme` сейчас у 16
приложений (`ls -d apps/*/src/theme`), кто из них закрыл контракт после того замера — не
перепроверялось ·
[chakra-typegen-shared-node-modules-race](/.claude/docs/chakra-typegen-shared-node-modules-race.md)
⚠️ `theme:typegen` пишет в общий физический файл `node_modules/@chakra-ui/react` — параллельный
`theme:typegen` другого приложения молча откатывает кастомные recipe-варианты, `typecheck:tsgo`
падает на незатронутых файлах; фикс — `nx theme:typegen <app> --skip-nx-cache` перед коммитом ·
[chakra-overflow-wrap-not-inherited](/.claude/docs/chakra-overflow-wrap-not-inherited.md) ⚠️
`overflow-wrap`/аналогичное CSS-свойство на предке не наследуется потомком, для которого Chakra
reset (`preflight`) уже задаёт своё явное значение — фикс только через `'& *'` на предке ·
[chakra-heading-defaults-to-h2](/.claude/docs/chakra-heading-defaults-to-h2.md) ⚠️ `Heading` —
`withContext("h2")`, без `asChild`+`<h1>` страница может не иметь ни одного настоящего `<h1>`;
ни lint, ни typecheck, ни глаз на скриншоте это не покажет ·
[chakra-aschild-multiple-children-silent-drop](/.claude/docs/chakra-aschild-multiple-children-silent-drop.md)
⚠️ `asChild` с двумя и более детьми — `.find(isValidElement)` молча берёт только первого, второй
пропадает без единой ошибки в typecheck/lint/консоли; ловится только живым кликом в браузере ·
[chakra-icon-as-prop-cleanup-pattern](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md)
рецепт чистки семгреп-запрета `as=` (`Icon as=`, `Link as={Component}`, `Box/Heading/Text
as="строка-тега"`) — четыре сессии независимо изобрели один и тот же паттерн ·
[header-drawer-dedup-audit](/.claude/docs/header-drawer-dedup-audit.md) 7 реализаций Header+Drawer
между приложениями — общий `libs/ui`-примитив не заводить (разные оси расходятся по-настоящему),
но 3 файла ролевых шапок внутри grandslamcup — реальный дубль, кандидат на локальное извлечение

**Библиотеки и публикация:** [lib-entry-points](/.claude/docs/lib-entry-points.md) подпути
`./server`/`./client`, границы, ESLint-ловушки ·
[fumadocs-core-staticsource-config-indexed-access-inference](/.claude/docs/fumadocs-core-staticsource-config-indexed-access-inference.md)
⚠️ `loader()` из `fumadocs-core/source` откатывает `page.data`/`meta.data` до базовых
`PageData`/`MetaData` — `Config` в `StaticSource<Config>` достижим только через индексный доступ,
`infer` его не восстанавливает; не версия-специфично, не tsgo-специфично; обход — явный
`as unknown as LoaderOutput<...>` с типом `docs.docs[number]` ·
[npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md) внутренние `@letar/*` — только
в `devDependencies` · [vitest-alias-prefix-matching](/.claude/docs/vitest-alias-prefix-matching.md)
alias матчится по префиксу ·
[vitest-unlinked-workspace-lib-imports](/.claude/docs/vitest-unlinked-workspace-lib-imports.md) ⚠️
`@letar/*`-либа только в `implicitDependencies` (без bun-симлинка) не резолвится под vitest ·
[vitest-shared-singleton-row-race](/.claude/docs/vitest-shared-singleton-row-race.md) ⚠️ общая
singleton-строка настроек (`ShopSettings` и аналоги) — редкий флак под полным прогоном из-за
файлового параллелизма vitest на общей dev-БД, не внутри одного файла ·
[vitest-serializable-transaction-cross-file-flake](/.claude/docs/vitest-serializable-transaction-cross-file-flake.md)
⚠️ соседний, но другой класс — Postgres SSI абортирует `40001` даже без пересечения данных между
файлами, чем больше spec-файлов с `Serializable`-транзакциями параллельно, тем чаще; не гонка за
строку, фикс не нужен, `--fileParallelism=false` детерминированно зелёный ·
[ci-real-postgres-unit-test-isolation](/.claude/docs/ci-real-postgres-unit-test-isolation.md)
unit-тест с настоящими (не замоканными) запросами к БД в CI — `services.postgres` +
именованная БД на приложение + `vitest.config.mts` `test.env` (спредится последним поверх
`process.env`, реально перебивает job-level `DATABASE_URL`, в отличие от dotenv-каскада Nx) ·
[hardcoded-unique-lookup-key-test-race](/.claude/docs/hardcoded-unique-lookup-key-test-race.md) ⚠️
функция ищет запись по захардкоженному значению `@unique`-поля (ключ шаблона, `slug`, `code`) —
параллельные spec-файлы вынуждены делить один ряд БД; фикс — сделать значение опциональным
параметром с дефолтом на production-константу ·
[zod-computed-key-index-access-pitfall](/.claude/docs/zod-computed-key-index-access-pitfall.md) ⚠️
`z.object({...Object.fromEntries(arr.map(...))})` — динамический ключ ловит TS7053 не всегда,
зависит от формы callback'а, а не от структуры массива ключей ·
[eslint-flat-react-typescript-missing-react-hooks-plugin](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md)
⚠️ `nx.configs['flat/react-typescript']` не регистрирует `eslint-plugin-react-hooks` — правило
`exhaustive-deps`/`rules-of-hooks` не проверялось ни в одном из ~22 приложений с этим паттерном
(ревизия 2026-08-19); **починено централизованно** — плагин зарегистрирован в корневом
`eslint.config.mjs`, приложения получают его через `...baseConfig` ·
[dotenv-agent-targeted-tip-and-skill-files](/.claude/docs/dotenv-agent-targeted-tip-and-skill-files.md)
⚠️ пакет `dotenv` печатает в stdout случайную "tip"-строку, одна из которых ведёт на сторонний
домен и адресована ИИ-агентам ("auth for agents"), плюс кладёт свои `SKILL.md` в пакет —
легитимный мейнтейнер, не supply-chain compromise, действие не требуется

**Тесты и форматирование:** [e2e-testing](/.claude/docs/e2e-testing.md) ·
[playwright-testmatch-absolute-path-regex-anchor](/.claude/docs/playwright-testmatch-absolute-path-regex-anchor.md)
⚠️ якорный `RegExp` (`^`) в `testMatch`/`testIgnore` матчится против абсолютного пути файла, не
относительно `testDir` — никогда не совпадает, чинится glob-строкой ·
[unit-testing](/.claude/docs/unit-testing.md) ⚠️ обязательный `tsconfig.spec.json` ·
[dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md) ⚠️ dprint не видит
границ worktree/submodule ·
[dprint-format-project-scope-not-file-scope](/.claude/docs/dprint-format-project-scope-not-file-scope.md)
⚠️ `--projects` не даёт файловой гранулярности — `format` внутри проекта задевает весь submodule,
включая чужие незакоммиченные правки ·
[dprint-windows-bin-shim-missing](/.claude/docs/dprint-windows-bin-shim-missing.md) ⚠️ пропавший
`node_modules/.bin/dprint.exe` при целом пакете — чинит `bun install`; резолвер
pre-commit-хука не видел `.exe`-shim на Windows ·
[dprint-eslint-curly-conflict](/.claude/docs/dprint-eslint-curly-conflict.md) `--fix` и `fmt`
откатывают друг друга ·
[dprint-typescript-nested-aschild-comment-instability](/.claude/docs/dprint-typescript-nested-aschild-comment-instability.md)
⚠️ `Formatting not stable` — комментарий перед JSX на третьем уровне вложенных `Box asChild` ·
[dprint-markdown-table-reformat](/.claude/docs/dprint-markdown-table-reformat.md) ⚠️ dprint
пересчитывает ширину столбцов при каждом прогоне — `Edit` по соседней строке таблицы падает на
«верном» тексте ·
[prettier-dprint-conflict-root-cause](/.claude/docs/prettier-dprint-conflict-root-cause.md) ⚠️
голая `nx format` — это Prettier, не dprint; `NX_SKIP_FORMAT` её не гасит

**Деплой и инфраструктура:** [deployment](/.claude/docs/deployment.md) ·
[verification-pitfalls](/.claude/docs/verification-pitfalls.md) ⭐ проверки, которые врут в
успокаивающую сторону ·
[dev-session-screenshot-bypass](/.claude/docs/dev-session-screenshot-bypass.md) ⚠️ живая проверка
страницы за admin-гейтом, когда Browser tool отказывается передать `DEV_SESSION_TOKEN` —
Playwright-скрипт через Bash вместо navigate/UI-логина ·
[verification-pitfalls § getComputedStyle при скрытой панели](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-сервер-getcomputedstyle-врёт-при-скрытой-панели-браузера)
⚠️ анимируемое свойство читается как тождественная матрица — выглядит как «эффект не работает» ·
[verification-pitfalls § заголовки HTML не говорят про статику](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-отдельный-запрос-заголовки-html-ответа-не-говорят-ничего-про-статику)
⚠️ `content-encoding` HTML-ответа не доказывает сжатие `.js`/`.css` — проверять по типу контента ·
[verification-pitfalls § состояние живёт в процессе](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-артефакт-состояние-живёт-в-процессе-а-не-в-бандле)
⚠️ холодный `next start` не воспроизводит баг, потому что кеш процесса заполняет сама проверяемая
страница — прогревать другими маршрутами, иначе «на проде не воспроизводится» ложно ·
[verification-pitfalls § grep по копиям репо](/.claude/docs/verification-pitfalls.md#обратный-случай-рекурсивный-grepgrep-по-рабочему-дереву-врёт-в-тревожную-сторону--копии-репозитория-в-claudeworktrees)
⚠️ единственный раздел документа с обратным направлением вранья — рекурсивный поиск заходит в
`.claude/worktrees/` (копии репо фоновых агентов) и кеш Nx, показывая давно исправленные проблемы
как живые; фикс — `git grep` или явное исключение этих каталогов ·
[verification-pitfalls § git grep и приватные submodule](/.claude/docs/verification-pitfalls.md#парный-к-предыдущему-git-grep-врёт-в-успокаивающую-сторону--он-не-заходит-в-приватные-submodule)
⚠️ зеркало предыдущего пункта — `git grep` не заходит в submodule (gitlink, не каталог) и
недосчитывает аудиты вида «у скольких приложений есть X»; для покрытия — рекурсивный `grep` с
исключением `.claude/worktrees`/`.nx`, прецедент — `theme:check` (1 вместо 4) ·
[docker-bind-mount-pitfalls](/.claude/docs/docker-bind-mount-pitfalls.md) ⚠️
`compose up -d` не перечитывает смонтированный конфиг ·
[docker-bare-bun-workspace-deps](/.claude/docs/docker-bare-bun-workspace-deps.md) ·
[alpine-cdn-unreachable-s3](/.claude/docs/alpine-cdn-unreachable-s3.md) ⚠️ с s3 нет пути до
`dl-cdn.alpinelinux.org` вообще (ни IPv4, ни IPv6, ни с хоста, ни из контейнера) при рабочих
GitHub/npm/registry — `apk add` в сборке падает, фикс — зеркало; там же ловушка диагностики:
`nc` на s3 не установлен и даёт ложный FAIL на любом адресе ·
[docker-prune-cold-layer-network-flake](/.claude/docs/docker-prune-cold-layer-network-flake.md)
⚠️ ночной `pruneBuilder()` без фильтра сносит build cache целиком (`ACTIVE 0` при 76GB) —
первый деплой каждого приложения после 04:00 идёт в сеть и ловит `TLS: unspecified error` на
`apk add`; чинится `COPY --from` вместо установки пакета, а не настройками buildkit ·
[deploy-affected-cache-invalidation](/.claude/docs/deploy-affected-cache-invalidation.md)
⚠️ деплой был холодным по трём независимым причинам (typecheck 67 либ без кэша, `rm -rf .next`
поверх persistent cache Turbopack, `rm -rf .nx/cache` после каждого git pull); предупреждения
`vitest.config.ts` в логе — шум на 17 секунд, а не признак пересчёта графа ·
[deploy-engine-rollout-proxy-kind-autodetect](/.claude/docs/deploy-engine-rollout-proxy-kind-autodetect.md)
⚠️ `libs/deploy-engine` rollout ронял `nginx-reload-1`/`stop-old`/`rm-old` на 19 из 20
rollout-приложений после перехода s2/s3 на Traefik — per-app label `letar.proxy-kind` не
поспевал за одномоментной сменой прокси на уровне сервера; фикс — автоопределение
(`detectProxyKind`) по факту запущенных контейнеров, а не по label ·
[dotenvx-stdout-migration-pollution](/.claude/docs/dotenvx-stdout-migration-pollution.md) P3018 ·
[external-services-blocked-from-s2](/.claude/docs/external-services-blocked-from-s2.md) ·
[dashboard-agent-alert-debounce-patterns](/.claude/docs/dashboard-agent-alert-debounce-patterns.md) ·
[server-provision](/.claude/docs/server-provision.md) · [server-recovery](/.claude/docs/server-recovery.md) ·
[server-migration-letar](/.claude/docs/server-migration-letar.md) архив переезда ·
[firewall](/.claude/docs/firewall.md) ⚠️ `ufw` не фильтрует порты Docker ·
[backup-architecture](/.claude/docs/backup-architecture.md) ·
[secret-manager](/.claude/docs/secret-manager.md) SOPS + age ·
[sops-env-encrypt-input-path-matching](/.claude/docs/sops-env-encrypt-input-path-matching.md) ⚠️
`sops --encrypt --output <out> <in>` матчит `.sops.yaml` по пути `<in>`, не `<out>` — временный
plaintext с произвольным именем не совпадает с creation_rules; плюс dotenv vs бинарный формат
`.enc` требует разных флагов на decrypt/encrypt — рецепт `scripts/sops-env-set.sh` ·
[redis-security](/.claude/docs/redis-security.md) ·
[cron-endpoint-registration-checklist](/.claude/docs/cron-endpoint-registration-checklist.md) ⚠️
новый `/api/cron/*` требует три правки не в scope пишущего приложения (`CRON_SECRET`,
`dashboard-agent/cron.ts`, порт/host в `infra-config`) — иначе тихий 401 или ненайденный маршрут

**Прокси (`infra/`):** [nginx-proxy-manager](/infra/nginx-proxy-manager/README.md) ⛔ снят
и с s3 (2026-08-08), и с s2 (2026-08-31) — история, не текущее состояние ·
[acme-dns](/infra/acme-dns/README.md) ⭐ wildcard-TLS без API регистратора ·
[traefik](/infra/traefik/README.md) боевой на s2 и s3

**Безопасность и право:** [personal-data](/.claude/docs/personal-data.md) ⭐ 152-ФЗ, РКН, cookie ·
[upload-path-traversal](/.claude/docs/upload-path-traversal.md) почему `path.join`+`startsWith` не
защищают · [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) ⚠️ JSON-справочник
утёк в бандл; греп по имени ключа даёт ложноотрицательный результат ·
[advertising-law-boundaries](/.claude/docs/advertising-law-boundaries.md) ·
[tochka-acquiring-site-requirements](/.claude/docs/tochka-acquiring-site-requirements.md)

**Auth, профиль, админка:** [auth](/.claude/docs/auth.md) · [admin](/.claude/docs/admin.md) ·
[user-profile](/.claude/docs/user-profile.md) ·
[one-time-reveal-fragment-token-pattern](/.claude/docs/one-time-reveal-fragment-token-pattern.md)
одноразово-раскрываемая публичная ссылка (счета, договоры, приглашения): fragment-токен → POST →
scoped cookie, без утечки токена в лог/`Referer` ·
[better-auth-localhost-cookie-jar-collision](/.claude/docs/better-auth-localhost-cookie-jar-collision.md)
⚠️ cookie не различаются по порту — все dev-серверы монорепо делят один cookie-jar `localhost`;
`apps/dashboard` (единственное с `cookieCache.strategy: 'jwt'`) кладёт в общий
`better-auth.session_data` JWT, и любое другое приложение падает 500 на
`Invalid Base64 character: .` (ветка `compact` в better-auth без try/catch, ветка `jwt` — с ним);
⚠️ ложный след «1.7 сменила формат cookieCache» опровергнут сверкой с 1.6.0…1.6.29, и ещё —
падение требует ОБА cookie сразу, поэтому «воспроизвелось в чистом контексте без cookie»
технически невозможно; прод не затронут (host-only cookie, разные домены), риск вернёт только
включение `crossSubDomainCookies` ·
[better-auth-1.7-oidc-provider-removed](/.claude/docs/better-auth-1.7-oidc-provider-removed.md) ⚠️
`bun update` в пределах `^1.6.x` поднимает better-auth до 1.7 — `oidcProvider`/`genericOAuthClient`
убраны из ядра, замена — `@better-auth/oauth-provider` + `jwt()`-плагин, клиент — `signIn.social` ·
[better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md) ⚠️
тот же релиз тихо требует поле `issuer` в модели `Account`, проверка идёт в памяти рантайма
(`sign-in.mjs`) — затронуты 14 приложений и обычный вход, не только sign-up/reset-password;
фикс двухчастный (add-column + отдельный backfill), коммит миграции ≠ её применение на проде ·
[better-auth-oauth-provider-schema-drift](/.claude/docs/better-auth-oauth-provider-schema-drift.md)
⚠️ `@better-auth/oauth-provider` держит свою полную схему БД (`dist/*.mjs` `src/schema.ts`),
только `oauthClient` замаппен на `oauthApplication` — `oauthConsent`/`oauthAccessToken` ищутся
по буквальному имени модели, несовпадение полей после миграции `a8efcc72` дало 7-слойный
прод-инцидент SSO (2026-08-26); тот же `oauthClient` отдельно недосчитался 4 logout-полей
(`enableEndSession` без дефолта отдавал 401 всем клиентам) плюс путь `/oauth2/endsession` вместо
`/oauth2/end-session` маскировал первопричину у всех 8 hub-client приложений (2026-08-27) ·
[runtime-invariant-missing-from-select](/.claude/docs/runtime-invariant-missing-from-select.md)
⚠️ класс бага: зависимость сравнивает в памяти поле, отсутствующее в схеме/`NULL` у старых строк —
не исключение, не отличимо в логах от легитимного отказа, typecheck не видит новый рантайм-
инвариант ·
[better-auth-vk-id-migration-and-linksocial-pitfalls](/.claude/docs/better-auth-vk-id-migration-and-linksocial-pitfalls.md)
⚠️ VK принудительно перевёл Standalone-приложения на VK ID (OAuth 2.1) — legacy
`oauth.vk.com`/`.ru` отвечает `Security Error` независимо от PKCE, фикс — нативный
`socialProviders.vk`; отдельно `linkSocial()` тихо не привязывает провайдера без email без
`allowDifferentEmails`, и `account_already_linked_to_different_user` — не баг, а дубль-аккаунт в БД ·
[better-auth-prismaadapter-zenstack-incompatibility](/.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md)
⚠️ `prismaAdapter()` требует нативный `PrismaClient` — ZenStack ORM-клиент (Kysely под капотом)
несовместим, любой `/api/auth/*` падает 500 без единой строки в логах; фикс — отдельный
`lib/prisma.ts`, найдено и починено в 5 приложениях (mandala, domwellbes, svoichuzhie, dsperevod,
studio)

**Электрон и десктоп:** [electron-app-protocol](/.claude/docs/electron-app-protocol.md) ⚠️ origin
`null` под `file://` блокирует Worker и WASM ·
[animatrona-dual-build-alias-drift](/.claude/docs/animatrona-dual-build-alias-drift.md) ⚠️
`apps/animatrona/main/` собирается webpack (`animatrona:build`) и esbuild
(`animatrona-main:build`) независимо, каждый со своим списком `@letar/*`-алиасов
(`webpack.config.js` `resolve.alias` vs `tsconfig.json` `paths`) — новый `@letar/*`-импорт
требует правки обоих файлов, иначе одна из двух сборок молча/непредсказуемо ломается ·
[electron-version-drift](/.claude/docs/electron-version-drift.md) точная версия electron в
каждом приложении расходится с диапазоном корневого `package.json` без единой ошибки сборки —
проверка `scripts/check-electron-drift.sh` ·
[electron-net-fetch-tun-vpn](/.claude/docs/electron-net-fetch-tun-vpn.md) ⚠️ `net.fetch` падает под
TUN-VPN; DNS-проверки с рабочей машины врут ·
[electron-sqlite](/.claude/docs/electron-sqlite.md) ·
[react-native-087-breaking-changes](/.claude/docs/react-native-087-breaking-changes.md) ⚠️ миграция
RN 0.85→0.87: пути codegen-типов, `PressableStateCallbackType` interface→type ломает declaration
merging без ошибки компиляции, и другие TS-грабли ·
[android-agp9-windows-toolchain-pitfalls](/.claude/docs/android-agp9-windows-toolchain-pitfalls.md)
⚠️ AGP 9.0+ built-in Kotlin конфликтует с явным `org.jetbrains.kotlin.android` (обход —
`android.builtInKotlin=false`) · Windows `ninja.exe` из NDK не читает `LongPathsEnabled`, лимит
260 символов игнорирует системную настройку, обход — `subst` на короткую букву диска

**Медиа, почта, звук:** [media-server](/.claude/docs/media-server.md) · [email](/.claude/docs/email.md) ·
[transactional-email-cron-pattern](/.claude/docs/transactional-email-cron-pattern.md) паттерн
cron-рассылок: найти кандидатов → отправить → пометить дедуп-поле; транзакционное письмо vs
маркетинг с консент-гейтом ·
[imapflow-error-listener-hang-pitfall](/.claude/docs/imapflow-error-listener-hang-pitfall.md) ⚠️
слушателя `'error'` у `ImapFlow` достаточно, чтобы не уронить процесс, но не достаточно, чтобы
гарантировать возврат из зависшего `await` — нужен внешний `Promise.race` с жёстким дедлайном ·
[web-push](/.claude/docs/web-push.md) ·
[offlineaudiocontext-suspend-render-race](/.claude/docs/offlineaudiocontext-suspend-render-race.md)

**Продукт и контент:** [ecommerce-cart-orders](/.claude/docs/ecommerce-cart-orders.md) ·
[ecommerce-cart-orders § Anonymous-сессии](/.claude/docs/ecommerce-cart-orders.md#7-anonymous-сессии-better-auth-anonymous-plugin--новая-per-user-модель-требует-двух-согласованных-правок)
⚠️ новая per-user модель, доступная гостю (Better Auth `anonymous` plugin) — нужен и
анонимно-инклюзивный геттер сессии в её actions, и явный перенос в merge-функции при регистрации;
пропуск любого не ловится typecheck/lint ·
[payment-webhook-idempotency-pattern](/.claude/docs/payment-webhook-idempotency-pattern.md)
уникальный ID события + select-then-create + guard по терминальному статусу; расхождение aboi
(только status-guard, без таблицы событий) — не образец для переноса ·
[idempotency-key-terminal-transition-pattern](/.claude/docs/idempotency-key-terminal-transition-pattern.md)
unique `idempotencyKey` (`proposal-terminal:<id>`, `contract-issued:<id>`) + try/catch на append-only
event-sourced переходе — не путать с select-then-create для внешних вебхук-событий выше ·
[client-idempotency-key-order-creation](/.claude/docs/client-idempotency-key-order-creation.md)
третий вариант — сущность ещё не существует, ключ не детерминирован (client-generated uuid в
sessionStorage), fast-path findUnique + try/catch на настоящую гонку двойного клика/back/reload ·
[pessimistic-row-lock-capacity-race-pattern](/.claude/docs/pessimistic-row-lock-capacity-race-pattern.md)
четвёртый вариант — не дубль запроса одного актора, а гонка РАЗНЫХ акторов за последние единицы
общего ограниченного ресурса (capacity/quota); idempotencyKey её не видит — нужен
`SELECT ... FOR UPDATE` внутри той же транзакции, что и проверка вместимости ·
[external-provider-fake-pattern](/.claude/docs/external-provider-fake-pattern.md) интерфейс +
fake-реализация для внешнего сервиса, поставщик которого ещё не выбран (10 контуров domwellbes) —
деградация vs пропуск по настройке, грабля вечно-успешного fake ·
[scraper-source-health-detector-pattern](/.claude/docs/scraper-source-health-detector-pattern.md)
детектор тихой поломки scraping/sync-источника (пусто-после-непустого, падение доли извлечённых
значений, замороженные значения) — эскалация DEGRADED→DISABLED через два подряд подозрительных
прогона ·
[animatrona-db-manifest-dual-source](/.claude/docs/animatrona-db-manifest-dual-source.md) ⚠️ CID в БД
побеждает свежий CID из манифеста ·
[paginated-web-source-reading](/.claude/docs/paginated-web-source-reading.md) чтение источника на
десятки страниц

**Правила репозитория:** [public-repo-hygiene](/.claude/rules/public-repo-hygiene.md) ⭐ что нельзя
писать в публичные файлы · [time-tracking](/.claude/rules/time-tracking.md) ⚠️ когда стартовать и
останавливать таймер studio · [formatting](/.claude/rules/formatting.md) ⚠️ голая `nx format`
молча зашита на Prettier — не падает, не то же самое, что `nx run-many -t format`

## Быстрый старт

**Приложения:** Используй MCP `nx_workspace` для списка приложений и портов. Подробнее: [environment](/.claude/docs/environment.md)

### Структура репо

`letar` — **публичный** монорепо. 10 приватных приложений/lib подключены через **git submodules** (aboi, driving-school + db + e2e, premium-rosstil + e2e, imot + e2e, dsperevod). Подробнее: [repo-structure](/.claude/docs/repo-structure.md).

**Клонирование с приватными:** `git clone --recurse-submodules git@github.com:kamiletar/letar.git`

**Работа с submodule:** изменяешь код → коммит/пуш внутри submodule → `git add <path> && git commit -- <path>` в letar для фиксации SHA.

**Git hooks (установить один раз после клонирования):**

```bash
bash scripts/hooks/install.sh
```

Ставит связку из пяти pre-commit хуков и одного pre-push:

- `pre-commit-scope-guard.sh` — блокирует голый `git commit`/`git add -A`, затянувший файлы из
  нескольких несвязанных `apps/*`/`libs/*`: типовая причина, по которой один агент коммитит чужую
  незакоммиченную работу другого. Обход для легитимных multi-scope коммитов —
  [git.md § Работа рядом с другими агентами](/.claude/rules/git.md).
- `pre-commit-semgrep.sh` — статический анализ безопасности по staged-файлам.
- `pre-commit-dprint-check.sh` — блокирует коммит файлов не в стиле dprint (например после
  случайного Prettier-форматирования голой `nx format`).
- `pre-commit-deps-integrity.sh` — целостность зависимостей (патчи + peer-диапазоны), запускается
  **только** если в staged-наборе есть `bun.lock`/`package.json`; обычный коммит по коду не платит
  ничего. См. раздел «Проверки целостности» ниже.
- `pre-commit-sops.sh` — авто-шифрует `.env.docker` → `.env.docker.enc`, если доступен sops +
  age-ключ; подробнее — [secret-manager](/.claude/docs/secret-manager.md).
- `pre-push-submodule-check.sh` — блокирует push letar, если записанный SHA submodule ещё не
  существует на его origin. Такой push ломает **не приложение-виновника, а весь деплой сразу**
  (`upload-pack: not our ref` внутри `git submodule update` — до выбора приложения). Обход —
  `GIT_ALLOW_UNPUSHED_SUBMODULES=1 git push`; проверить руками —
  `bash scripts/check-submodule-push-state.sh`. Разбор —
  [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).

### Проверки целостности монорепо

Проверки в `scripts/check-*` (патчи зависимостей, peer-диапазоны, намеренные пины версий,
дрейф electron, subpath-пути `@letar/*`, шаблоны `.gitignore` в submodule, неотправленные
коммиты submodule, брошенные worktree) собраны под общий раннер — актуальный состав всегда
у `--list`, не по этому списку:

```bash
bun scripts/check-all.mjs
```

`--list` — реестр с уровнями, `--group=deps` — подмножество, `--only=<id>` — точечно, `--ci` —
режим CI. Уровень **gate** роняет прогон, **warn** (накопленный долг) и **отчёт** — нет; до
2026-08-28 это различие существовало только в комментариях внутри самих скриптов.

Запускается автоматически в двух точках: pre-commit (узко — см. `pre-commit-deps-integrity.sh`
выше) и шаг `Integrity checks` в [ci.yml](/.github/workflows/ci.yml).

⚠️ **Зелёный CI на этих проверках ≠ зелено везде.** Приватные submodule в CI намеренно не
выкачиваются, поэтому `electron-drift` не видит `poster-microtext-desktop`, а `lib-subpath-paths` —
tsconfig приватных приложений. Раннер печатает «неполное покрытие» вместо того, чтобы молча
зеленеть на отсутствующих файлах ([verification-pitfalls](/.claude/docs/verification-pitfalls.md)),
но полное покрытие даёт только локальный прогон.

⚠️ **Не добавляй submodule пути в `.gitignore`** — Nx уважает gitignore и спрячет проекты из графа.

### Релиз npm-пакетов

Локально: `nx release` (bump + changelog + commit + tag + GitHub release) → `git push --follow-tags`. CI на тег (`forms-v*`, `form-mcp-v*`, `zenstack-form-plugin-v*`) запускает [publish-npm.yml](/.github/workflows/publish-npm.yml) — npm publish напрямую из letar.

### Технологический стек

- **Node:** 24 | **Монорепо:** Nx 22 | **Фреймворк:** Next.js 16 | **React:** 19
- **UI:** Chakra UI v3 | **БД:** PostgreSQL + Prisma + ZenStack | **Формы:** @letar/forms + Zod v4
- **Тесты:** Vitest 4.0, Playwright | **Линтинг:** oxlint + ESLint | **Формат:** dprint | **PM:** Bun

### Методология

- **TDD:** Red → Green → Refactor
- **Планирование:** Веди `PLAN.md` и `PLAN_TESTING.md` в каждом приложении. Если просят сделать что-то, чего нет в PLAN.md — сразу заноси. Когда сделал — отмечай выполненным
- **Коммиты:** Делай автоматически после готовых изменений. Подними версию в package.json
- **Shared-first:** При написании любого компонента, хука или утилиты — сразу оценивай, нужно ли это другим приложениям. Если да — создавай в `libs/` и экспортируй через `@letar/*`, а не дублируй в `apps/`.
- **Не создавай новые приложения/библиотеки руками:** `nx g @letar/generators:new-app <name>` (чистый Next.js + Chakra v3 каркас, без boilerplate, который потом вычищаешь) и `nx g @letar/generators:new-lib <name>` — см. `libs/generators/README.md`.
- **Документируй:** Найденные особенности добавляй в `.claude/docs/`. **Превентивно обновляй существующие doc-файлы** когда поведение системы изменилось, и **создавай новые** когда появился значимый паттерн/решение которого ещё нет в docs — не жди явного запроса. Это касается в том числе **UI/UX паттернов**: компонентов Chakra UI, паттернов форм, анимаций, адаптивной вёрстки, accessibility-решений. После изменения doc-файла добавь ссылку в раздел «Документация» этого файла если её ещё нет.

**Перед коммитом:** `nx run-many -t format --projects=<твои проекты>` → `nx lint` → `nx typecheck:tsgo`

⚠️ **`nx run-many -t format` без `--projects` заходит внутрь семи приватных submodule-приложений**
(aboi, aprel8008, domwellbes, driving-school, dsperevod, studio, svoichuzhie — 2089 файлов).
Их таргет `format` запускает dprint с `cwd` внутри submodule, а `excludes` корневого
`dprint.json` в таком запуске не применяются — они сопоставляются относительно каталога конфига,
а обход идёт от `cwd`. С 2026-08-06 у каждого submodule свой `dprint.json` с теми же правилами,
поэтому прогон даёт **ноль изменений** — но файлы он всё равно трогает. Поэтому голая форма без
`--projects`/`--exclude` **блокируется хуком** `.claude/hooks/validate-bash.js`; там же блокируется
встроенная команда Nx для форматирования (она запускает Prettier мимо dprint). Список проектов с
таргетом — `nx show projects --with-target format`. Прогон по всему публичному репо, если
действительно нужен, — `dprint fmt` из корня: у него `cwd` в корне, поэтому `excludes` работают.
Замер и разбор — [dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md).

⚠️ Это НЕ то же самое, что голое `nx format` (без `run-many -t`) — та встроенная команда Nx
запускает Prettier, конфликтующий с dprint (правки друг друга откатывают, ломает markdown в
плановых файлах). Названия таргета `format` и встроенной команды `nx format` совпадают случайно —
не перепутай синтаксис. dprint — единственный форматтер репозитория (PLAN-INFRA.md §32, закрыт
2026-08-06; переопределения таргета на Prettier дочищены 2026-08-06, см. там же).

⚠️ **Утверждение «dprint — единственный форматтер» держится на содержимом `targets.format` в
каждом `project.json`, а не на `nx.json`.** `targetDefaults` в Nx **дополняет** уже объявленный
таргет и **не создаёт** его — поэтому проект со своим блоком `targets.format` может запускать что
угодно, и `nx run-many -t format` это послушно выполнит. Прецедент: три библиотеки (`forms`, `ui`,
`zenstack-form-plugin`) держали там `prettier --write` и при первом же прогоне переписали 480
файлов из dprint-стиля в Prettier-стиль. Собственного `.prettierrc` у них не было — Prettier
работал на дефолтах, поэтому расхождение было максимальным.

Отсюда два следствия:

- **Заводишь проекту свой `targets.format` — команда только `dprint fmt`** (конвенция: `cwd` =
  корень проекта, `cache: false`). Удалить блок «чтобы подхватился `targetDefaults`» нельзя —
  таргет исчезнет из проекта совсем.
- **Проверка «форматтер один» — грепом по `project.json`, а не прогоном `dprint check`.** Файлы
  могут быть зелёными просто потому, что чужой таргет давно не запускали.

⚠️ `lint` автоматически запускает oxlint первым (fast-fail), затем ESLint. `typecheck:tsgo` в 9-38x быстрее обычного typecheck.

**Окружение:** Windows (нативный), `nx` и `bun` глобальные (❌ НЕ `bunx nx`/`npx nx`). При передаче аргументов в underlying tool: `nx e2e app-e2e -- --project=chromium`

**MCP серверы:** nx-mcp, next-devtools, chakra-ui, **form-mcp**, **deploy-mcp**, context7, context-mode (плагин), agent-mail, **postgres-\*** (driving-school, kami, grandslamcup, studio), studio-time-mcp, synth-mcp. Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md)

⚠️ **Ревизия 2026-08-10: состав серверов сокращён с 23 до 15 по фактической статистике вызовов**
(подсчёт по 487 транскриптам сессий). Удалены `socraticode`, `letar-consultant`, `prisma`,
`sequential-thinking`, `inkeepMcp`, `playwright`, `postgres-kami-prod-write`, дубли `context-mode`
и `context7`. Прежде чем возвращать что-то из этого списка — проверь, что инструмент будет
вызываться, а не просто числиться. Браузерная работа идёт через встроенный Claude Browser,
семантический поиск — через Grep и субагента Explore.

**Postgres MCP Pro:** dev-базы `studio` и `driving-school` подключены флагом `--pro` у
`.claude/mcp/pg-wrapper.mjs` — вместо одного `query` доступны EXPLAIN, health-checks и подбор
индексов (9 инструментов). Подбор индексов пока не работает: нужны расширения `pg_stat_statements`
и `hypopg`, см. [PLAN-INFRA-4 §71](/PLAN-INFRA-4.md).

⚠️ **`nx-mcp` запускается с `--minimal false`.** По умолчанию флаг `--minimal` у сервера равен
`true`, и он прячет ровно те инструменты, ради которых его ставят: `nx_workspace`,
`nx_project_details`, `nx_workspace_path`, `nx_generators`, `nx_generator_schema`,
`nx_available_plugins` — остаются только `nx_docs` и три `ci_*`. Именно поэтому за 487 сессий
`nx_workspace` не был вызван ни разу: инструмента просто не было в списке, хотя инструкция его
требовала. Если увидишь, что workspace-инструменты снова пропали, — проверь этот флаг, а не
инструкцию.

**⚠️ WebFetch заблокирован context-mode:** хук `pretooluse.mjs` блокирует `WebFetch` и перенаправляет на `mcp__context-mode__fetch_and_index(url, source)` + `mcp__context-mode__search(queries)`. Используй именно эти инструменты для загрузки внешних URL.

### Координация агентов (MCP Agent Mail)

**ОБЯЗАТЕЛЬНО:** При начале работы вызови `macro_start_session` — подробности в `.claude/rules/agent-mail.md`. Без регистрации другие агенты не увидят тебя и могут конфликтовать по файлам.

**Context Mode:** Автоматически сжимает вывод MCP (98% экономия). Команды: `/context-mode:stats`, `/context-mode:doctor`, `/context-mode:upgrade`. Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md#context-mode)

**Артефакты (скриншоты, экспорты, временные файлы):** Сохраняй в `.claude/artifacts/` — папка в .gitignore, не засоряет git status. Используй `save_to_disk` с путём в эту папку.

**Комментарии в коде пиши на русском языке** — все комментарии, JSDoc, описания и пояснения в коде.

**⛔ Запрещены `export default`** — используй только именованные экспорты (`export function`, `export const`). **Исключения:** Next.js App Router файлы (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`).

**Критичные импорты:**

```typescript
// Формы — @letar/forms (ЕДИНСТВЕННЫЙ рекомендуемый подход)
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
// Валидация — Zod v4
import { z } from 'zod/v4'
// Генерируемые файлы — src/generated/
import { GenderFormSchema } from '@/generated/form-schemas/enums/Gender.form'
// ZenStack v3 — enhanced клиент из lib/db
import { getEnhancedPrisma } from '@/lib/db'
```

> Полный список импортов см. [Формы и валидация](/.claude/docs/forms.md)

**Воркфлоу:** Редактируй `schema.zmodel` → `nx zenstack:generate` → `nx db:push`. См. [База данных](/.claude/docs/database.md).

**Формы:** `schema.zmodel` `@meta("form.*", value)` (основной синтаксис с Фазы 3, v3.0.0; legacy `/// @form.*`-комментарии всё ещё работают, но deprecated) → `nx zenstack:generate` → `createForm()` инстанс → `form-mcp` MCP → `@letar/forms`. Каждое приложение **ОБЯЗАНО** иметь свой `createForm` инстанс (образец: `driving-school`). Если фичи нет — делегируй через agent-mail (`.claude/rules/form-delegation.md`). ⚠️ **Перед работой прочитай** `libs/forms/README.md`.

**Data Fetching:** Гибридный подход — React 19 хуки для форм, TanStack Query для списков. См. [Data Fetching](/.claude/docs/data-fetching.md).

**Мультитенантность:** `driving-school` — эталон реализации Better Auth Organizations + ZenStack access policies. См. `.claude/skills/zenstack-helper/reference/zenstack-better-auth.md`.

**Команды:** `nx dev|build|test|lint|format|typecheck:tsgo <app>`, `nx zenstack:generate|db:push|db:migrate|db:studio <app>`, `nx e2e <app>-e2e`. Подробнее: [environment](/.claude/docs/environment.md)

---

**Обновлено:** 2026-09-03 | **Nx** 23.2 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
