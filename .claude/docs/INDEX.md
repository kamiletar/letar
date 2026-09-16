# Индекс документации

Полный индекс `.claude/docs/` — ссылка, условие «когда нужен» и развёрнутая аннотация с
механизмом ловушки. Короткая карта (строка на док) — в разделе «Документация» корневого
[CLAUDE.md](/CLAUDE.md); сюда приходят за подробностями, прежде чем открывать сам док.

⭐ — читать до начала работы в теме, ⚠️ — ловушка, которая выглядит как успех.

## Как вести этот файл

Новый док в `.claude/docs/` → **две** записи: развёрнутая здесь, в нужном тематическом разделе, и
короткая (ссылка + 5–10 слов) в CLAUDE.md. Аннотация здесь может быть любой длины — это не
контекст каждой сессии. В CLAUDE.md — строго одна строка.

## Репозиторий и среда

[repo-structure](/.claude/docs/repo-structure.md) ⭐ публичный монорепо +
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
[nx-vitest-plugin-worker-oom-shared-machine](/.claude/docs/nx-vitest-plugin-worker-oom-shared-machine.md)
⚠️ `Plugin worker "@nx/vitest" exited unexpectedly` при `nx dev` — не баг воркера, а
`JavaScript heap out of memory` (дефолтный лимит V8 ~4.3 ГБ, `nx` не задаёт
`--max-old-space-size`), раздутый безусловной (без `include`) регистрацией `@nx/vitest` в
`nx.json`, цепляющей `vitest.config.*` внутри вложенных `node_modules`; воркэраунд —
`NODE_OPTIONS=--max-old-space-size=8192` (форвардится воркеру как есть) ·
[nextjs-build-worker-count-oom-shared-host](/.claude/docs/nextjs-build-worker-count-oom-shared-host.md)
⚠️ `next build` дважды подряд падал system-wide OOM на фазе «Collecting page data using 7
workers» (не на компиляции Turbopack) — соседний, но другой класс: дефолт
`experimental.cpus = os.cpus().length - 1` сайзит число воркеров по CPU хоста, не по свободной
памяти (`memoryBasedWorkersCount` по умолчанию `false`); фикс — явный низкий `experimental.cpus`
в `next.config.mjs` приложения, не глобальная настройка ·
[turbopack-build-filesystem-cache-oom](/.claude/docs/turbopack-build-filesystem-cache-oom.md)
⚠️ третий класс того же симптома, уже на **компиляции** (`Creating an optimized production build`
→ `Killed`): постоянный кеш сборки Turbopack (`turbopackFileSystemCacheForBuild`, молча включён с
16.3.0) держит сборку дешёвой, пока тёплый, а правка `next.config`/зависимостей его сбрасывает, и
сборка раздувается кратно — замер: > 23 ГБ на сброшенном кеше, 14.9 ГБ на пустом, 8.2 ГБ с
выключенным кешем; `experimental.cpus`, `turbopackMemoryEviction` (только dev) и
`--max-old-space-size` не помогают; ложный след — «хост перегружен чужими сборками» ·
[nx-playwright-plugin-project-graph-race](/.claude/docs/nx-playwright-plugin-project-graph-race.md)
⚠️ `Failed to process project graph` на `@nx/playwright/plugin` («Unexpected module status 0»,
«race condition ... Promise.all()») — гонка загрузчика ESM при параллельном чтении конфигов
**всех** playwright-проектов воркспейса разом, упавший файл может принадлежать постороннему
приложению; `NX_PREFER_NODE_STRIP_TYPES=false` не помогает, лечится обычным повторным запуском ·
[nx-e2e-implicit-deps-public-repo-private-app-exception](/.claude/docs/nx-e2e-implicit-deps-public-repo-private-app-exception.md)
⚠️ `dsperevod-e2e`/`svoichuzhie-e2e`/`aprel8008-e2e` (публичные каталоги) намеренно не держат
`implicitDependencies` на своё приложение (submodule) — на CI без submodule это уронит весь граф
Nx через `assertWorkspaceValidity`; `aboi-e2e`/`driving-school-e2e`/`studio-e2e`/`domwellbes-e2e`
ту же связь держат безопасно, потому что сами являются submodule и на CI-чекауте не существуют ·
[nx-cache-directory-env-not-isolated-by-cachedirectory](/.claude/docs/nx-cache-directory-env-not-isolated-by-cachedirectory.md)
⚠️ `NX_CACHE_DIRECTORY` двигает только каталог файлов-артефактов — решение «отдать cache hit»
принимает отдельный DB-кеш Nx 19+, чей SQLite-индекс живёт в `NX_WORKSPACE_DATA_DIRECTORY`
(дефолт `.nx/workspace-data`), независимо от `cacheDirectory`; изоляция staging/production
требует развести ОБЕ переменные разом, эмпирически доказано повторной сборкой с разным
`NEXT_PUBLIC_APP_URL` — с одной только `NX_CACHE_DIRECTORY` второй прогон всё равно даёт
cache hit при пустом целевом каталоге на диске ·
[tsgo-stray-declarations](/.claude/docs/tsgo-stray-declarations.md) ⚠️ `typecheck:tsgo` иногда
эмитит `.d.ts`/`.d.ts.map` рядом с исходником вместо `outDir` — не воспроизведено детерминированно
на чистом дереве, гигиена (`.d.ts.map` в `.gitignore`) и cleanup-команда ·
[tsgo-generic-default-param-inference](/.claude/docs/tsgo-generic-default-param-inference.md) ⚠️
generic-обёртка (`TArgs extends unknown[]`, `createHandler` в animatrona `main/`) с
callback-параметром вида `(x = default) => ...` — tsgo выводит `TArgs` как `unknown[]`; фикс не
явная аннотация+eslint-disable, а `x: T | undefined` (или `?:` после уже опционального
параметра) с `?? default` в теле, без конфликта с `no-inferrable-types` ·
[tsgo-excessive-stack-depth-zenstack](/.claude/docs/tsgo-excessive-stack-depth-zenstack.md) ⚠️
`TS2321: Excessive stack depth` при структурном сравнении вложенных ZenStack-типов — три
подпаттерна фикса (аннотация callback-параметра, раздельные `await` вместо `Promise.all`,
явная аннотация возврата в generic-фабрике) и крайний `as any[]` для обязательного
`$transaction`; платформенная нестабильность Windows/Linux — неподтверждённая гипотеза ·
[bun-lockfile-private-submodules](/.claude/docs/bun-lockfile-private-submodules.md) ⚠️
`--frozen-lockfile` падает везде, где submodule не выкачаны; чистка `bun.lock` не держится ·
[bun-lock-drift-unpushed-commits-blocks-all-deploys](/.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md)
⚠️ версии `package.json` бампнуты и закоммичены, но коммит не запушен — `origin/main` тянет
устаревший `bun.lock`, `--frozen-lockfile` роняет деплой ЛЮБОГО приложения, не только того, чья
версия разъехалась; фикс — запушить, не пересобирать `bun install` в грязном общем чекауте ·
[bun-server-version-lockfile-format-incompatibility](/.claude/docs/bun-server-version-lockfile-format-incompatibility.md)
⚠️ старый bun на сервере не парсит `lockfileVersion` новой версии вообще (`Unknown lockfile
version`) — блокирует ВСЕ деплои на сервере разом, не только текущее приложение; фикс — апгрейд
bun от **root**, не от `deploy` (`/usr/local/bin/bun` → симлинк на `/root/.bun/bin/bun`),
проверка строго через `nsenter ... sudo -u deploy` execution path ·
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
  [zod-per-package-pin-drift](/.claude/docs/zod-per-package-pin-drift.md) ⚠️ caret-диапазон
  потребителя (`^4.4.3`) НЕ дедупает с точным корневым пином (`4.4.3`) под bun isolated linker —
  только буквальное совпадение строки версии; 8 пакетов repo-wide независимо развели свой
  точный пин `4.6.2`, блокировало деплой domwellbes (2026-09-13) ·
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
  вообще не импортирует напрямую; фикс — `"dom"` в `lib` потребителя, не в библиотеке-источнике;
  ⚠️ у React Native-потребителя того же барреля выхода нет вовсе — Metro резолвит весь граф до
  tree-shaking, и `@tanstack/react-query` из чужой ветки `index.ts` роняет сборку бандла
  (`@letar/hooks` в `animatrona-mobile`), лечится только подпутями-экспортами в самой либе ·
  [webpack-emscripten-runtime-wasm-not-emitted](/.claude/docs/webpack-emscripten-runtime-wasm-not-emitted.md)
  ⚠️ Emscripten-обвязка (`harfbuzzjs` у `satori`, прямой импорт — только в `grandslamcup`) ищет
  свой `.wasm` по runtime-строке — webpack компилирует JS-чанк, но не копирует сам бинарник;
  билд не падает, ловится на пререндере (SSG) или на первом реальном запросе (SSR) —
  `ENOENT .../chunks/<имя>.wasm`; фикс — ручное копирование через `compiler.hooks.afterEmit` ·
  [webpack-concatenatemodules-electron-updater-jsyaml-crash](/.claude/docs/webpack-concatenatemodules-electron-updater-jsyaml-crash.md)
  ⚠️ Electron-приложение с `electron-updater`, забандленным webpack'ом (не `externals` — деплой
  не включает `node_modules`) — `optimization.concatenateModules` (scope hoisting, дефолт в
  `mode: production`) ломает циклическую CJS-загрузку внутри `js-yaml`, конструктор `Type`
  вызывается без `new`; падает **только** собранный prod-инсталлятор, `nx dev` не ловит; фикс —
  `concatenateModules: false`, найдено и починено в `kami-key-the`, `animatrona`/
  `label-printer-desktop` на момент находки не проверены

## MCP-серверы

[mcp-servers](/.claude/docs/mcp-servers.md) состав и назначение ·
[mcp-server-pattern](/.claude/docs/mcp-server-pattern.md) тонкий локальный сервер по stdio ·
[mcp-sse-bridge](/.claude/docs/mcp-sse-bridge.md) мост stdio-процесс ↔ открытая страница ·
[mcp-tool-handler-testing-pattern](/.claude/docs/mcp-tool-handler-testing-pattern.md) тест
инструментов через настоящий `Client` + `InMemoryTransport`, не рефлексию по приватным полям
`McpServer` — невалидные аргументы дают `isError: true`, не `throw` ·
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md) баги координации: contact
approval, kebab-case в `to`, обнулённая база

## База данных и ZenStack

[database](/.claude/docs/database.md) ·
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
[zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md)
переиспользование кусков схемы **между приложениями** (`libs/*.zmodel`): `type`-миксин несёт не
только поля, но и `@@index`/`@@allow`/`enum` (вопреки прежней формулировке README
`zenstack-fragments`), нельзя — relation на модель потребителя и переопределение поля миксина;
альтернатива «остров» из целых связанных моделей. ⚠️ `@letar/zenstack-form-plugin` **молча терял
все поля миксина** (exit 0, правдоподобный неполный `<Model>.form.ts`) — закрыто в v4.0.1
(2026-09-08), `collectAllFields` разворачивает `model.mixins`; связь фрагмент→приложение в графе
Nx закрыта 2026-09-08 (`nx.implicitDependencies` у потребителя + путь к фрагменту в `inputs`
у `zenstack:generate`) — осталась ⚠️ проектная гранулярность: правка ЛЮБОГО фрагмента метит
affected всех потребителей, файловой точности нет; там же почему общую часть `zenstack:generate`
нельзя вынести в `targetDefaults` ·
[zmodel-comment-directives-vs-ast](/.claude/docs/zmodel-comment-directives-vs-ast.md) `@meta`
field-атрибут (AST) vs `///`-комментарий (regex) — два независимых парсера в
`zenstack-form-plugin`, не один общий; почему объектный литерал ломает именно `@meta` (падает в
upstream-генераторе TS-схемы, `ObjectExpr` не поддержан), а comment-директиву — нет; почему
кодмод построчный, не AST-based ·
[zenstack-field-level-allow-does-not-narrow](/.claude/docs/zenstack-field-level-allow-does-not-narrow.md)
⚠️ field-level `@allow` только добавляет разрешение поверх модельной `@@allow`, не сужает —
сужение только через field-level `@deny`; найдено трижды подряд (`User.roles` privilege
escalation, `Payment.settlementId`, `DeliveryDiscrepancy`) ·
[role-gate-vs-model-policy-drift](/.claude/docs/role-gate-vs-model-policy-drift.md) ⚠️ парный
класс уровнем выше: список ролей в `requireRole` шире (или у́же) `@@allow` модели, в которую
действие реально пишет — роль проходит гейт, видит кнопки и падает на записи необработанным
отказом, а в обратную сторону функция просто не работает у тех, для кого задумана; typecheck и
тесты с моком клиента БД слепы к этому по построению, ловушка второго порядка — хелпер, лениво
создающий родительскую запись (версию/ревизию), требует прав на неё и даёт отказ, зависящий от
данных ·
[precommit-hook-install-staleness](/.claude/docs/precommit-hook-install-staleness.md) ⚠️
установленный pre-commit-хук — копия на момент последнего `install.sh`, не симлинк: новый скрипт
в `scripts/hooks/` (например `schema-migration-check`) не появляется в уже установленных
submodule сам; коммит без миграции schema.zmodel прошёл в domwellbes чисто, потому что хуки там
не переустанавливались 11 дней — на 2026-09-01 тот же дрейф ещё у `aboi`/`driving-school`/
`dsperevod`

## Формы, UI, компоненты

[forms](/.claude/docs/forms.md) ⭐ ·
[react-duplicate-responsive-dom](/.claude/docs/react-duplicate-responsive-dom.md) ⚠️ два JSX-блока
на `display={{ base:/md: }}` с одинаковым интерактивным контентом — дубль в DOM, не адаптивность ·
[chakra-flexwrap-column-direction-overflow](/.claude/docs/chakra-flexwrap-column-direction-overflow.md)
⚠️ `flexWrap="wrap"` безусловный рядом с `direction={{ base: 'column', sm: 'row' }}` — на mobile
`wrap` идёт по cross-axis, при `column` это горизонталь, лишние элементы уезжают вбок, а не вниз;
фикс — `flexWrap={{ base: 'nowrap', sm: 'wrap' }}` ·
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
[letar-forms-server-errors-errormap-onserver](/.claude/docs/letar-forms-server-errors-errormap-onserver.md)
⚠️ `applyServerErrors` обязан писать в `field.state.meta.errorMap.onServer`, не в производный
`meta.errors` напрямую — TanStack Form пересчитывает `errors` из `errorMap` на каждом
обновлении стора, прямой push переживает ровно до следующего пересчёта (тот же тик); мок
`formRef` в unit-тесте (`vi.fn()` без реального стора) этого не ловит — нужна живая браузерная
проверка ·
[letar-forms-missing-i18nprovider-english-hints](/.claude/docs/letar-forms-missing-i18nprovider-english-hints.md)
⚠️ без `<FormI18nProvider locale="ru">` в дереве провайдеров подсказки валидации
(`z.string().min/max`) молча остаются на английском, хотя RU-локализация в библиотеке уже
реализована — ни typecheck, ни рендер без ошибок этого не покажут ·
[letar-forms-select-nullable-meta-options-lost](/.claude/docs/letar-forms-select-nullable-meta-options-lost.md)
⚠️ `Field.Select` без явного `options` на поле, обёрнутом в `.nullable().optional()` (стандартный
вывод `@letar/zenstack-form-plugin` для nullable enum) — резолвер не разворачивает
`ZodNullable`/`ZodOptional` перед поиском `.meta()`, дропдаун рендерится пустым, хотя значение
хранится и сабмитится корректно ·
[letar-forms-fieldprops-typed-tags-not-resolved](/.claude/docs/letar-forms-fieldprops-typed-tags-not-resolved.md)
✅ закрыто в `@letar/forms-react` v0.7.0 (2026-09-09) — `@meta("form.props.<key>", value)` из
схемы раньше доходил до компонента только через `Form.Field.Auto`, рекомендованный явный
`<AppForm.Field.X>` (`.claude/rules/forms.md`) игнорировал произвольный `meta.fieldProps`;
теперь `useResolvedFieldProps`/`createField` резолвит его с приоритетом `props > meta` в обоих
UI-скинах. Файл — разбор проблемы для истории и на случай регрессии ·
[letar-forms-field-auto-fieldtype-drops-extra-props](/.claude/docs/letar-forms-field-auto-fieldtype-drops-extra-props.md)
⚠️ Зеркальный, но другой баг — `Field.Auto` с заданным `meta.ui.fieldType` не спредит
`baseProps` в `renderFieldByType` (в отличие от fallback-ветки по типу схемы), любой проп
сверх явно перечисленных (`onComplete` у `PinInputFieldProps` и т.п.) молча теряется без
единой ошибки; обход — явный тег (`Field.PinInput`), не `Field.Auto`, найдено на auth-hub
(автосабмит кода из письма молчал) ·
[letar-forms-urlsync-missing-router-no-rsc-refetch](/.claude/docs/letar-forms-urlsync-missing-router-no-rsc-refetch.md)
⚠️ `Form.UrlSync` без явного `router` пишет URL мимо Next.js router (`history.replaceState`) —
Server Component страницы не перечитывает `searchParams`, URL меняется, данные — нет; проверять
`read_network_requests` на `_rsc=` после изменения, не только глазами на URL ·
[letar-forms-field-date-urlsync-date-object](/.claude/docs/letar-forms-field-date-urlsync-date-object.md)
⚠️ `Form.Field.Date` всегда коммитит `Date` в состояние формы (даже без `schema`) — `Form.UrlSync`
сравнивает его со строковым `defaults` через `===`, поле навсегда «активно», в URL уезжает
`Date.toString()` вместо `YYYY-MM-DD`; обход — date-range вне декларативной Field-системы, см.
`apps/studio` `owner/time` фильтры ·
[external-state-alongside-createform-pattern](/.claude/docs/external-state-alongside-createform-pattern.md)
внешний `useState` рядом с `createForm`-инстансом — согласия 152-ФЗ и значения с независимым
жизненным циклом (immediate-upload), не обход схемы для обычных полей; ⚠️ там же — опечатка
`SubmitButtonProps.width` vs Chakra-алиас `w` ·
[ui-components](/.claude/docs/ui-components.md) · [images](/.claude/docs/images.md) ·
[upload-storage-backend](/.claude/docs/upload-storage-backend.md) `StorageBackend` в
`@letar/image-upload/server` — точка расширения на будущее S3-совместимое хранилище, S3-backend
не реализован, список мест вне абстракции, разбор IPFS (отклонён для приватного контента) ·
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

## Данные и состояние

[data-fetching](/.claude/docs/data-fetching.md) ·
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

## Next.js — ловушки

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
[electron-nextron-dual-tsconfig-paths-drift](/.claude/docs/electron-nextron-dual-tsconfig-paths-drift.md)
⚠️ у Nextron-приложения (`animatrona`, `label-printer-desktop`, `poster-microtext-desktop`) свой
`renderer/tsconfig.json` с независимым набором `@letar/*`-путей — `typecheck:tsgo` читает
верхнеуровневый `tsconfig.json`, `next build` читает `renderer/tsconfig.json`; новый алиас,
добавленный только в один файл, даёт зелёный typecheck и красный `Module not found` на билде ·
[nextron-npx-next-build-windows-project-dir](/.claude/docs/nextron-npx-next-build-windows-project-dir.md)
⚠️ ручная диагностика через `npx next build`/`next.exe` из `renderer/` (Nextron-приложение без
своего `package.json`) на Windows резолвит project dir на уровень выше — TS6305 родительского
`tsconfig.json`, реальных `nx build`/`nx build:win` (executor `nx:run-commands`, без `npx`) не
касается; диагностировать через `node .../next/dist/bin/next build` напрямую ·
[nextjs-standalone-tracing](/.claude/docs/nextjs-standalone-tracing.md)
ECONNREFUSED/ERR_DLOPEN_FAILED при зелёном билде ·
[nextjs-stale-dotnext-types-tsgo-ts6305](/.claude/docs/nextjs-stale-dotnext-types-tsgo-ts6305.md)
⚠️ устаревший локальный `.next/types` (в `.gitignore`, переживший `bun update` версии `next`) даёт
`TS6305` в `typecheck:tsgo`, не связанную с текущими правками — git-бисекция это не ловит,
`.next` не отслеживается; фикс — `rm -rf .next tsconfig.tsbuildinfo`, не правка `project.json` ·
[nextjs-dynamic-fs-path-tracing](/.claude/docs/nextjs-dynamic-fs-path-tracing.md) ⚠️ обратный
случай того же класса — рантайм-путь в `fs`-вызове (`path.join(uploadsRoot, categoryFolder)` в
`@letar/image-upload`) заставляет трейсер утащить в `.next/standalone` весь проект целиком
(раздутый образ Docker, `aprel8008` — 3.47GB), фикс `/* turbopackIgnore: true */` работает
только сразу после открывающей скобки вызова; статически ограниченный, но объёмный путь
(`uploads/estates/<slug>/<file>`) предупреждения не даёт, но всё равно утаскивает всю
директорию целиком ·
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
[react19-svg-title-array-children-hydration](/.claude/docs/react19-svg-title-array-children-hydration.md)
⚠️ JSX `<title>{текст} {expr}...</title>` (в т.ч. внутри `<svg>`) даёт React `children`-массив —
React требует одну строку у любого `<title>`, сервер обрезает до первого куска, гидратация рвётся,
recoverable-пересборка поддерева ломает клики соседних Zag.js-компонентов (`Tabs`) — выглядит как
баг самих вкладок, а не как ошибка гидратации ·
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
проверка `.digest` подстрокой ·
[react-pdf-hyphenate-esm-only-exports-tsx-seed-crash](/.claude/docs/react-pdf-hyphenate-esm-only-exports-tsx-seed-crash.md)
⚠️ `tsx`-скрипт (`db:seed`), впервые тянущий `@react-pdf/renderer` (`renderToBuffer`), падает
`ERR_PACKAGE_PATH_NOT_EXPORTED` на `@react-pdf/hyphenate` (только `import`-условие в `exports`,
динамический `import()` не спасает — `tsx` резолвит пути через CJS-хук независимо) — пофикшено
глобально через `patchedDependencies` (`bun patch --ignore-scripts`, обычный `bun patch <pkg>`
триггерит несвязанный сбой `ntsuspend`); следом `ReferenceError: React is not defined` — classic
JSX-transform у esbuild на `"jsx": "preserve"` из `tsconfig.next-app.json`, чинится отдельным
`prisma/tsconfig.seed.json` (`"jsx": "react-jsx"`) + `--tsconfig` у конкретного `db:seed`-таргета,
без правок прикладного кода

## Chakra v3 — ловушки

[chakra-css-memo-prop-order-hydration](/.claude/docs/chakra-css-memo-prop-order-hydration.md)
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
[chakra-slot-recipe-array-merge-truncation](/.claude/docs/chakra-slot-recipe-array-merge-truncation.md)
⚠️ `createSystem()` мержит `theme.slotRecipes.*.slots` ПО ИНДЕКСУ массива, не по значению —
короткий `slots: ['input','trigger']` в partial-override молча вычёркивает `root`/другие слоты
настоящей anatomy на тех же индексах; если на вычеркнутом слоте висели CSS custom properties
(высота/паддинги через `--component-*`), стили другого слота, ссылающиеся на них через `var()`,
браузер просто дропает — найдено на `Field.Combobox` (domwellbes), `select`/`nativeSelect` та же
ошибка ловится незаметно ·
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
[chakra-inverted-surface-color-contrast](/.claude/docs/chakra-inverted-surface-color-contrast.md)
⚠️ соседний, но другой класс — `Tooltip.Content` рисуется на `bg.inverted`/`fg.inverted`
(буквальный обмен `_light`↔`_dark` относительно DEFAULT), обычный семантический цвет
(`green.fg` и т.п.) внутри резолвится по теме страницы, не по инвертированной поверхности слота
— низкий контраст только в одной из двух тем; фикс — вручную поменять `_light`/`_dark` местами,
не просто подобрать «цвет получше» ·
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
но 3 файла ролевых шапок внутри grandslamcup — реальный дубль, кандидат на локальное извлечение ·
[shaka-player-hook-dedup-audit](/.claude/docs/shaka-player-hook-dedup-audit.md) `useShakaPlayer`
(lib, потребитель — folder-player) vs `use-shaka-player.ts` (tracker) — не сводить, владение
состоянием и набор фич расходятся по-настоящему; `apps/animatrona` местная копия оказалась
мёртвым кодом (persistent-video `GlobalVideoProvider` инициализирует Shaka инлайном) и удалена

## Библиотеки и публикация

[lib-entry-points](/.claude/docs/lib-entry-points.md) подпути
`./server`/`./client`, границы, ESLint-ловушки ·
[electron-storage-shared-default-value-mutation](/.claude/docs/electron-storage-shared-default-value-mutation.md)
⚠️ `createJsonStore` на фолбэке (файла нет/не читается) без `mergeDefaults` отдавал саму ссылку
на `defaultValue` — мутация результата на месте (`push`/`sort`/переприсваивание поля) портила
дефолт на весь процесс; проявлялось только при повторном фолбэке после мутации, не сразу;
починено — фолбэк всегда `structuredClone(defaultValue)`; реальные находки без обхода —
`label-printer-desktop` profiles/database/export handlers ·
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
[vitest-alias-redundant-vs-transitive](/.claude/docs/vitest-alias-redundant-vs-transitive.md)
избыточный `resolve.alias`, дублирующий symlink прямой зависимости, — как проверить и когда
alias всё же обязателен (транзитивный импорт без symlink); ⚠️ подпуть `@letar/image-upload/server`
не резолвится без alias даже при прямой зависимости и объявленном `exports` ·
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

## Тесты и форматирование

[e2e-testing](/.claude/docs/e2e-testing.md) ·
[e2e-testing § unscoped Playwright assertions + Zag.js Select scoping](/.claude/docs/e2e-testing.md#unscopedтривиальный-assertion--ловит-не-то-под-параллельной-нагрузкой)
⚠️ `getByText`/`getByRole('row')`/`.first()` без скоупа матчит чужой похожий виджет на странице
под параллельной нагрузкой (`--workers=12`) — фикс через `aria-controls` триггера для Zag.js
Select (Chakra UI v3), готовый хелпер `selectFirstChakraOption` в domwellbes-e2e ·
[persistent-e2e-user-resource-exhaustion](/.claude/docs/persistent-e2e-user-resource-exhaustion.md)
⚠️ фиксированная identity e2e-теста против персистентной staging-БД со временем
исчерпывает любой конечный per-identity ресурс (не только вопросы квиза) — симптом
неотличим от настоящей регрессии, лечится либо свежей identity на прогон, либо
сбросом состояния через существующую self-service-функцию приложения ·
[playwright-testmatch-absolute-path-regex-anchor](/.claude/docs/playwright-testmatch-absolute-path-regex-anchor.md)
⚠️ якорный `RegExp` (`^`) в `testMatch`/`testIgnore` матчится против абсолютного пути файла, не
относительно `testDir` — никогда не совпадает, чинится glob-строкой ·
[unit-testing](/.claude/docs/unit-testing.md) ⚠️ обязательный `tsconfig.spec.json` ·
[vitest-jsdom-formdata-request-hang](/.claude/docs/vitest-jsdom-formdata-request-hang.md) ⚠️
Route Handler-тест с `Request`+`FormData` под глобальным `environment: 'jsdom'` — `await
request.formData()` зависает до таймаута вместо ошибки, фикс — `@vitest-environment node` в
docblock файла ·
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
[react-native-eslint-flat-config-eslint10](/.claude/docs/react-native-eslint-flat-config-eslint10.md)
⚠️ пресет `@react-native/eslint-config/flat` под ESLint 10 роняет прогон целиком
(`context.getSourceCode is not a function` из `eslint-plugin-eslint-comments@3.2.0`), та же
несовместимость у `eslint-plugin-react-native@5.0.0` — RN-правила (`no-unused-styles`,
`no-inline-styles`, …) недоступны; рабочий `@react-native/eslint-plugin` резолвится только
через `createRequire`, а сам файл конфига без починки блока `lint` в `project.json` таргет
не создаёт ·
[oxlint-eslint-disable-directive-namespace-mismatch](/.claude/docs/oxlint-eslint-disable-directive-namespace-mismatch.md)
⚠️ `oxlint-disable*` и `eslint-disable*` — раздельные неймспейсы директив подавления, не
взаимозаменяемые даже при совпадении имени правила (`react-hooks/exhaustive-deps` реализован в
обоих линтерах отдельно) — найдено и исправлено 9 мест без парной директивы ·
[dprint-typescript-nested-aschild-comment-instability](/.claude/docs/dprint-typescript-nested-aschild-comment-instability.md)
⚠️ `Formatting not stable` — комментарий перед JSX на третьем уровне вложенных `Box asChild` ·
[dprint-markdown-table-reformat](/.claude/docs/dprint-markdown-table-reformat.md) ⚠️ dprint
пересчитывает ширину столбцов при каждом прогоне — `Edit` по соседней строке таблицы падает на
«верном» тексте ·
[prettier-dprint-conflict-root-cause](/.claude/docs/prettier-dprint-conflict-root-cause.md) ⚠️
голая `nx format` — это Prettier, не dprint; `NX_SKIP_FORMAT` её не гасит

## Деплой и инфраструктура

[deployment](/.claude/docs/deployment.md) ·
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
[nextjs-standalone-bind-mount-wrong-cwd](/.claude/docs/nextjs-standalone-bind-mount-wrong-cwd.md)
⚠️ standalone `server.js` делает `process.chdir()` в свою директорию — реальный `process.cwd()`
рантайма `/app/apps/<app>`, не `WORKDIR /app` образа; бинд-маунт на «наивный» путь монтируется
успешно, но пишущий код молча создаёт директорию в writable-слое контейнера мимо хоста, ошибка
не долетает никуда, байты пропадают на следующем деплое — найдено на приватных файлах domwellbes
(2026-09-15), не восстановить, только перезалить ·
[docker-bind-mount-uid-gid-mismatch](/.claude/docs/docker-bind-mount-uid-gid-mismatch.md) ⚠️
соседний, но другой класс — путь монтирования верный, но хостовая директория и рантайм-
пользователь контейнера расходятся по uid/gid, права `other` блокируют запись (`EACCES`);
отличать по `docker exec <container> id` vs `stat -c '%u:%g' <host-path>`, быстрая проверка —
`docker exec <container> sh -c 'touch <path>/testwrite && rm <path>/testwrite'`; найдено на
`private-uploads` domwellbes (2026-09-15), фикс — `chown` директории на хосте ·
[docker-bare-bun-workspace-deps](/.claude/docs/docker-bare-bun-workspace-deps.md) ·
[alpine-cdn-unreachable-s3](/.claude/docs/alpine-cdn-unreachable-s3.md) ⚠️ с s3 нет пути до
`dl-cdn.alpinelinux.org` вообще (ни IPv4, ни IPv6, ни с хоста, ни из контейнера) при рабочих
GitHub/npm/registry — `apk add` в сборке падает, фикс — зеркало; там же ловушка диагностики:
`nc` на s3 не установлен и даёт ложный FAIL на любом адресе ·
[docker-network-endpoint-corruption-diskfull](/.claude/docs/docker-network-endpoint-corruption-diskfull.md)
⚠️ диск на 100% рвёт docker-network endpoint (пустой IP) у части контейнеров БД —
`getaddrinfo ENOTFOUND`, healthcheck внутри контейнера этого не видит, чинится строго
`docker restart <db>` **до** `docker restart <app>` ·
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
[nginx-referer-and-header-quirks](/.claude/docs/nginx-referer-and-header-quirks.md) ⚠️
`valid_referers` внутри `include` не парсится (`directive is not allowed here`) — только
литерал в файле или envsubst-шаблон; `proxy_ignore_headers` не убирает заголовок из ответа
клиенту, нужен `proxy_hide_header` ·
[backup-architecture](/.claude/docs/backup-architecture.md) ·
[secret-manager](/.claude/docs/secret-manager.md) SOPS + age ·
[sops-env-encrypt-input-path-matching](/.claude/docs/sops-env-encrypt-input-path-matching.md) ⚠️
`sops --encrypt --output <out> <in>` матчит `.sops.yaml` по пути `<in>`, не `<out>` — временный
plaintext с произвольным именем не совпадает с creation_rules; плюс dotenv vs бинарный формат
`.enc` требует разных флагов на decrypt/encrypt — рецепт `scripts/sops-env-set.sh` ·
[redis-security](/.claude/docs/redis-security.md) ·
[redis-client-not-ready-at-startup](/.claude/docs/redis-client-not-ready-at-startup.md) ⚠️
`getRedis()` из `@letar/redis-client` отдаёт **не-null** клиент со статусом `connecting`
(`lazyConnect` + `connect()` без await), а `enableOfflineQueue: false` не даёт первой команде
подождать — любое чтение из Redis **на пути старта процесса** падает
`Stream isn't writeable`, `try/catch` его честно логирует, но повторной попытки нет и
состояние теряется безвозвратно; ловушка второго порядка к фиксу 2026-08-08 — очередь
возвращать НЕЛЬЗЯ, ждать нужно события `ready` с границей по времени, причём внешний
`withTimeout` обязан быть больше внутреннего ожидания ·
[cron-endpoint-registration-checklist](/.claude/docs/cron-endpoint-registration-checklist.md) ⚠️
новый `/api/cron/*` требует три правки не в scope пишущего приложения (`CRON_SECRET`,
`dashboard-agent/cron.ts`, порт/host в `infra-config`) — иначе тихий 401 или ненайденный маршрут

## Прокси (`infra/`)

[nginx-proxy-manager](/infra/nginx-proxy-manager/README.md) ⛔ снят
и с s3 (2026-08-08), и с s2 (2026-08-31) — история, не текущее состояние ·
[acme-dns](/infra/acme-dns/README.md) ⭐ wildcard-TLS без API регистратора ·
[traefik](/infra/traefik/README.md) боевой на s2 и s3

## Безопасность и право

[personal-data](/.claude/docs/personal-data.md) ⭐ 152-ФЗ, РКН, cookie ·
[upload-path-traversal](/.claude/docs/upload-path-traversal.md) почему `path.join`+`startsWith` не
защищают · [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) ⚠️ JSON-справочник
утёк в бандл; греп по имени ключа даёт ложноотрицательный результат ·
[advertising-law-boundaries](/.claude/docs/advertising-law-boundaries.md) ·
[tochka-acquiring-site-requirements](/.claude/docs/tochka-acquiring-site-requirements.md)

## Auth, профиль, админка

[auth](/.claude/docs/auth.md) · [admin](/.claude/docs/admin.md) ·
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
[better-auth-pages-option-dead-code](/.claude/docs/better-auth-pages-option-dead-code.md) ⚠️
`pages: {signIn, signUp, ...}` в объекте `betterAuth({...})` — не существующая опция ядра (нет ни
в одной версии `better-auth`/`@better-auth/core` в `node_modules/.bun`), молча проходит typecheck
из-за generic-сигнатуры `<Options extends BetterAuthOptions>(options: Options & {})`, отключающей
excess-property-check; дублирующийся мёртвый блок нашёлся сразу в 7 standalone-приложениях ·
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
studio) ·
[dev-session-token-plus-char-query-corruption](/.claude/docs/dev-session-token-plus-char-query-corruption.md)
⚠️ `+` в query-параметре `?token=` `application/x-www-form-urlencoded`-декодируется в пробел до
сравнения — base64-токен без ручного `%2B` даёт 403 при формально верном значении; починено
2026-09-09 в `createDevSessionRoute` (общая фабрика всех 11 приложений с dev-session route) ·
[email-code-verification-pattern](/.claude/docs/email-code-verification-pattern.md) код из письма
(плагин Better Auth `emailOTP`) + SSE-уведомление других вкладок через подписанную cookie —
почему `overrideDefaultEmailVerification` не работает (`defu`-склейка опций), общий слой
`@letar/auth/server`/`@letar/pin-auth/client`

## Электрон и десктоп

[electron-app-protocol](/.claude/docs/electron-app-protocol.md) ⚠️ origin
`null` под `file://` блокирует Worker и WASM ·
[electron-monorepo-shared-releases](/.claude/docs/electron-monorepo-shared-releases.md) ⭐
несколько Electron-приложений публикуют GitHub Releases в один общий `kamiletar/letar` —
repo-wide `/releases/latest` вернёт чужой релиз; единая схема (тег `<app>-v<semver>`,
`--publish never` + `gh release`, рантайм `@letar/electron-monorepo-updater`) на все такие
приложения, чек-лист для нового ·
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
[electron-window-controls-overlay-pattern](/.claude/docs/electron-window-controls-overlay-pattern.md)
`titleBarStyle: 'hidden'` + `titleBarOverlay` вместо `frame: false` — сохраняет нативные Snap
Layouts Windows 11, `env(titlebar-area-*)` под безопасную зону системных кнопок ·
[native-win32-ui-verification-screenshot](/.claude/docs/native-win32-ui-verification-screenshot.md)
живая проверка UI, не существующего для Browser pane (GDI-оверлей, трей, нативные диалоги) —
PowerShell `keybd_event` (физическая клавиша, не `SendMessage`) + `CopyFromScreen`; ⚠️ двоение
на скриншоте — не баг рендера, а параллельно работающая прод-копия того же Electron-приложения,
тоже слушающая `GetAsyncKeyState` ·
[vite-dev-letar-ui-barrel-process-undefined](/.claude/docs/vite-dev-letar-ui-barrel-process-undefined.md)
⚠️ импорт из barrel `@letar/ui` под Vite dev тянет `next/*` в пребандл, `process.env` на верхнем
уровне модуля падает `ReferenceError` в Electron renderer без `process` — временный шим в
`index.html`, корневой фикс — подпути-экспорты либы ·
[react-native-087-breaking-changes](/.claude/docs/react-native-087-breaking-changes.md) ⚠️ миграция
RN 0.85→0.87: пути codegen-типов, `PressableStateCallbackType` interface→type ломает declaration
merging без ошибки компиляции, и другие TS-грабли ·
[android-agp9-windows-toolchain-pitfalls](/.claude/docs/android-agp9-windows-toolchain-pitfalls.md)
⚠️ AGP 9.0+ built-in Kotlin конфликтует с явным `org.jetbrains.kotlin.android` (обход —
`android.builtInKotlin=false`) · Windows `ninja.exe` из NDK не читает `LongPathsEnabled`, лимит
260 символов игнорирует системную настройку, обход — `subst` на короткую букву диска

## Медиа, почта, звук

[media-server](/.claude/docs/media-server.md) · [email](/.claude/docs/email.md) ·
[maddy-creds-create-missing-imap-acct](/.claude/docs/maddy-creds-create-missing-imap-acct.md) ⚠️
`maddy creds create` заводит только SMTP/IMAP-логин, не хранилище — приём почты на новый адрес
требует ещё `maddy imap-acct create`, иначе `501 5.1.1 User does not exist` при формально
существующем `creds list` ·
[transactional-email-cron-pattern](/.claude/docs/transactional-email-cron-pattern.md) паттерн
cron-рассылок: найти кандидатов → отправить → пометить дедуп-поле; транзакционное письмо vs
маркетинг с консент-гейтом ·
[imapflow-error-listener-hang-pitfall](/.claude/docs/imapflow-error-listener-hang-pitfall.md) ⚠️
слушателя `'error'` у `ImapFlow` достаточно, чтобы не уронить процесс, но не достаточно, чтобы
гарантировать возврат из зависшего `await` — нужен внешний `Promise.race` с жёстким дедлайном ·
[web-push](/.claude/docs/web-push.md) ·
[offlineaudiocontext-suspend-render-race](/.claude/docs/offlineaudiocontext-suspend-render-race.md) ·
[chromium-video-codec-limits](/.claude/docs/chromium-video-codec-limits.md) ⚠️ Chromium/Electron не
декодирует H.264 Hi10P (запрет профиля, не пробел ffmpeg) — обход через WASM+WebCodecs
(`@libmedia/avplayer`), не через патч рантайма или встраивание mpv в окно

## Продукт и контент

[ecommerce-cart-orders](/.claude/docs/ecommerce-cart-orders.md) ·
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

## Правила репозитория

[public-repo-hygiene](/.claude/rules/public-repo-hygiene.md) ⭐ что нельзя
писать в публичные файлы · [time-tracking](/.claude/rules/time-tracking.md) ⚠️ когда стартовать и
останавливать таймер studio ·
[time-tracker-drift-incidents](/.claude/docs/time-tracker-drift-incidents.md) ⚠️ разборы четырёх
способов потерять время: хук на `Stop` (срабатывает после каждой реплики, из-за чего таймер
останавливали десять раз за сессию), смена предмета работы без `time_switch` — межпроектная
(ловится эвристикой хука) и внутри одного приложения (не ловится по построению), и автозакрытие
`autoClosedIdle` в двух окнах: после сжатия контекста и в середине активной работы с редкими
вызовами инструментов; общая черта всех четырёх — о пропаже узнаёт пользователь, потому что
heartbeat продлевает только уже идущую запись и про закрытую молчит ·
[formatting](/.claude/rules/formatting.md) ⚠️ голая `nx format`
молча зашита на Prettier — не падает, не то же самое, что `nx run-many -t format`
