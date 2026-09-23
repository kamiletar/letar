# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Общайся со мной на русском

## Документация

Доки — в `.claude/docs/`. Ниже карта: строка на док. Развёрнутая аннотация с механизмом каждой
ловушки — в [.claude/docs/INDEX.md](/.claude/docs/INDEX.md), раздел с тем же названием. Берёшься
за незнакомую тему — открой там её раздел целиком, до первой правки.

⭐ — читать до начала работы в теме, ⚠️ — ловушка, которая выглядит как успех.

### Репозиторий и среда

- [repo-structure](/.claude/docs/repo-structure.md) ⭐ публичный монорепо + приватные submodules
- [environment](/.claude/docs/environment.md) приложения, dev-порты, команды
- [architecture](/.claude/docs/architecture.md) · [code-style](/.claude/docs/code-style.md)
- [documentation-guidelines](/.claude/docs/documentation-guidelines.md) как вести доки и этот индекс
- [plan-decomposition-pattern](/.claude/docs/plan-decomposition-pattern.md) когда резать разросшийся `PLAN.md`
- [tsconfig-presets](/.claude/docs/tsconfig-presets.md) общий пресет Next.js-приложений, `${configDir}`
- [agent-skills-mirror](/.claude/docs/agent-skills-mirror.md) зеркало `.claude/skills/` для Codex
- [nextjs16-agent-guide-files](/.claude/docs/nextjs16-agent-guide-files.md) `next dev` сам пишет `AGENTS.md`
- [llms-txt-pattern](/.claude/docs/llms-txt-pattern.md) `llms.txt`: статика vs роут, юридические запреты
- [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md) ⭐ почему правила git такие строгие; ⚠️ две сессии под одной identity + `Write` + смешанный индекс = коммит с непарсящимся файлом
- [semgrep-per-submodule-rules-pattern](/.claude/docs/semgrep-per-submodule-rules-pattern.md) кастомные правила для приватного submodule — в его собственном `.semgrep/`, не в корневом
- [semgrep-yaml-anchor-exclude-invalid](/.claude/docs/semgrep-yaml-anchor-exclude-invalid.md) ⚠️ YAML-якорь в `paths.exclude` ломает `--validate`, дублирование списков — не трогать
- [git-pathspec-commit-worktree-not-index](/.claude/docs/git-pathspec-commit-worktree-not-index.md) ⚠️ `commit -- <path>` берёт рабочее дерево, не индекс
- [nx-convert-to-inferred-scope-regression](/.claude/docs/nx-convert-to-inferred-scope-regression.md) ⚠️ генератор тихо меняет охват таргета
- [nx-target-without-executor-silent-noop](/.claude/docs/nx-target-without-executor-silent-noop.md) ⚠️ таргет без `executor` → `nx:noop`, «успех» за 21мс без тестов
- [nx-temp-build-dir-breaks-project-graph](/.claude/docs/nx-temp-build-dir-breaks-project-graph.md) ⚠️ временный distDir в `apps/` роняет граф у всех агентов
- [nx-vitest-plugin-worker-oom-shared-machine](/.claude/docs/nx-vitest-plugin-worker-oom-shared-machine.md) ⚠️ «Plugin worker exited» — это OOM, лечится `--max-old-space-size`
- [nextjs-build-worker-count-oom-shared-host](/.claude/docs/nextjs-build-worker-count-oom-shared-host.md) ⚠️ OOM на «Collecting page data», фикс — `experimental.cpus`
- [turbopack-build-filesystem-cache-oom](/.claude/docs/turbopack-build-filesystem-cache-oom.md) ⚠️ OOM на компиляции: сброшенный кеш Turbopack раздувает сборку кратно
- [turbopack-dev-stale-parse-error-next-cache](/.claude/docs/turbopack-dev-stale-parse-error-next-cache.md) ⚠️ фантомная ошибка парсинга переживает рестарт `next dev`, лечит `rm -rf .next`
- [nx-playwright-plugin-project-graph-race](/.claude/docs/nx-playwright-plugin-project-graph-race.md) ⚠️ гонка ESM-загрузчика, лечится повтором запуска
- [nx-e2e-implicit-deps-public-repo-private-app-exception](/.claude/docs/nx-e2e-implicit-deps-public-repo-private-app-exception.md) ⚠️ часть e2e намеренно без `implicitDependencies`
- [nx-cache-directory-env-not-isolated-by-cachedirectory](/.claude/docs/nx-cache-directory-env-not-isolated-by-cachedirectory.md) ⚠️ изоляция кеша требует и `NX_WORKSPACE_DATA_DIRECTORY`
- [nx-affected-source-based-inference](/.claude/docs/nx-affected-source-based-inference.md) `nx affected` видит импорты `@letar/*` и без `dependencies`
- [tsgo-stray-declarations](/.claude/docs/tsgo-stray-declarations.md) ⚠️ `.d.ts` рядом с исходником вместо `outDir`
- [tsgo-generic-default-param-inference](/.claude/docs/tsgo-generic-default-param-inference.md) ⚠️ generic-обёртка выводит `TArgs` как `unknown[]`
- [tsgo-excessive-stack-depth-zenstack](/.claude/docs/tsgo-excessive-stack-depth-zenstack.md) ⚠️ TS2321 на вложенных ZenStack-типах, три фикса
- [tsgo-tsc-stale-project-reference-redirect](/.claude/docs/tsgo-tsc-stale-project-reference-redirect.md) ⚠️ project-reference уводит на устаревший `.d.ts`
- [tsconfig-preset-rootdir-outdir-cascade](/.claude/docs/tsconfig-preset-rootdir-outdir-cascade.md) ⚠️ удаление `references` с унаследованным `outDir` — три побочных эффекта
- [vitest-setup-file-tsconfig-graph-gap](/.claude/docs/vitest-setup-file-tsconfig-graph-gap.md) ⚠️ `vitest.setup.ts` вне графа `references` валит все тесты либы разом
- [bun-lockfile-private-submodules](/.claude/docs/bun-lockfile-private-submodules.md) ⚠️ `--frozen-lockfile` падает без выкачанных submodule
- [bun-lock-drift-unpushed-commits-blocks-all-deploys](/.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md) ⚠️ lock ≠ версии (не запушено/не закоммичено) роняет ЛЮБОЙ деплой
- [bun-server-version-lockfile-format-incompatibility](/.claude/docs/bun-server-version-lockfile-format-incompatibility.md) ⚠️ старый bun на сервере блокирует все деплои разом
- [bun-install-stale-isolated-cache](/.claude/docs/bun-install-stale-isolated-cache.md) ⚠️ несколько версий в `.bun` — норма, чинит `--force`
- [bun-isolated-linker-alias-shared-bucket-collision](/.claude/docs/bun-isolated-linker-alias-shared-bucket-collision.md) ⚠️ npm-alias двух версий пакета резолвится в один bucket
- [bun-isolated-linker-shared-zod-bucket-drift](/.claude/docs/bun-isolated-linker-shared-zod-bucket-drift.md) ⚠️ обычный `bun update` развёл zod на два экземпляра
- [zod-per-package-pin-drift](/.claude/docs/zod-per-package-pin-drift.md) ⚠️ caret не дедупает с точным корневым пином
- [root-pin-peer-drift](/.claude/docs/root-pin-peer-drift.md) ⚠️ пин в корне тихо перебивается; намеренные пины — в `intentional-pins.json`
- [nested-package-resolution-under-bun-isolated-installs](/.claude/docs/nested-package-resolution-under-bun-isolated-installs.md) ⚠️ импорт из `scripts/` — только через `createRequire`
- [shared-get-client-ip-consolidation](/.claude/docs/shared-get-client-ip-consolidation.md) `getClientIpFromHeaders`, третья копия оставлена намеренно
- [lib-consumer-missing-lib-dom](/.claude/docs/lib-consumer-missing-lib-dom.md) ⚠️ баррель либы тянет чужие `window`-файлы в typecheck потребителя
- [webpack-emscripten-runtime-wasm-not-emitted](/.claude/docs/webpack-emscripten-runtime-wasm-not-emitted.md) ⚠️ `.wasm` не копируется, падает на пререндере
- [webpack-createrequire-resolve-nullified](/.claude/docs/webpack-createrequire-resolve-nullified.md) ⚠️ обратный случай: `createRequire()` переписан в `undefined`, `webpackIgnore` чинит половину
- [webpack-concatenatemodules-electron-updater-jsyaml-crash](/.claude/docs/webpack-concatenatemodules-electron-updater-jsyaml-crash.md) ⚠️ scope hoisting ломает `electron-updater`

### MCP-серверы

- [mcp-servers](/.claude/docs/mcp-servers.md) ⭐ состав и назначение (22 записи → 4, ревизия 2026-09-14)
- [mcp-server-pattern](/.claude/docs/mcp-server-pattern.md) тонкий локальный сервер по stdio
- [mcp-sse-bridge](/.claude/docs/mcp-sse-bridge.md) мост stdio-процесс ↔ открытая страница
- [mcp-tool-handler-testing-pattern](/.claude/docs/mcp-tool-handler-testing-pattern.md) тест через настоящий `Client`, не рефлексию
- [agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md) ⚠️ contact approval, kebab-case в `to`, обнулённая база

### База данных и ZenStack

- [database](/.claude/docs/database.md) ⭐ воркфлоу схемы и миграций
- [seed-scripts](/.claude/docs/seed-scripts.md) идемпотентный `prisma/seed.ts`
- [zenstack-decimal-optional-fields](/.claude/docs/zenstack-decimal-optional-fields.md) ⚠️ optional `Decimal` не принимает `number`
- [zenstack-int4-overflow-money-fields](/.claude/docs/zenstack-int4-overflow-money-fields.md) ⚠️ `Int`-копейки переполняют INT4 на реалистичных суммах, фикс — `BigInt` + границы конвертации
- [zenstack-typed-interface-json-snapshot](/.claude/docs/zenstack-typed-interface-json-snapshot.md) ⚠️ именованный `interface` не проходит в `Json`-поле
- [zenstack-nullable-json-field-null-sentinel](/.claude/docs/zenstack-nullable-json-field-null-sentinel.md) ⚠️ nullable `Json` не принимает JS `null` — нужен `JsonNull`
- [zenstack-public-write-read-back](/.claude/docs/zenstack-public-write-read-back.md) ⚠️ публичный `@@allow('create')` не даёт прочитать запись назад
- [zenstack-generated-prisma-client](/.claude/docs/zenstack-generated-prisma-client.md) лишний `generator client` — не признак дрейфа схемы
- [zenstack-view-unused-preview-feature](/.claude/docs/zenstack-view-unused-preview-feature.md) `view` — preview-фича, в монорепо не используется
- [zenstack-v3-orm-error-codes](/.claude/docs/zenstack-v3-orm-error-codes.md) ⚠️ `dbErrorCode` (`23505`), не Prisma-код `P2002`
- [zenstack-self-only-user-policy-staff-picker](/.claude/docs/zenstack-self-only-user-policy-staff-picker.md) ⚠️ self-only политика режет staff-lookup до одной записи
- [zenstack-required-relation-nested-select-null](/.claude/docs/zenstack-required-relation-nested-select-null.md) ⚠️ обязательная relation тихо резолвится в `null`
- [zenstack-relation-traversal-fk-repoint-bypass](/.claude/docs/zenstack-relation-traversal-fk-repoint-bypass.md) ⚠️ политика по relation не видит переставленный FK
- [zenstack-version-scoped-fk-immutable-pattern](/.claude/docs/zenstack-version-scoped-fk-immutable-pattern.md) ⚠️ FK на copy-on-write версию нужен `@deny` даже без условия в policy — иммутабельность держит только app-хелпер
- [zenstack-field-level-allow-does-not-narrow](/.claude/docs/zenstack-field-level-allow-does-not-narrow.md) ⚠️ field-level `@allow` только добавляет право, сужает лишь `@deny`
- [role-gate-vs-model-policy-drift](/.claude/docs/role-gate-vs-model-policy-drift.md) ⚠️ `requireRole` шире `@@allow` модели — отказ на записи вместо гейта
- [tree-model-parent-select](/.claude/docs/tree-model-parent-select.md) self-referencing `parentId`
- [zenstack-append-only-terminal-event-pattern](/.claude/docs/zenstack-append-only-terminal-event-pattern.md) append-only лог, терминальность через `idempotencyKey`
- [zenstack-multifile-schema-circular-imports](/.claude/docs/zenstack-multifile-schema-circular-imports.md) декомпозиция `schema.zmodel`, циклы рабочие
- [zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md) `libs/*.zmodel` между приложениями, ⚠️ гранулярность affected
- [zmodel-comment-directives-vs-ast](/.claude/docs/zmodel-comment-directives-vs-ast.md) `@meta` (AST) vs `///`-комментарий — два парсера
- [precommit-hook-install-staleness](/.claude/docs/precommit-hook-install-staleness.md) ⚠️ хук — копия на момент `install.sh`, новые скрипты сами не доезжают

### Формы, UI, компоненты

- [forms](/.claude/docs/forms.md) ⭐ `@letar/forms` — единственный подход к формам
- [react-duplicate-responsive-dom](/.claude/docs/react-duplicate-responsive-dom.md) ⚠️ два JSX-блока на `display={{base:/md:}}` — дубль в DOM
- [chakra-flexwrap-column-direction-overflow](/.claude/docs/chakra-flexwrap-column-direction-overflow.md) ⚠️ безусловный `flexWrap` при `direction: column` уводит элементы вбок
- [form-analytics-goals](/.claude/docs/form-analytics-goals.md) цели формы в Метрике/Umami через `useFormAnalytics`
- [tristate-cascade-boolean-pattern](/.claude/docs/tristate-cascade-boolean-pattern.md) nullable boolean с явным «наследовать»
- [letar-forms-tabs-error-pattern](/.claude/docs/letar-forms-tabs-error-pattern.md) ⚠️ ошибка на скрытой вкладке `Tabs.Content` невидима без `useFormErrorTab`
- [letar-forms-field-date-runtime-string](/.claude/docs/letar-forms-field-date-runtime-string.md) ⚠️ `Field.Date` отдаёт string в `onSubmit`, typecheck не ловит
- [letar-forms-lazy-component-ssr-stuck-suspense](/.claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md) ⚠️ зависший серверный Suspense, rAF не тикает в фоновой вкладке
- [letar-forms-lazy-component-eager-jsx-seed-crash](/.claude/docs/letar-forms-lazy-component-eager-jsx-seed-crash.md) ⚠️ JSX на верхнем уровне модуля падает под `tsx` (`db:seed`)
- [letar-forms-post-submit-reset-stale-initialvalue](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md) ⚠️ `reset()` снимает `isTouched` — статический `initialValue` перетирает поле
- [letar-forms-server-errors-errormap-onserver](/.claude/docs/letar-forms-server-errors-errormap-onserver.md) ⚠️ серверные ошибки писать в `errorMap.onServer`, не в `meta.errors`
- [letar-forms-missing-i18nprovider-english-hints](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md) ⚠️ без `FormI18nProvider` подсказки молча остаются английскими
- [letar-forms-select-nullable-meta-options-lost](/.claude/docs/letar-forms-select-nullable-meta-options-lost.md) ⚠️ nullable enum → пустой дропдаун, `.meta()` не найден
- [letar-forms-fieldprops-typed-tags-not-resolved](/.claude/docs/letar-forms-fieldprops-typed-tags-not-resolved.md) ✅ закрыто в v0.7.0 — история на случай регрессии
- [zenstack-form-meta-directive-pitfalls](/.claude/docs/zenstack-form-meta-directive-pitfalls.md) ⚠️ `@email` и `''`, слэши в `@regex`, `form.tooltip.*` — тихие ловушки директив
- [letar-forms-field-auto-fieldtype-drops-extra-props](/.claude/docs/letar-forms-field-auto-fieldtype-drops-extra-props.md) ⚠️ `Field.Auto` с `meta.ui.fieldType` молча теряет лишние пропсы
- [letar-forms-urlsync-missing-router-no-rsc-refetch](/.claude/docs/letar-forms-urlsync-missing-router-no-rsc-refetch.md) ⚠️ `UrlSync` без `router` — URL меняется, данные нет
- [letar-forms-field-date-urlsync-date-object](/.claude/docs/letar-forms-field-date-urlsync-date-object.md) ⚠️ `Field.Date` + `UrlSync`: поле навсегда «активно»
- [letar-forms-urlsync-window-read-in-render-hydration](/.claude/docs/letar-forms-urlsync-window-read-in-render-hydration.md) ⚠️ `window.location` в рендере хука — гидратация расходится с SSR
- [external-state-alongside-createform-pattern](/.claude/docs/external-state-alongside-createform-pattern.md) внешний `useState` рядом с формой — согласия 152-ФЗ, immediate-upload
- [ui-components](/.claude/docs/ui-components.md) ⭐ компоненты `@letar/ui`
- [form-footer-formactions](/.claude/docs/form-footer-formactions.md) футер формы — только `FormActions`, не `Flex` руками
- [images](/.claude/docs/images.md) · [upload-storage-backend](/.claude/docs/upload-storage-backend.md) `StorageBackend`, S3 не реализован
- [font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md) покрытие символов — разбором `cmap`, не описанием шрифта
- [nextjs-font-google-to-local-migration-pattern](/.claude/docs/nextjs-font-google-to-local-migration-pattern.md) `next/font/google`→`next/font/local`: скрипты, subset ДО instancer, что исключать
- [sharp-raw-composite-alpha-pitfall](/.claude/docs/sharp-raw-composite-alpha-pitfall.md) ⚠️ `composite()` тихо добавляет alpha-канал
- [sharp-svg-textpath-not-rendered](/.claude/docs/sharp-svg-textpath-not-rendered.md) ⚠️ `<textPath>` не рендерится вовсе, без ошибки
- [sharp-svg-font-family-ignored](/.claude/docs/sharp-svg-font-family-ignored.md) ⚠️ `font-family`/`@font-face` не влияют на растр — нужны контуры глифов
- [gallery-pattern](/.claude/docs/gallery-pattern.md) Dropzone + SortablePhotoGrid
- [period-navigation-pattern](/.claude/docs/period-navigation-pattern.md) навигация по периоду без JS
- [data-flag-driving-ui](/.claude/docs/data-flag-driving-ui.md) ⚠️ `isDemo`/`isDraft` в условии рендера — контент не виден никогда
- [content-block-edit-gate-not-wired](/.claude/docs/content-block-edit-gate-not-wired.md) ⚠️ кнопка рядом с блоком не доказывает, что блок читает её ключи
- [faceted-catalog-pitfalls](/.claude/docs/faceted-catalog-pitfalls.md) фасетные фильтры каталога
- [raf-vs-timers-background-tab](/.claude/docs/raf-vs-timers-background-tab.md) ⚠️ `rAF` замирает в фоновой вкладке, таймеры душатся
- [scrollintoview-smooth-frozen-without-window-focus](/.claude/docs/scrollintoview-smooth-frozen-without-window-focus.md) ⚠️ `scrollIntoView(smooth)` зависает навсегда без OS-фокуса окна — та же природа, что и `rAF`
- [react-use-transition-initial-pending-race](/.claude/docs/react-use-transition-initial-pending-race.md) ⚠️ `isPending` ещё `false`, когда данных уже нет
- [sticky-actionbar-cookiebanner-zindex-race](/.claude/docs/sticky-actionbar-cookiebanner-zindex-race.md) ⚠️ баннер перехватывает клик по CTA на короткой странице

### Данные и состояние

- [data-fetching](/.claude/docs/data-fetching.md) ⭐ React 19 хуки для форм, TanStack Query для списков
- [redis-pubsub-cross-replica-registry-pattern](/.claude/docs/redis-pubsub-cross-replica-registry-pattern.md) фабрика + узкий интерфейс + fake-брокер вместо sticky-сессий
- [tanstack-query-client-recreated-per-render](/.claude/docs/tanstack-query-client-recreated-per-render.md) ⚠️ клиент в теле провайдера — правки «не доезжают до экрана»
- [pwa-offline](/.claude/docs/pwa-offline.md) Serwist, офлайн-формы, очередь синхронизации
- [serwist-turbopack-stale-sw-artifact](/.claude/docs/serwist-turbopack-stale-sw-artifact.md) ⚠️ Serwist только с webpack, иначе отдаётся воркер прошлой сборки
- [serwist-domwellbes-webpack-build-blocked](/.claude/docs/serwist-domwellbes-webpack-build-blocked.md) ✅ снято 2026-09-22; ⚠️ `webpackBuildWorker` глохнет от своего же `webpack()`-хука
- [react-effect-stable-ref-pitfall](/.claude/docs/react-effect-stable-ref-pitfall.md) ⚠️ эффект с deps на ref/DOM не перезапускается
- [route-announcer-persistent-layout-required](/.claude/docs/route-announcer-persistent-layout-required.md) ⚠️ `RouteAnnouncer` вне persistent layout молчит
- [undo-toast-immediate-vs-deferred-commit-split](/.claude/docs/undo-toast-immediate-vs-deferred-commit-split.md) ⚠️ единый `onCommit`/`onUndo`-контракт не покрыл немедленный commit+restore, typecheck упал на чужом файле

### Next.js — ловушки

- [nextjs-nx-composeplugins-migration](/.claude/docs/nextjs-nx-composeplugins-migration.md) миграция с `composePlugins`/`withNx`
- [transpile-packages-array-presence-not-content](/.claude/docs/transpile-packages-array-presence-not-content.md) ⭐ точка входа по теме: работает наличие ключа, не список имён
- [nextron-renderer-transpile-packages-required](/.claude/docs/nextron-renderer-transpile-packages-required.md) ⚠️ прежний claim опровергнут — ключ не обязателен
- [electron-nextron-dual-tsconfig-paths-drift](/.claude/docs/electron-nextron-dual-tsconfig-paths-drift.md) ⚠️ два `tsconfig`: зелёный typecheck, красный билд
- [nextron-npx-next-build-windows-project-dir](/.claude/docs/nextron-npx-next-build-windows-project-dir.md) ⚠️ ручной `npx next build` на Windows резолвит project dir выше
- [nextjs-standalone-tracing](/.claude/docs/nextjs-standalone-tracing.md) ⚠️ ECONNREFUSED/ERR_DLOPEN_FAILED при зелёном билде
- [nextjs-stale-dotnext-types-tsgo-ts6305](/.claude/docs/nextjs-stale-dotnext-types-tsgo-ts6305.md) ⚠️ TS6305 от устаревшего `.next/types`, бисекция не ловит
- [nextjs-dynamic-fs-path-tracing](/.claude/docs/nextjs-dynamic-fs-path-tracing.md) ⚠️ рантайм-путь в `fs` утаскивает весь проект в standalone
- [nextjs-tracing-excludes-windows-backslash](/.claude/docs/nextjs-tracing-excludes-windows-backslash.md) ⚠️ `outputFileTracingExcludes` молча не работает при сборке под Windows — на проде (linux) работает
- [prisma-upsert-empty-update-build-race](/.claude/docs/prisma-upsert-empty-update-build-race.md) ⚠️ `P2002` на «Collecting page data» только на пустой БД: воркеры гоняются за создание singleton-строки
- [nextjs-build-time-oidc-discovery-network-dependency](/.claude/docs/nextjs-build-time-oidc-discovery-network-dependency.md) ⚠️ билд hub-клиента бьёт в сеть на OIDC discovery
- [nextjs-server-action-redirect-race](/.claude/docs/nextjs-server-action-redirect-race.md) гонка редиректа в server action
- [nextjs-server-action-decimal-serialization](/.claude/docs/nextjs-server-action-decimal-serialization.md) ⚠️ «Only plain objects can be passed»
- [nextjs-server-action-thrown-error-message-stripped](/.claude/docs/nextjs-server-action-thrown-error-message-stripped.md) ⚠️ текст `throw` из Server Action в production стирается — отказ возвращать значением
- [nextjs-static-export-rsc-paths](/.claude/docs/nextjs-static-export-rsc-paths.md) статический экспорт и пути RSC
- [nextjs-ssr-browser-only-libs](/.claude/docs/nextjs-ssr-browser-only-libs.md) ⚠️ `self is not defined`
- [nextjs-dynamic-ssr-false-still-server-compiled](/.claude/docs/nextjs-dynamic-ssr-false-still-server-compiled.md) ⚠️ `dynamic(ssr:false)` не исключает модуль из server-резолва
- [webpack-only-app-silent-export-drift](/.claude/docs/webpack-only-app-silent-export-drift.md) ⚠️ список webpack-приложений считать грепом, расхождения тихие
- [nextjs16-turbopack-default-emotion-hydration](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md) ⚠️ Turbopack + Chakra `<Global>` → hydration mismatch
- [turbopack-private-submodule-root](/.claude/docs/turbopack-private-submodule-root.md) ⚠️ «Could not find the Next.js package»
- [nextjs-rsc-aspectratio-children-only](/.claude/docs/nextjs-rsc-aspectratio-children-only.md) ⚠️ `AspectRatio` в Server Component → 500 при целой картинке
- [ssr-hydration-persisted-state](/.claude/docs/ssr-hydration-persisted-state.md) ⚠️ localStorage в инициализаторе `useState` — тихо неработающий клик
- [react19-svg-title-array-children-hydration](/.claude/docs/react19-svg-title-array-children-hydration.md) ⚠️ `<title>` с массивом children рвёт гидратацию и ломает соседние клики
- [nextjs-public-env-build-time-inlining](/.claude/docs/nextjs-public-env-build-time-inlining.md) ⚠️ `NEXT_PUBLIC_*` литералом в compose не попадает в бандл
- [nextjs-root-notfound-no-root-layout](/.claude/docs/nextjs-root-notfound-no-root-layout.md) ⚠️ дублирование `<html>` на невалидном сегменте локали
- [nextjs-streaming-soft-404-loading-boundary](/.claude/docs/nextjs-streaming-soft-404-loading-boundary.md) ⚠️ любой `loading.tsx` выше по дереву превращает 404 в 200
- [nextjs-compound-component-server-boundary](/.claude/docs/nextjs-compound-component-server-boundary.md) ⚠️ compound-экспорт и константы из `'use client'` резолвятся в `undefined`
- [nextjs-revalidatepath-outside-request-scope](/.claude/docs/nextjs-revalidatepath-outside-request-scope.md) ⚠️ Invariant в фоновой задаче без request scope
- [nextjs-client-page-metadata-wrapper](/.claude/docs/nextjs-client-page-metadata-wrapper.md) `'use client'` + `metadata` — разбить на server-обёртку
- [nextjs-metadata-inheritance-canonical-trap](/.claude/docs/nextjs-metadata-inheritance-canonical-trap.md) ⚠️ страница без своей `metadata` наследует canonical главной
- [nextjs-favicon-icon-tsx-both-needed](/.claude/docs/nextjs-favicon-icon-tsx-both-needed.md) ⚠️ `icon.tsx` не заменяет `favicon.ico`
- [nextjs-react19-hoistable-link-mutation-pitfall](/.claude/docs/nextjs-react19-hoistable-link-mutation-pitfall.md) ⚠️ мутация React-управляемого `<link>` нестабильна на проде
- [nextjs-intl-setrequestlocale-ssg](/.claude/docs/nextjs-intl-setrequestlocale-ssg.md) ⚠️ нужен в каждом `page.tsx`, но сперва проверь Dynamic API выше
- [nextjs-intl-matcher-metadata-routes](/.claude/docs/nextjs-intl-matcher-metadata-routes.md) ⚠️ matcher не ловит `icon`/`opengraph-image`, ручной аудит врёт
- [vitest-server-action-request-scope-apis](/.claude/docs/vitest-server-action-request-scope-apis.md) ⚠️ `headers()`/`revalidatePath()` вне request-scope бросают
- [react-pdf-hyphenate-esm-only-exports-tsx-seed-crash](/.claude/docs/react-pdf-hyphenate-esm-only-exports-tsx-seed-crash.md) ⚠️ `db:seed` + `@react-pdf/renderer`: два падения подряд

### Chakra v3 — ловушки

- [chakra-css-memo-prop-order-hydration](/.claude/docs/chakra-css-memo-prop-order-hydration.md) ⚠️ кеш `css()` даёт разные классы на сервере и клиенте; чинится патчем, патч прибит к версии
- [chakra-multi-system-ssr-barrel-trap](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md) ⚠️ импорт из барреля с `createSystem()` роняет SSR
- [chakra-strict-tokens-global-typegen](/.claude/docs/chakra-strict-tokens-global-typegen.md) ⚠️ `strictTokens` пишет типы в `node_modules` — не per-app флаг
- [chakra-hover-condition-already-media-gated](/.claude/docs/chakra-hover-condition-already-media-gated.md) ⚠️ `_hover` уже в `@media (hover: hover)`, своя обёртка даёт 28 ошибок TS
- [interactive-press-feedback](/.claude/docs/interactive-press-feedback.md) ⚠️ `_active` со сжатием на 1% — состояние есть, глазу его нет
- [press-scale-audit-task](/.claude/docs/press-scale-audit-task.md) общая формулировка задачи аудита `pressScale` — подключать ссылкой из `PLAN.md`
- [chakra-layer-style-property-allowlist](/.claude/docs/chakra-layer-style-property-allowlist.md) ⚠️ `LayerStyleProperty` — закрытый список, TS2322 на каждой строке блока
- [chakra-recipe-variant-property-override](/.claude/docs/chakra-recipe-variant-property-override.md) ⚠️ порядок ключей в JS ≠ каскад CSS
- [chakra-slot-recipe-array-merge-truncation](/.claude/docs/chakra-slot-recipe-array-merge-truncation.md) ⚠️ `slots` мержатся по индексу — короткий список вычёркивает слоты anatomy
- [pressable-overflow-clips-focus-ring](/.claude/docs/pressable-overflow-clips-focus-ring.md) ⚠️ `Pressable` обрезает focus ring, `getComputedStyle` врёт
- [theme-hardcode-gate-coverage](/.claude/docs/theme-hardcode-gate-coverage.md) гейт сырых цветов (`theme:check`), список считать грепом
- [chakra-semantic-token-contract](/.claude/docs/chakra-semantic-token-contract.md) ⚠️ стоковые рецепты читают `bg.panel`/`fg.error` — не переопределил, провалил WCAG
- [chakra-inverted-surface-color-contrast](/.claude/docs/chakra-inverted-surface-color-contrast.md) ⚠️ `Tooltip.Content` на `bg.inverted` — низкий контраст в одной теме
- [chakra-font-token-var-declaration-scope](/.claude/docs/chakra-font-token-var-declaration-scope.md) ⚠️ класс `next/font` на `<body>` не доезжает до токенов `fonts.*` на `:root` — сайт молча рисуется системным шрифтом
- [chakra-typegen-shared-node-modules-race](/.claude/docs/chakra-typegen-shared-node-modules-race.md) ⚠️ параллельный `theme:typegen` откатывает чужие варианты
- [chakra-overflow-wrap-not-inherited](/.claude/docs/chakra-overflow-wrap-not-inherited.md) ⚠️ не наследуется через reset — фикс только `'& *'`
- [chakra-heading-defaults-to-h2](/.claude/docs/chakra-heading-defaults-to-h2.md) ⚠️ страница может не иметь ни одного `<h1>`
- [chakra-aschild-multiple-children-silent-drop](/.claude/docs/chakra-aschild-multiple-children-silent-drop.md) ⚠️ `asChild` молча берёт только первого ребёнка
- [chakra-icon-as-prop-cleanup-pattern](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md) рецепт чистки семгреп-запрета `as=`
- [admin-table-horizontal-overflow](/.claude/docs/admin-table-horizontal-overflow.md) ⚠️ `Table.Root` без `ScrollArea` раздвигает весь документ на телефоне
- [header-drawer-dedup-audit](/.claude/docs/header-drawer-dedup-audit.md) 7 реализаций Header+Drawer — общий примитив не заводить
- [shaka-player-hook-dedup-audit](/.claude/docs/shaka-player-hook-dedup-audit.md) два `useShakaPlayer` — не сводить

### Библиотеки и публикация

- [lib-entry-points](/.claude/docs/lib-entry-points.md) ⭐ подпути `./server`/`./client`, границы, ESLint-ловушки
- [electron-storage-shared-default-value-mutation](/.claude/docs/electron-storage-shared-default-value-mutation.md) ⚠️ фолбэк отдавал ссылку на `defaultValue`, мутация портила дефолт
- [fumadocs-core-staticsource-config-indexed-access-inference](/.claude/docs/fumadocs-core-staticsource-config-indexed-access-inference.md) ⚠️ `loader()` откатывает `page.data` до базового типа
- [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md) внутренние `@letar/*` — только в `devDependencies`
- [vitest-alias-prefix-matching](/.claude/docs/vitest-alias-prefix-matching.md) alias матчится по префиксу
- [vitest-unlinked-workspace-lib-imports](/.claude/docs/vitest-unlinked-workspace-lib-imports.md) ⚠️ либа только в `implicitDependencies` не резолвится
- [vitest-alias-redundant-vs-transitive](/.claude/docs/vitest-alias-redundant-vs-transitive.md) когда alias избыточен, а когда обязателен
- [vitest-shared-singleton-row-race](/.claude/docs/vitest-shared-singleton-row-race.md) ⚠️ общая singleton-строка настроек — редкий флак на общей БД
- [vitest-serializable-transaction-cross-file-flake](/.claude/docs/vitest-serializable-transaction-cross-file-flake.md) ⚠️ Postgres SSI `40001` без пересечения данных
- [vitest-cross-file-db-race-file-parallelism](/.claude/docs/vitest-cross-file-db-race-file-parallelism.md) ⭐ когда узких гонок за общую БД становится много — системный фикс `fileParallelism: false`, не point-патчи
- [ci-real-postgres-unit-test-isolation](/.claude/docs/ci-real-postgres-unit-test-isolation.md) настоящая БД в CI: `test.env` перебивает job-level
- [hardcoded-unique-lookup-key-test-race](/.claude/docs/hardcoded-unique-lookup-key-test-race.md) ⚠️ захардкоженный `@unique`-ключ делит один ряд между spec-файлами
- [zod-computed-key-index-access-pitfall](/.claude/docs/zod-computed-key-index-access-pitfall.md) ⚠️ TS7053 зависит от формы callback'а
- [eslint-flat-react-typescript-missing-react-hooks-plugin](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md) ✅ починено централизованно, история
- [dotenv-agent-targeted-tip-and-skill-files](/.claude/docs/dotenv-agent-targeted-tip-and-skill-files.md) ⚠️ tip-строка `dotenv` адресована агентам — не supply-chain

### Тесты и форматирование

- [e2e-testing](/.claude/docs/e2e-testing.md) ⭐ Playwright; ⚠️ unscoped-ассерты матчат чужой виджет под `--workers=12`
- [persistent-e2e-user-resource-exhaustion](/.claude/docs/persistent-e2e-user-resource-exhaustion.md) ⚠️ фиксированная identity исчерпывает per-identity ресурс
- [playwright-testmatch-absolute-path-regex-anchor](/.claude/docs/playwright-testmatch-absolute-path-regex-anchor.md) ⚠️ якорный `^` в `testMatch` никогда не совпадает
- [unit-testing](/.claude/docs/unit-testing.md) ⚠️ обязательный `tsconfig.spec.json`
- [dual-use-engine-browser-safe-import-guard](/.claude/docs/dual-use-engine-browser-safe-import-guard.md) regex-тест на запрещённые серверные импорты в чистом движке, общем для клиента и сервера
- [vitest-jsdom-formdata-request-hang](/.claude/docs/vitest-jsdom-formdata-request-hang.md) ⚠️ `request.formData()` зависает под jsdom
- [vitest-server-only-mock-pattern](/.claude/docs/vitest-server-only-mock-pattern.md) ⚠️ `import 'server-only'` падает под vitest — мок глобально в `vitest.setup`
- [dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md) ⚠️ dprint не видит границ worktree/submodule
- [dprint-format-project-scope-not-file-scope](/.claude/docs/dprint-format-project-scope-not-file-scope.md) ⚠️ `--projects` задевает весь submodule с чужим WIP
- [dprint-windows-bin-shim-missing](/.claude/docs/dprint-windows-bin-shim-missing.md) ⚠️ пропавший `.exe`-shim при целом пакете
- [dprint-eslint-curly-conflict](/.claude/docs/dprint-eslint-curly-conflict.md) `--fix` и `fmt` откатывают друг друга
- [react-native-eslint-flat-config-eslint10](/.claude/docs/react-native-eslint-flat-config-eslint10.md) ⚠️ RN-пресет роняет прогон целиком под ESLint 10
- [oxlint-eslint-disable-directive-namespace-mismatch](/.claude/docs/oxlint-eslint-disable-directive-namespace-mismatch.md) ⚠️ `oxlint-disable` и `eslint-disable` — разные неймспейсы
- [eslint-flat-config-ignores-not-gitignore](/.claude/docs/eslint-flat-config-ignores-not-gitignore.md) ⚠️ flat config не читает `.gitignore`: `.claude/artifacts/` и `.next-smoke/` линтуются
- [dprint-typescript-nested-aschild-comment-instability](/.claude/docs/dprint-typescript-nested-aschild-comment-instability.md) ⚠️ «Formatting not stable» на комментарии в вложенных `asChild`
- [dprint-markdown-table-reformat](/.claude/docs/dprint-markdown-table-reformat.md) ⚠️ `Edit` падает на «верном» тексте таблицы
- [prettier-dprint-conflict-root-cause](/.claude/docs/prettier-dprint-conflict-root-cause.md) ⚠️ голая `nx format` — это Prettier, `NX_SKIP_FORMAT` её не гасит

### Деплой и инфраструктура

- [deployment](/.claude/docs/deployment.md) ⭐ как устроен деплой
- [verification-pitfalls](/.claude/docs/verification-pitfalls.md) ⭐ проверки, которые врут в успокаивающую (и одна — в тревожную) сторону
- [prod-build-runtime-diagnosis-ladder](/.claude/docs/prod-build-runtime-diagnosis-ladder.md) dev → next start → standalone → контейнер: какая ступень что отсекает; ⚠️ проверка резолва не проверяет цепочку
- [dev-session-screenshot-bypass](/.claude/docs/dev-session-screenshot-bypass.md) живая проверка за admin-гейтом через Playwright-скрипт: скриншот и сбор консоли (гидратация, черновик формы)
- [docker-bind-mount-pitfalls](/.claude/docs/docker-bind-mount-pitfalls.md) ⚠️ `compose up -d` не перечитывает смонтированный конфиг
- [nextjs-standalone-bind-mount-wrong-cwd](/.claude/docs/nextjs-standalone-bind-mount-wrong-cwd.md) ⚠️ `process.chdir()` — байты уходят в writable-слой мимо хоста
- [docker-bind-mount-uid-gid-mismatch](/.claude/docs/docker-bind-mount-uid-gid-mismatch.md) ⚠️ EACCES по uid/gid при верном пути монтирования
- [docker-bare-bun-workspace-deps](/.claude/docs/docker-bare-bun-workspace-deps.md) workspace-зависимости в образе
- [alpine-cdn-unreachable-s3](/.claude/docs/alpine-cdn-unreachable-s3.md) ⚠️ с s3 нет пути до `dl-cdn.alpinelinux.org`, `nc` даёт ложный FAIL
- [docker-network-endpoint-corruption-diskfull](/.claude/docs/docker-network-endpoint-corruption-diskfull.md) ⚠️ полный диск рвёт endpoint: рестарт БД строго до приложения
- [docker-prune-cold-layer-network-flake](/.claude/docs/docker-prune-cold-layer-network-flake.md) ⚠️ ночной prune → первый деплой после 04:00 идёт в сеть
- [deploy-affected-cache-invalidation](/.claude/docs/deploy-affected-cache-invalidation.md) три причины холодного деплоя
- [deploy-infra-no-git-pull-stale-checkout](/.claude/docs/deploy-infra-no-git-pull-stale-checkout.md) ⚠️ `deploy_infra` не пуллит git, ложный успех на устаревшем checkout
- [deploy-affected-premigrate-dump-wrong-container](/.claude/docs/deploy-affected-premigrate-dump-wrong-container.md) ⚠️ pre-migrate dump резолвил не тот контейнер
- [deploy-engine-rollout-proxy-kind-autodetect](/.claude/docs/deploy-engine-rollout-proxy-kind-autodetect.md) ⚠️ per-app label не поспевает за сменой прокси
- [dotenvx-stdout-migration-pollution](/.claude/docs/dotenvx-stdout-migration-pollution.md) P3018
- [external-services-blocked-from-s2](/.claude/docs/external-services-blocked-from-s2.md) что недоступно с s2
- [node-env-not-production-signal](/.claude/docs/node-env-not-production-signal.md) ⚠️ `NODE_ENV=production` не отличает прод от staging
- [s3-staging-host-memory-pressure](/.claude/docs/s3-staging-host-memory-pressure.md) ⚠️ узкое место s3 — RAM, не CPU
- [dashboard-agent-alert-debounce-patterns](/.claude/docs/dashboard-agent-alert-debounce-patterns.md) дебаунс алертов
- [server-provision](/.claude/docs/server-provision.md) · [server-recovery](/.claude/docs/server-recovery.md) · [server-migration-letar](/.claude/docs/server-migration-letar.md) архив переезда
- [firewall](/.claude/docs/firewall.md) ⚠️ `ufw` не фильтрует порты Docker
- [nginx-referer-and-header-quirks](/.claude/docs/nginx-referer-and-header-quirks.md) ⚠️ `valid_referers` в `include` не парсится; нужен `proxy_hide_header`
- [backup-architecture](/.claude/docs/backup-architecture.md) бэкапы: состав, расписание, восстановление
- [secret-manager](/.claude/docs/secret-manager.md) SOPS + age
- [sops-env-encrypt-input-path-matching](/.claude/docs/sops-env-encrypt-input-path-matching.md) ⚠️ `.sops.yaml` матчится по входному пути; скрипт `sops-env-set.sh`
- [redis-security](/.claude/docs/redis-security.md) · [redis-client-not-ready-at-startup](/.claude/docs/redis-client-not-ready-at-startup.md) ⚠️ первое чтение на старте процесса падает без повтора
- [cron-endpoint-registration-checklist](/.claude/docs/cron-endpoint-registration-checklist.md) ⚠️ новый `/api/cron/*` требует три правки вне своего приложения

### Прокси (`infra/`)

- [nginx-proxy-manager](/infra/nginx-proxy-manager/README.md) ⛔ снят с s2 и s3 — история, не текущее состояние
- [acme-dns](/infra/acme-dns/README.md) ⭐ wildcard-TLS без API регистратора
- [traefik](/infra/traefik/README.md) боевой на s2 и s3

### Безопасность и право

- [personal-data](/.claude/docs/personal-data.md) ⭐ 152-ФЗ, РКН, cookie
- [upload-path-traversal](/.claude/docs/upload-path-traversal.md) почему `path.join`+`startsWith` не защищают
- [file-scanner-unconfigured-rejects-all-uploads](/.claude/docs/file-scanner-unconfigured-rejects-all-uploads.md) ⚠️ стенд без `CLAMAV_HOST`/`ALLOW_FAKE_FILE_SCANNER` отвергает любую загрузку, маскируясь под отказ валидации формата
- [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) ⚠️ греп по имени ключа даёт ложноотрицательный результат
- [advertising-law-boundaries](/.claude/docs/advertising-law-boundaries.md) границы рекламного законодательства
- [tochka-acquiring-site-requirements](/.claude/docs/tochka-acquiring-site-requirements.md) требования банка к сайту

### Auth, профиль, админка

- [auth](/.claude/docs/auth.md) ⭐ Better Auth, сессии, роли · [admin](/.claude/docs/admin.md) · [user-profile](/.claude/docs/user-profile.md)
- [one-time-reveal-fragment-token-pattern](/.claude/docs/one-time-reveal-fragment-token-pattern.md) одноразовая публичная ссылка без утечки токена в лог
- [better-auth-localhost-cookie-jar-collision](/.claude/docs/better-auth-localhost-cookie-jar-collision.md) ⚠️ dev-серверы делят cookie-jar `localhost` → 500 на Base64
- [better-auth-pages-option-dead-code](/.claude/docs/better-auth-pages-option-dead-code.md) ⚠️ `pages: {...}` — несуществующая опция, мёртвый код в 7 приложениях
- [better-auth-1.7-oidc-provider-removed](/.claude/docs/better-auth-1.7-oidc-provider-removed.md) ⚠️ `bun update` в пределах `^1.6.x` убирает `oidcProvider`
- [better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md) ⚠️ требуется поле `issuer`; коммит миграции ≠ её применение
- [better-auth-organization-teams-schema-fields](/.claude/docs/better-auth-organization-teams-schema-fields.md) ⚠️ `teams` плагина organization требует новые поля — падение на старте
- [better-auth-plugin-modelname-casing-schema-mismatch](/.claude/docs/better-auth-plugin-modelname-casing-schema-mismatch.md) ⚠️ `modelName` сверяется буквально с client-property casing, не с `@@map`
- [better-auth-oauth-provider-schema-drift](/.claude/docs/better-auth-oauth-provider-schema-drift.md) ⚠️ своя схема плагина; 7-слойный прод-инцидент SSO
- [runtime-invariant-missing-from-select](/.claude/docs/runtime-invariant-missing-from-select.md) ⚠️ отсутствующее поле неотличимо от легитимного отказа
- [better-auth-vk-id-migration-and-linksocial-pitfalls](/.claude/docs/better-auth-vk-id-migration-and-linksocial-pitfalls.md) ⚠️ VK ID вместо legacy; `linkSocial()` молчит без `allowDifferentEmails`
- [better-auth-prismaadapter-zenstack-incompatibility](/.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md) ⚠️ ZenStack-клиент в `prismaAdapter()` → 500 без строки в логах
- [dev-session-token-plus-char-query-corruption](/.claude/docs/dev-session-token-plus-char-query-corruption.md) ⚠️ `+` в query декодируется в пробел; починено в фабрике
- [email-code-verification-pattern](/.claude/docs/email-code-verification-pattern.md) код из письма + SSE-уведомление вкладок

### Электрон и десктоп

- [electron-app-protocol](/.claude/docs/electron-app-protocol.md) ⚠️ origin `null` под `file://` блокирует Worker и WASM
- [electron-monorepo-shared-releases](/.claude/docs/electron-monorepo-shared-releases.md) ⭐ общий репо релизов: тег `<app>-v<semver>`, чек-лист нового приложения
- [animatrona-dual-build-alias-drift](/.claude/docs/animatrona-dual-build-alias-drift.md) ⚠️ webpack и esbuild со своими списками алиасов — править оба
- [electron-version-drift](/.claude/docs/electron-version-drift.md) точная версия electron расходится без ошибок сборки
- [electron-net-fetch-tun-vpn](/.claude/docs/electron-net-fetch-tun-vpn.md) ⚠️ `net.fetch` падает под TUN-VPN
- [electron-sqlite](/.claude/docs/electron-sqlite.md) SQLite в Electron
- [electron-main-typecheck-tsgo-gap](/.claude/docs/electron-main-typecheck-tsgo-gap.md) ⚠️ `main/` в exclude — `typecheck:tsgo` зелёный, но не проверяет его вовсе
- [electron-main-fetch-json-unknown-type](/.claude/docs/electron-main-fetch-json-unknown-type.md) ⚠️ `response.json()` в main/ без DOM lib — `unknown`, не `any`
- [electron-shared-runtime-and-settings-patterns](/.claude/docs/electron-shared-runtime-and-settings-patterns.md) `shared/`-рантайм и единый объект настроек — общий паттерн Electron-приложений
- [electron-window-controls-overlay-pattern](/.claude/docs/electron-window-controls-overlay-pattern.md) `titleBarOverlay` вместо `frame: false`
- [native-win32-ui-verification-screenshot](/.claude/docs/native-win32-ui-verification-screenshot.md) проверка UI вне Browser pane; ⚠️ двоение — чужая прод-копия
- [claude-desktop-msix-container-virtualization](/.claude/docs/claude-desktop-msix-container-virtualization.md) ⚠️ шелл агента в MSIX-контейнере: HKCU и новые каталоги виртуализируются, живые тесты — через `schtasks`
- [windows-user-away-detection](/.claude/docs/windows-user-away-detection.md) ⚠️ «пользователь отошёл»: флаг экрана без админа, служба не видит ввод
- [vite-dev-letar-ui-barrel-process-undefined](/.claude/docs/vite-dev-letar-ui-barrel-process-undefined.md) ⚠️ баррель `@letar/ui` тянет `next/*`, `process` не определён
- [react-native-087-breaking-changes](/.claude/docs/react-native-087-breaking-changes.md) ⚠️ миграция RN 0.85→0.87, тихое ломание declaration merging
- [android-agp9-windows-toolchain-pitfalls](/.claude/docs/android-agp9-windows-toolchain-pitfalls.md) ⚠️ AGP 9 + Kotlin, лимит путей Windows

### Медиа, почта, звук

- [media-server](/.claude/docs/media-server.md) · [email](/.claude/docs/email.md)
- [maddy-creds-create-missing-imap-acct](/.claude/docs/maddy-creds-create-missing-imap-acct.md) ⚠️ `creds create` не заводит хранилище — нужен `imap-acct create`
- [transactional-email-cron-pattern](/.claude/docs/transactional-email-cron-pattern.md) кандидаты → отправка → дедуп-поле
- [imapflow-error-listener-hang-pitfall](/.claude/docs/imapflow-error-listener-hang-pitfall.md) ⚠️ слушателя `'error'` мало — нужен внешний дедлайн
- [web-push](/.claude/docs/web-push.md) push-уведомления
- [offlineaudiocontext-suspend-render-race](/.claude/docs/offlineaudiocontext-suspend-render-race.md) гонка `suspend`/`render`
- [chromium-video-codec-limits](/.claude/docs/chromium-video-codec-limits.md) ⚠️ H.264 Hi10P не декодируется, обход через WASM+WebCodecs
- [nvenc-web-video-codec-ladder](/.claude/docs/nvenc-web-video-codec-ladder.md) ⚠️ AV1→HEVC→H.264 по `powerEfficient`; `tf_level` только 0/4, `libx264` без `pix_fmt` даёт High 10
- [ifc-gltf-web-pipeline-pitfalls](/.claude/docs/ifc-gltf-web-pipeline-pitfalls.md) ⚠️ IFC → GLB → three.js: склейка материалов, утечка метаданных автора
- [playwright-html-to-pdf-page-margin-boxes](/.claude/docs/playwright-html-to-pdf-page-margin-boxes.md) ⚠️ колонтитулы PDF — CSS page margin boxes, не `displayHeaderFooter`

### Продукт и контент

- [ecommerce-cart-orders](/.claude/docs/ecommerce-cart-orders.md) корзина и заказы; ⚠️ новая per-user модель для гостя требует двух согласованных правок
- [payment-webhook-idempotency-pattern](/.claude/docs/payment-webhook-idempotency-pattern.md) уникальный ID события + guard по терминальному статусу
- [idempotency-key-terminal-transition-pattern](/.claude/docs/idempotency-key-terminal-transition-pattern.md) append-only переход, не про внешние вебхуки
- [client-idempotency-key-order-creation](/.claude/docs/client-idempotency-key-order-creation.md) client-generated uuid против двойного клика
- [pessimistic-row-lock-capacity-race-pattern](/.claude/docs/pessimistic-row-lock-capacity-race-pattern.md) гонка разных акторов за общий лимит — `SELECT ... FOR UPDATE`
- [external-provider-fake-pattern](/.claude/docs/external-provider-fake-pattern.md) fake-реализация внешнего сервиса, грабля вечно-успешного fake
- [scraper-source-health-detector-pattern](/.claude/docs/scraper-source-health-detector-pattern.md) детектор тихой поломки источника
- [animatrona-db-manifest-dual-source](/.claude/docs/animatrona-db-manifest-dual-source.md) ⚠️ CID в БД побеждает свежий CID из манифеста
- [paginated-web-source-reading](/.claude/docs/paginated-web-source-reading.md) чтение источника на десятки страниц

### Правила репозитория

- [public-repo-hygiene](/.claude/rules/public-repo-hygiene.md) ⭐ что нельзя писать в публичные файлы
- [time-tracking](/.claude/rules/time-tracking.md) ⚠️ когда стартовать и останавливать таймер studio
- [time-tracker-drift-incidents](/.claude/docs/time-tracker-drift-incidents.md) ⚠️ четыре способа потерять время; `autoClosedIdle` хуки не ловят
- [formatting](/.claude/rules/formatting.md) ⚠️ голая `nx format` молча зашита на Prettier

## Быстрый старт

**Приложения:** Используй MCP `nx_workspace` для списка приложений и портов. Подробнее: [environment](/.claude/docs/environment.md)

### Структура репо

`letar` — **публичный** монорепо. Приватное подключено **git submodules**; актуальный список
всегда `git config -f .gitmodules --get-regexp path`, не по памяти — на 2026-09-16 их 14
(приложения и их `-e2e`, `libs/driving-school-db`, `.claude/private`). Подробнее:
[repo-structure](/.claude/docs/repo-structure.md).

**Клонирование с приватными:** `git clone --recurse-submodules git@github.com:kamiletar/letar.git`

**Работа с submodule:** изменяешь код → коммит/пуш внутри submodule → `git add <path> && git commit -- <path>` в letar для фиксации SHA.

**Git hooks (установить один раз после клонирования):**

```bash
bash scripts/hooks/install.sh
```

Ставит связку pre-commit хуков и одного pre-push (ниже — основные; полный набор — в шапке
`scripts/hooks/install.sh`):

- `pre-commit-scope-guard.sh` — блокирует голый `git commit`/`git add -A`, затянувший файлы из
  нескольких несвязанных `apps/*`/`libs/*`: типовая причина, по которой один агент коммитит чужую
  незакоммиченную работу другого. Обход для легитимных multi-scope коммитов —
  [git.md § Работа рядом с другими агентами](/.claude/rules/git.md).
- `pre-commit-syntax-check.sh` — блокирует коммит staged `.ts/.tsx`, которые не парсятся (только
  парсер, доли секунды, проверяет содержимое **индекса**); обход осознанного WIP —
  `GIT_ALLOW_SYNTAX_ERRORS=1`. Разбор — [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).
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

⚠️ **`--projects` обязателен.** Голая `nx run-many -t format` заходит внутрь семи приватных
submodule (2089 файлов) и трогает чужие файлы, даже когда правок ноль; форма без
`--projects`/`--exclude` блокируется хуком `.claude/hooks/validate-bash.js`. Нужен прогон по
всему публичному репо — `dprint fmt` из корня (у него `cwd` в корне, `excludes` работают).
Разбор — [dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md).

⚠️ **Голая `nx format` (без `run-many -t`) — другая команда, она запускает Prettier мимо dprint**
и тоже блокируется хуком. Имена совпали случайно, не перепутай синтаксис. Второй канал той же
порчи — свой `targets.format` в `project.json` с `prettier --write` (480 файлов за один прогон):
[prettier-dprint-conflict-root-cause](/.claude/docs/prettier-dprint-conflict-root-cause.md),
запрет — [formatting.md](/.claude/rules/formatting.md).

⚠️ `lint` автоматически запускает oxlint первым (fast-fail), затем ESLint. `typecheck:tsgo` в 9-38x быстрее обычного typecheck.

**Окружение:** Windows (нативный), `nx` и `bun` глобальные (❌ НЕ `bunx nx`/`npx nx`). При передаче аргументов в underlying tool: `nx e2e app-e2e -- --project=chromium`

**MCP серверы:** nx-mcp, **letar** (объединяет studio-time/studio/umami/glitchtip/deploy/form/synth/
domwellbes-assist в один процесс), **letar-db** (все Postgres-базы), context-mode (плагин),
agent-mail. Документация внешних библиотек — desktop-расширение Context7, не проектный сервер.
Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md)

⚠️ **Ревизия 2026-09-14: 22 записи в `.mcp.json` → 4.** Прежде чем возвращать в список что-то
удалённое — проверь, что инструмент будет вызываться, а не просто числиться (у выброшенных было
25–39 вызовов за 1779 сессий). Браузерная работа идёт через встроенный Claude Browser,
семантический поиск — через Grep и субагента Explore. Что с чем слито и почему, а также почему
`nx-mcp` обязан запускаться с `--minimal false` (иначе `nx_workspace` просто нет в списке
инструментов) — [mcp-servers.md](/.claude/docs/mcp-servers.md).

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

**Обновлено:** 2026-09-16 | **Nx** 23.2 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

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
