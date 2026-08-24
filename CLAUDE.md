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
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md) разборы гонок между
агентами: почему правила git такие строгие ·
[git-pathspec-commit-ignored-deletion](/.claude/docs/git-pathspec-commit-ignored-deletion.md) ⚠️
`git commit -- <path>` молча теряет `git rm --cached`, если путь уже в `.gitignore` ·
[nx-convert-to-inferred-scope-regression](/.claude/docs/nx-convert-to-inferred-scope-regression.md)
⚠️ `nx g @nx/*:convert-to-inferred` тихо меняет реальный охват таргета у проектов с кастомными
настройками — диффать до/после, не доверять «отработал без ошибок» ·
[bun-lockfile-private-submodules](/.claude/docs/bun-lockfile-private-submodules.md) ⚠️
`--frozen-lockfile` падает везде, где submodule не выкачаны; чистка `bun.lock` не держится ·
[bun-install-stale-isolated-cache](/.claude/docs/bun-install-stale-isolated-cache.md) ⚠️
несколько версий пакета в `node_modules/.bun` после снятия пина — не признак незавершённого
резолва, обычный `bun install` не прунит устаревшие isolated-копии; сверять по `bun.lock`,
чинить — `bun install --force`

**MCP-серверы:** [mcp-servers](/.claude/docs/mcp-servers.md) состав и назначение ·
[mcp-server-pattern](/.claude/docs/mcp-server-pattern.md) тонкий локальный сервер по stdio ·
[mcp-sse-bridge](/.claude/docs/mcp-sse-bridge.md) мост stdio-процесс ↔ открытая страница ·
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md) баги координации: contact
approval, kebab-case в `to`, обнулённая база

**База данных и ZenStack:** [database](/.claude/docs/database.md) ·
[seed-scripts](/.claude/docs/seed-scripts.md) идемпотентный `prisma/seed.ts` ·
[zenstack-decimal-optional-fields](/.claude/docs/zenstack-decimal-optional-fields.md) optional
`Decimal` не принимает `number` ·
[zenstack-typed-interface-json-snapshot](/.claude/docs/zenstack-typed-interface-json-snapshot.md)
именованный `interface` без index signature не проходит в `Json`-поле, фикс —
`JSON.parse(JSON.stringify(...))` ·
[zenstack-public-write-read-back](/.claude/docs/zenstack-public-write-read-back.md) публичный
`@@allow('create')` не даёт прочитать запись назад ·
[zenstack-generated-prisma-client](/.claude/docs/zenstack-generated-prisma-client.md) лишний
`generator client` — не признак дрейфа схемы ·
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
[tree-model-parent-select](/.claude/docs/tree-model-parent-select.md) self-referencing `parentId`

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
[letar-forms-post-submit-reset-stale-initialvalue](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md)
⚠️ пост-сабмит `reset(dataToSubmit)` снимает `isTouched` — следующий рендер со статическим
`initialValue` (не «что реально отправлено») перетирает поле, бьёт по любому полю, не только
select ·
[ui-components](/.claude/docs/ui-components.md) · [images](/.claude/docs/images.md) ·
[font-cmap-coverage-verification](/.claude/docs/font-cmap-coverage-verification.md) описание
шрифта на сайте лжёт — покрытие символов проверять разбором `cmap` файла; для Node-стека
монорепо — fontkit+subset-font (чтение cmap из woff2 и сам субсеттинг, не только верификация) ·
[sharp-raw-composite-alpha-pitfall](/.claude/docs/sharp-raw-composite-alpha-pitfall.md) ⚠️
`composite()` над raw-буферами тихо добавляет alpha-канал даже при `create({channels:3})` ·
[gallery-pattern](/.claude/docs/gallery-pattern.md) Dropzone + SortablePhotoGrid ·
[period-navigation-pattern](/.claude/docs/period-navigation-pattern.md) навигация по периоду без JS ·
[data-flag-driving-ui](/.claude/docs/data-flag-driving-ui.md) ⚠️ `isDemo`/`isDraft` попал в условие
рендера — контент демо-записи не виден никогда ·
[faceted-catalog-pitfalls](/.claude/docs/faceted-catalog-pitfalls.md) фасетные фильтры каталога ·
[raf-vs-timers-background-tab](/.claude/docs/raf-vs-timers-background-tab.md) ⚠️ `rAF` замирает в
фоновой вкладке, `setTimeout`/`setInterval` там душится до раза в секунду/минуту — выбор не
взаимозаменяем

**Данные и состояние:** [data-fetching](/.claude/docs/data-fetching.md) ·
[pwa-offline](/.claude/docs/pwa-offline.md) ·
[react-effect-stable-ref-pitfall](/.claude/docs/react-effect-stable-ref-pitfall.md) эффект с deps на
ref/DOM не перезапускается

**Next.js — ловушки:** [nextjs-standalone-tracing](/.claude/docs/nextjs-standalone-tracing.md)
ECONNREFUSED/ERR_DLOPEN_FAILED при зелёном билде ·
[nextjs-server-action-redirect-race](/.claude/docs/nextjs-server-action-redirect-race.md) ·
[nextjs-server-action-decimal-serialization](/.claude/docs/nextjs-server-action-decimal-serialization.md)
«Only plain objects can be passed to Client Components» ·
[nextjs-static-export-rsc-paths](/.claude/docs/nextjs-static-export-rsc-paths.md) ·
[nextjs-ssr-browser-only-libs](/.claude/docs/nextjs-ssr-browser-only-libs.md) `self is not defined` ·
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
[nextjs-compound-component-server-boundary](/.claude/docs/nextjs-compound-component-server-boundary.md)
⚠️ compound-экспорт (`Object.assign`) для клиентского компонента не резолвится через границу
Server→Client — property-access ломается, `undefined` ·
[nextjs-revalidatepath-outside-request-scope](/.claude/docs/nextjs-revalidatepath-outside-request-scope.md)
⚠️ `revalidatePath` из функции, переиспользуемой в фоновой задаче (`@letar/jobs`) без request
scope — Invariant вместо обновления кеша ·
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

**Chakra v3 — ловушки:** [chakra-multi-system-ssr-barrel-trap](/.claude/docs/chakra-multi-system-ssr-barrel-trap.md) ⚠️
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
[theme-hardcode-gate-coverage](/.claude/docs/theme-hardcode-gate-coverage.md) гейт сырых
цветов/теней/transition (`theme:check` в domwellbes) — только у одного приложения из ~30, рано
тиражировать через generator, слепые зоны и структурные отличия (нет `src/theme/` у части
приложений) сначала нужно закрыть на втором реальном потребителе ·
[chakra-semantic-token-contract](/.claude/docs/chakra-semantic-token-contract.md) ⚠️ стоковые
рецепты Chakra читают `bg.panel`/`fg.error`/`border.control`/`l1..l3`/`colorPalette.*` напрямую —
не переопределил в своих `semanticTokens` → холодные цвета мимо палитры и провал WCAG AA; 14 из
15 приложений с темой пробел не закрыли ·
[chakra-overflow-wrap-not-inherited](/.claude/docs/chakra-overflow-wrap-not-inherited.md) ⚠️
`overflow-wrap`/аналогичное CSS-свойство на предке не наследуется потомком, для которого Chakra
reset (`preflight`) уже задаёт своё явное значение — фикс только через `'& *'` на предке ·
[chakra-heading-defaults-to-h2](/.claude/docs/chakra-heading-defaults-to-h2.md) ⚠️ `Heading` —
`withContext("h2")`, без `asChild`+`<h1>` страница может не иметь ни одного настоящего `<h1>`;
ни lint, ни typecheck, ни глаз на скриншоте это не покажет

**Библиотеки и публикация:** [lib-entry-points](/.claude/docs/lib-entry-points.md) подпути
`./server`/`./client`, границы, ESLint-ловушки ·
[npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md) внутренние `@letar/*` — только
в `devDependencies` · [vitest-alias-prefix-matching](/.claude/docs/vitest-alias-prefix-matching.md)
alias матчится по префиксу ·
[vitest-unlinked-workspace-lib-imports](/.claude/docs/vitest-unlinked-workspace-lib-imports.md) ⚠️
`@letar/*`-либа только в `implicitDependencies` (без bun-симлинка) не резолвится под vitest ·
[vitest-shared-singleton-row-race](/.claude/docs/vitest-shared-singleton-row-race.md) ⚠️ общая
singleton-строка настроек (`ShopSettings` и аналоги) — редкий флак под полным прогоном из-за
файлового параллелизма vitest на общей dev-БД, не внутри одного файла ·
[zod-computed-key-index-access-pitfall](/.claude/docs/zod-computed-key-index-access-pitfall.md) ⚠️
`z.object({...Object.fromEntries(arr.map(...))})` — динамический ключ ловит TS7053 не всегда,
зависит от формы callback'а, а не от структуры массива ключей ·
[eslint-flat-react-typescript-missing-react-hooks-plugin](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md)
⚠️ `nx.configs['flat/react-typescript']` не регистрирует `eslint-plugin-react-hooks` — правило
`exhaustive-deps`/`rules-of-hooks` не проверялось ни в одном из ~22 приложений с этим паттерном

**Тесты и форматирование:** [e2e-testing](/.claude/docs/e2e-testing.md) ·
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
[verification-pitfalls § getComputedStyle при скрытой панели](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-сервер-getcomputedstyle-врёт-при-скрытой-панели-браузера)
⚠️ анимируемое свойство читается как тождественная матрица — выглядит как «эффект не работает» ·
[verification-pitfalls § заголовки HTML не говорят про статику](/.claude/docs/verification-pitfalls.md#тот-же-класс-но-не-про-отдельный-запрос-заголовки-html-ответа-не-говорят-ничего-про-статику)
⚠️ `content-encoding` HTML-ответа не доказывает сжатие `.js`/`.css` — проверять по типу контента ·
[docker-bind-mount-pitfalls](/.claude/docs/docker-bind-mount-pitfalls.md) ⚠️
`compose up -d` не перечитывает смонтированный конфиг ·
[docker-bare-bun-workspace-deps](/.claude/docs/docker-bare-bun-workspace-deps.md) ·
[dotenvx-stdout-migration-pollution](/.claude/docs/dotenvx-stdout-migration-pollution.md) P3018 ·
[external-services-blocked-from-s2](/.claude/docs/external-services-blocked-from-s2.md) ·
[dashboard-agent-alert-debounce-patterns](/.claude/docs/dashboard-agent-alert-debounce-patterns.md) ·
[server-provision](/.claude/docs/server-provision.md) · [server-recovery](/.claude/docs/server-recovery.md) ·
[server-migration-letar](/.claude/docs/server-migration-letar.md) архив переезда ·
[firewall](/.claude/docs/firewall.md) ⚠️ `ufw` не фильтрует порты Docker ·
[backup-architecture](/.claude/docs/backup-architecture.md) ·
[secret-manager](/.claude/docs/secret-manager.md) SOPS + age ·
[redis-security](/.claude/docs/redis-security.md) ·
[cron-endpoint-registration-checklist](/.claude/docs/cron-endpoint-registration-checklist.md) ⚠️
новый `/api/cron/*` требует три правки не в scope пишущего приложения (`CRON_SECRET`,
`dashboard-agent/cron.ts`, порт/host в `infra-config`) — иначе тихий 401 или ненайденный маршрут

**Прокси (`infra/`):** [nginx-proxy-manager](/infra/nginx-proxy-manager/README.md) действующий ·
[acme-dns](/infra/acme-dns/README.md) ⭐ wildcard-TLS без API регистратора ·
[traefik](/infra/traefik/README.md) пилот замены NPM на s3

**Безопасность и право:** [personal-data](/.claude/docs/personal-data.md) ⭐ 152-ФЗ, РКН, cookie ·
[upload-path-traversal](/.claude/docs/upload-path-traversal.md) почему `path.join`+`startsWith` не
защищают · [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) ⚠️ JSON-справочник
утёк в бандл; греп по имени ключа даёт ложноотрицательный результат ·
[advertising-law-boundaries](/.claude/docs/advertising-law-boundaries.md) ·
[tochka-acquiring-site-requirements](/.claude/docs/tochka-acquiring-site-requirements.md)

**Auth, профиль, админка:** [auth](/.claude/docs/auth.md) · [admin](/.claude/docs/admin.md) ·
[user-profile](/.claude/docs/user-profile.md)

**Электрон и десктоп:** [electron-app-protocol](/.claude/docs/electron-app-protocol.md) ⚠️ origin
`null` под `file://` блокирует Worker и WASM ·
[electron-net-fetch-tun-vpn](/.claude/docs/electron-net-fetch-tun-vpn.md) ⚠️ `net.fetch` падает под
TUN-VPN; DNS-проверки с рабочей машины врут ·
[electron-sqlite](/.claude/docs/electron-sqlite.md) ·
[react-native-087-breaking-changes](/.claude/docs/react-native-087-breaking-changes.md) ⚠️ миграция
RN 0.85→0.87: пути codegen-типов, `PressableStateCallbackType` interface→type ломает declaration
merging без ошибки компиляции, и другие TS-грабли

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
[payment-webhook-idempotency-pattern](/.claude/docs/payment-webhook-idempotency-pattern.md)
уникальный ID события + select-then-create + guard по терминальному статусу; расхождение aboi
(только status-guard, без таблицы событий) — не образец для переноса ·
[idempotency-key-terminal-transition-pattern](/.claude/docs/idempotency-key-terminal-transition-pattern.md)
unique `idempotencyKey` (`proposal-terminal:<id>`, `contract-issued:<id>`) + try/catch на append-only
event-sourced переходе — не путать с select-then-create для внешних вебхук-событий выше ·
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

Ставит связку из двух хуков: `pre-commit-scope-guard.sh` (блокирует голый `git commit`/`git add -A`,
затянувший файлы из нескольких несвязанных `apps/*`/`libs/*` — типовая причина, по которой один
агент коммитит чужую незакоммиченную работу другого; подробнее и обход для легитимных multi-scope
коммитов — [git.md § Работа рядом с другими агентами](/.claude/rules/git.md)) и `pre-commit-sops.sh`
(авто-шифрует `.env.docker` → `.env.docker.enc` перед каждым коммитом, если доступен sops +
age-ключ; подробнее — [secret-manager](/.claude/docs/secret-manager.md)).

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

**Формы:** `schema.zmodel` @form.\* → `nx zenstack:generate` → `createForm()` инстанс → `form-mcp` MCP → `@letar/forms`. Каждое приложение **ОБЯЗАНО** иметь свой `createForm` инстанс (образец: `driving-school`). Если фичи нет — делегируй через agent-mail (`.claude/rules/form-delegation.md`). ⚠️ **Перед работой прочитай** `libs/forms/README.md`.

**Data Fetching:** Гибридный подход — React 19 хуки для форм, TanStack Query для списков. См. [Data Fetching](/.claude/docs/data-fetching.md).

**Мультитенантность:** `driving-school` — эталон реализации Better Auth Organizations + ZenStack access policies. См. `.claude/skills/zenstack-helper/reference/zenstack-better-auth.md`.

**Команды:** `nx dev|build|test|lint|format|typecheck:tsgo <app>`, `nx zenstack:generate|db:push|db:migrate|db:studio <app>`, `nx e2e <app>-e2e`. Подробнее: [environment](/.claude/docs/environment.md)

---

**Обновлено:** 2026-08-10 | **Nx** 22.6 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

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
