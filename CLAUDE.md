# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Общайся со мной на русском

## Документация

Подробная документация в `.claude/docs/`: [repo-structure](/.claude/docs/repo-structure.md) ⭐ (публичный + приватные submodules), [environment](/.claude/docs/environment.md), [forms](/.claude/docs/forms.md), [data-fetching](/.claude/docs/data-fetching.md), [ui-components](/.claude/docs/ui-components.md), [database](/.claude/docs/database.md), [seed-scripts](/.claude/docs/seed-scripts.md) (конвенция идемпотентных `prisma/seed.ts` для ZenStack v3 — прямое подключение `ZenStackClient`, `upsert` по естественному ключу vs `findFirst`+`create` без него, Nx target `db:seed`), [auth](/.claude/docs/auth.md), [architecture](/.claude/docs/architecture.md), [mcp-servers](/.claude/docs/mcp-servers.md), [mcp-server-pattern](/.claude/docs/mcp-server-pattern.md) (паттерн «тонкий локальный MCP-сервер по stdio»: deploy-mcp/form-mcp/studio-time-mcp, точный пин `@modelcontextprotocol/sdk` против TS2769), [deployment](/.claude/docs/deployment.md), [code-style](/.claude/docs/code-style.md), [documentation-guidelines](/.claude/docs/documentation-guidelines.md), [e2e-testing](/.claude/docs/e2e-testing.md), [unit-testing](/.claude/docs/unit-testing.md) ⚠️ (vitest + vite 8 oxc: обязательный tsconfig.spec.json), [images](/.claude/docs/images.md), [email](/.claude/docs/email.md), [pwa-offline](/.claude/docs/pwa-offline.md), [user-profile](/.claude/docs/user-profile.md), [admin](/.claude/docs/admin.md), [personal-data](/.claude/docs/personal-data.md) ⭐ (152-ФЗ, РКН, cookie-согласия, чекбоксы ПДн), [public-repo-hygiene](/.claude/rules/public-repo-hygiene.md) ⭐ (что запрещено писать в публичные `PLAN.md`/`PLAN-INFRA.md`/`PLAN_COMPLETED.md`/`.claude/docs/*` — коммерческие детали приватных приложений вынесены в submodule `.claude/private/`), [time-tracking](/.claude/rules/time-tracking.md) ⚠️ (когда стартовать/переключать/останавливать таймер studio; `Stop` — конец реплики, а не сессии, поэтому таймер НЕ останавливается после каждого ответа; `time_pause` — настоящая пауза с `time_resume`, старое поведение «стоп с пометкой небиллируемое» переехало на `time_discard`), [media-server](/.claude/docs/media-server.md) (загрузка/транскод видео, BullMQ+ffmpeg, интеграция новых приложений), [nextjs-standalone-tracing](/.claude/docs/nextjs-standalone-tracing.md) (пропущенные файлы при `output: 'standalone'` + bun — ECONNREFUSED/ERR_DLOPEN_FAILED при успешном билде), [nextjs-server-action-redirect-race](/.claude/docs/nextjs-server-action-redirect-race.md) (Server Action тащит за собой RSC-рендер вызывающей страницы — гонка с её собственным `redirect()`, чинится `redirect()` внутри action'а), [zenstack-decimal-optional-fields](/.claude/docs/zenstack-decimal-optional-fields.md) (опциональное `Decimal`-поле в ZenStack не принимает `number` в отличие от обязательного — сгенерированный Prisma input type у optional-поля уже, чинится `as unknown as Decimal` из `decimal.js`), [nextjs-server-action-decimal-serialization](/.claude/docs/nextjs-server-action-decimal-serialization.md) (Server Action возвращает из `create`/`update` без `select` полный объект модели с `Decimal`-полем — RSC-протокол не сериализует class-инстансы, «Only plain objects can be passed to Client Components»; чинится `select: { id: true }` вместо возврата полной модели), [nextjs-static-export-rsc-paths](/.claude/docs/nextjs-static-export-rsc-paths.md) (Next.js 16 `output: 'export'` — RSC-пути на диске расходятся с путями, которые запрашивает клиентский роутер, ломает клиентскую навигацию; чинится build adapter'ом), [verification-pitfalls](/.claude/docs/verification-pitfalls.md) ⭐ (проверки, которые врут в успокаивающую сторону — `ufw status: active` без фильтрации, `docker ps: healthy` при недоступном сервисе, `du` без root, `.conf` против SQLite у NPM, проба порта по имени вместо IP; общий принцип — проверять тем же путём, которым ходит настоящий потребитель, и всегда с положительным контролем), [docker-bind-mount-pitfalls](/.claude/docs/docker-bind-mount-pitfalls.md) ⚠️ (две ловушки bind-mount'ов, обе выглядят как успех: `docker compose up -d` **не** перечитывает смонтированный конфиг — compose сравнивает описание сервиса, а не содержимое файлов, поэтому проверка результата правки может соврать в опасную сторону, нужен `docker restart` + сверка по логу; и точка монтирования может быть занята файлом внутри образа — `not a directory` при существующем каталоге-источнике жалуется на назначение, а не на источник. Плюс отдельный урок про диагностику: тест, меняющий две переменные разом, не подтверждает гипотезу, а совпадает с ней), [docker-bare-bun-workspace-deps](/.claude/docs/docker-bare-bun-workspace-deps.md) (bare Bun/Node-сервисы вроде dashboard-agent с изолированным `bun install` — внутренние непубликуемые `@letar/*`-зависимости резолвятся только через синтетический мини-workspace, иначе 404 на npm; плюс опциональные нативные биндинги и относительные symlink'и bun при копировании в прод-стейдж), [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) ⚠️ (большие JSON-справочники утекают в клиентский бандл через value-импорт; наивная проверка грепом по имени ключа даёт ложноотрицательный результат — webpack вырезает ключ tree-shaking'ом, нужен греп по данным с положительным контролем; плюс второй, независимый канал утечки приватных полей — публичное/партнёрское API, где защита от бандла не работает и нужны field-level ZenStack-политики), [nextjs-ssr-browser-only-libs](/.claude/docs/nextjs-ssr-browser-only-libs.md) (статический импорт browser-only библиотеки типа `shaka-player` в `'use client'`-компоненте всё равно роняет SSR-пререндер — `self is not defined`; чинится динамическим `import()` внутри `useEffect`), [electron-net-fetch-tun-vpn](/.claude/docs/electron-net-fetch-tun-vpn.md) ⚠️ (Electron `net.fetch` может падать `net::ERR_FAILED` под TUN-VPN, хотя обычный Node `fetch` тот же запрос проходит — TUN режет по TLS-отпечатку, не по прокси-настройкам, `session.setProxy` тут бессилен; **побочное следствие вне Electron** — под тем же TUN любые DNS-проверки с рабочей машины врут, отдавая Fake-IP из `198.18.0.0/15`, причём явное `-Server` не помогает: проверять только через DoH или с сервера), [electron-app-protocol](/.claude/docs/electron-app-protocol.md) ⚠️ (renderer под `file://` имеет origin `null` — Chromium блокирует Web Worker и WASM/`fetch` к соседним файлам, ловится только на живом запуске; привилегированная схема `app://` вместо `loadFile()`, попутно снимает хак `assetPrefix: './'` и лимит «одна страница на корне»), [advertising-law-boundaries](/.claude/docs/advertising-law-boundaries.md) (ФЗ «О рекламе» ст. 5/24, ЗоЗПП ст. 10, маркировка erid/ОРД/ЕРИР, границы вознаграждения за отзывы на маркетплейсах — общий рекламно-правовой минимум для B2C-приложений, без привязки к конкретному ИП/домену), [offlineaudiocontext-suspend-render-race](/.claude/docs/offlineaudiocontext-suspend-render-race.md) (детерминированный рендер через `OfflineAudioContext` — дедлок `suspend()`/`startRendering()` при неверном порядке вызовов + молчаливая тишина в AudioWorklet-движках из-за гонки `postMessage`, оба бага не ловятся build/lint/typecheck), [mcp-sse-bridge](/.claude/docs/mcp-sse-bridge.md) (мост между отдельным stdio MCP-процессом и открытой страницей браузера через Next.js API-роуты — SSE-поток + `globalThis`-синглтон шины событий, гонка `EventSource` auto-reconnect при живой отладке, `trailingSlash` и CJS top-level-await грабли), [react-effect-stable-ref-pitfall](/.claude/docs/react-effect-stable-ref-pitfall.md) (эффект с deps на ref/DOM-элемент не перезапускается повторно: либо навешивается до монтирования реального узла при условном skeleton-рендере, либо зависит от персистентного объекта, стабильного всё время жизни приложения, — callback-ref вместо `useRef`+`useLayoutEffect([])`, событие как источник повторного срабатывания вместо самого объекта), [tochka-acquiring-site-requirements](/.claude/docs/tochka-acquiring-site-requirements.md) (обезличенный чек-лист требований Точка Банка к сайту для подключения интернет-эквайринга — оферта, цены, реквизиты, HTTPS-редирект и т.д.), [web-push](/.claude/docs/web-push.md) (VAPID + npm `web-push` — прямая реализация studio vs repo/provider-абстракция driving-school, почему не выносим в `libs/` при двух примерах и что будет сигналом для выноса), [paginated-web-source-reading](/.claude/docs/paginated-web-source-reading.md) (чтение внешнего источника на десятки страниц без SSR — конвейер «страница → конспект в отдельный файл → следующая», почему `get_page_text` вместо `read_page` и отдельные файлы вместо накопительного, скратчпад умирает вместе с сессией), [faceted-catalog-pitfalls](/.claude/docs/faceted-catalog-pitfalls.md) (три грабли фасетного каталога товаров с фильтрами: комбинаторный взрыв индексируемых URL, дорогие live-счётчики значений фильтров, пустое пересечение при одновременном поиске и фильтрах), [dotenvx-stdout-migration-pollution](/.claude/docs/dotenvx-stdout-migration-pollution.md) (маркетинговые "tip"-строки `dotenvx` в stdout попадают в сгенерированный `migration.sql` при `> file`-редиректе и ломают `prisma migrate deploy` с P3018; плюс последствие починки — почищенный после применения файл расходится по checksum с `_prisma_migrations`, чинится `UPDATE` хеша, а не `migrate reset`), [external-services-blocked-from-s2](/.claude/docs/external-services-blocked-from-s2.md) (IP датацентра s2 подвержен разным механизмам блокировки внешних сервисов — сетевая от провайдера, геоблок от Cloudflare — проверять доступность с сервера, а не полагаться на локальную dev-среду), [turbopack-private-submodule-root](/.claude/docs/turbopack-private-submodule-root.md) (приватный submodule со своим `.git` внутри `apps/<app>/` — Turbopack принимает эту границу за workspace root и не резолвит хоистнутые Bun `node_modules` в корне монорепо, «Could not find the Next.js package»; чинится явным `turbopack.root` в `next.config.mjs`), [data-flag-driving-ui](/.claude/docs/data-flag-driving-ui.md) ⚠️ (служебный флаг записи `isDemo`/`isDraft`/`isArchived` попадает в условие рендера и начинает решать, что показывать — загруженный контент демо-сущности не виден никогда; не ловится ни типами, ни линтом, ни тестами на сиде, проверяется только ручным наполнением существующей демо-записи), [period-navigation-pattern](/.claude/docs/period-navigation-pattern.md) (навигация по временному периоду без клиентского JS — чистые функции-резолверы диапазона + Server Component на `searchParams` + обычные ссылки/нативный GET-form, две референсные реализации в studio), [tree-model-parent-select](/.claude/docs/tree-model-parent-select.md) (self-referencing древовидные модели — `parentId` через `NativeSelect` с сентинелом пустой строки «нет родителя», нормализация `emptyToNull` на сервере, ограничение: не проверяет циклы глубже одного уровня), [gallery-pattern](/.claude/docs/gallery-pattern.md) (Dropzone + useImageUpload из `@letar/image-upload` для загрузки, SortablePhotoGrid из `@letar/admin-ui` для drag-реордера/обложки/alt/удаления — обложка не булево поле, а соглашение «первое изображение по order»), [lib-entry-points](/.claude/docs/lib-entry-points.md) (библиотека с подпутями `./server`/`./client` — `type:*`-тег описывает только точку входа `.`, а `@nx/enforce-module-boundaries` подпути не различает вообще; границу держат `no-restricted-imports` по `src/server/`/`src/client/`, плюс ловушка ESLint 10: `files`-глоб с путём от корня молча не срабатывает в 58 проектах со своим `eslint.config.mjs`; зеркальная ловушка — `@nx/eslint:lint` меняет cwd на workspace root, из-за чего `ignores` нужно писать путём от корня, а не от каталога проекта (`form-docs/.source` иначе линтится как обычный код); сборочная сторона тех же подпутей — при подключении через `nx.implicitDependencies` линка в `node_modules` нет вовсе, поэтому `paths` в tsconfig каждого приложения единственный механизм резолва, промах даёт TS2307 и НЕ виден билду при `ignoreBuildErrors`, а `transpilePackages` не нужен ни одному потребителю), [tsconfig-presets](/.claude/docs/tsconfig-presets.md) (31 `apps/<app>/tsconfig.json` дали 29 различных вариантов при почти идентичном наборе опций — случайный дрейф; общая часть 18 Next.js-приложений вынесена в корневой `tsconfig.next-app.json`, пути внутри пресета — обязательно через `${configDir}`, иначе резолвятся не туда), [nextjs16-agent-guide-files](/.claude/docs/nextjs16-agent-guide-files.md) (`next dev` в Next.js 16 сам создаёт `apps/<app>/AGENTS.md` с инструкциями для ИИ-агента — пересоздаётся при каждом запуске, в `.gitignore`; `CLAUDE.md` — не игнорим, это уже существующая конвенция per-app доков), [nextjs16-turbopack-default-emotion-hydration](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md) ⚠️ (Next.js 16 без явного `--webpack`/`--turbopack` в `dev`/`build` тихо выбирает Turbopack по умолчанию — с Chakra v3's `<Global>` + `next-themes`'ным `<script>` это триггерит настоящий hydration mismatch, React отбрасывает и заново монтирует всё поддерево `<body>`, флаки в e2e на кликах сразу после перехода на страницу), [upload-path-traversal](/.claude/docs/upload-path-traversal.md) (почему `path.join`+`startsWith` не защищают от `../` — нормализация схлопывает traversal до проверки; готовый рецепт `resolveUploadPath` из `@letar/image-upload/server`, плюс смежная ловушка с расширением файла из `originalName`), [agent-skills-mirror](/.claude/docs/agent-skills-mirror.md) (зеркало `.claude/skills/` для сторонних агентов вроде Codex/ChatGPT — untracked `.agents/skills/`, генерируется командой `bun scripts/sync-agent-skills.ts`, а не ведётся вручную; правь после изменений в `.claude/skills/`), [ecommerce-cart-orders](/.claude/docs/ecommerce-cart-orders.md) (общий паттерн корзины/заказов для магазинов монорепо, не привязан к конкретному приложению — вариант товара отдельной моделью, снэпшоты в `OrderItem` вместо чтения через relation, слияние анонимной корзины при логине, «снять с продажи, а не удалить» для товара со ссылками из заказов), [zenstack-public-write-read-back](/.claude/docs/zenstack-public-write-read-back.md) (публичный `@@allow('create', true)` при узком `read` — ZenStack не даёт `getEnhancedPrisma()` прочитать назад только что созданную запись анонимным актором даже когда сама запись разрешена; для таких публичных точек записи — сырой `prisma`/`prismaAuth`, не enhanced-клиент; узкое исключение из общего правила «используй getEnhancedPrisma()»), [zenstack-generated-prisma-client](/.claude/docs/zenstack-generated-prisma-client.md) (`generator client` без/с совпадающим `output` в автосгенерённом `schema.prisma` — не баг и не признак дрейфа схемы; classic Prisma Client, который он производит, либо уходит в неиспользуемый `node_modules`, либо избыточно перегенерирует те же файлы, что уже написал плагин `@core/typescript`; реальный рантайм-код приложения всегда идёт через `@zenstackhq/orm`), [dprint-worktree-submodule-scope](/.claude/docs/dprint-worktree-submodule-scope.md) ⚠️ (dprint без явного scope не различает границы git worktree/submodule и обходит их файловую систему как обычные директории — постоянный фикс через `excludes` в `dprint.json`, но та же ловушка повторится, если у submodule-приложения появится собственный вложенный worktree; попутно — `nx run-many -t format --dry-run` не является настоящим dry-run для `nx:run-commands`), [dashboard-agent-alert-debounce-patterns](/.claude/docs/dashboard-agent-alert-debounce-patterns.md) (четыре разные формы дебаунса алертов в `dashboard-agent` — счётчик с удвоением, плоский level-triggered флаг, edge-triggered переход состояния, курсор событийного потока — и почему их сознательно не свели в один generic-хелпер; общий для всех инвариант — состояние продвигается только по подтверждённой доставке `postDashboardAlert()`, а не по факту вызова), [animatrona-db-manifest-dual-source](/.claude/docs/animatrona-db-manifest-dual-source.md) ⚠️ (animatrona — `Episode.spriteCid`/`vttCid`/`chaptersCid` дублируются в SQLite и в опубликованном IPFS-манифесте, билдер directoryCid читает с приоритетом БД; retranscode при повторном импорте пишет свежий CID только в манифест и не сбрасывает/не обновляет колонки БД — старый CID из БД молча побеждает свежий из манифеста; правило для новых dual-source CID-полей — сбрасывать оба места разом или явно фиксировать source of truth), [dprint-eslint-curly-conflict](/.claude/docs/dprint-eslint-curly-conflict.md) (dprint по умолчанию убирает фигурные скобки у однострочных `if`/`for`/`while`, ESLint-правило `curly: 'all'` их обратно требует — `eslint --fix` и `dprint fmt` бесконечно откатывают правку друг друга; фикс — `typescript.useBraces: "always"` в `dprint.json`, применено в корневом конфиге 2026-08-09, submodule-конфиги ещё не обновлены), [vitest-alias-prefix-matching](/.claude/docs/vitest-alias-prefix-matching.md) (Vite/Rollup `resolve.alias` матчит объектные ключи по префиксу в порядке их следования — программная генерация alias из `package.json` → `exports` с bare-ключом `.` первым перехватывает импорты всех подпутей до их собственной записи; фикс — сортировка ключей по длине по убыванию, найдено в `libs/forms/vitest.config.ts`), [npm-publish-from-monorepo](/.claude/docs/npm-publish-from-monorepo.md) (конвейер `build:npm` для публикуемых `libs/*` — `package.json` источник версии → `tsup` → `package.publish.json` шаблон → `write-publish-package-json.mjs`; внутренние непубликуемые `@letar/*`-зависимости обязаны жить в `devDependencies`, иначе `dts.resolve` у tsup молча не срабатывает и опубликованные `.d.ts` тянут несуществующий в npm пакет при зелёной сборке; рецепт проверки — `npm pack` → установка тарбола вне монорепо → `tsc --noEmit` с позитивным и негативным контролем).

**Инфраструктура:** [nginx-proxy-manager](/infra/nginx-proxy-manager/README.md) (действующий прокси; трек на замену — `PLAN-INFRA.md` §48), [acme-dns](/infra/acme-dns/README.md) ⭐ (wildcard-TLS `*.letar.best` через DNS-01 **без обращения к API регистратора** — ни при выпуске, ни при продлении, ни при новом поддомене; делегирование подзоны своему acme-dns на s2), [traefik](/infra/traefik/README.md) (пилот замены NPM на s3: конфиг маршрутов в git рядом с приложением вместо SQLite внутри контейнера, HTTP/3, дашборд read-only), [server-recovery](/.claude/docs/server-recovery.md), [server-provision](/.claude/docs/server-provision.md) (новый сервер с нуля), [firewall](/.claude/docs/firewall.md) ⚠️ (`ufw` **не** фильтрует опубликованные Docker'ом порты — они идут по `FORWARD` мимо `INPUT`; закрывать публикацией на `127.0.0.1` в compose, а не правилами firewall; `systemctl is-active ufw` врёт при `ufw status: inactive`), [backup-architecture](/.claude/docs/backup-architecture.md), [secret-manager](/.claude/docs/secret-manager.md) (SOPS + age).

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
коммитов — [git.md § Работа в монорепозитории](/.claude/rules/git.md)) и `pre-commit-sops.sh`
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

**MCP серверы:** nx-mcp, next-devtools, chakra-ui, **form-mcp**, **deploy-mcp**, inkeepMcp, context7, chrome-devtools, sequential-thinking, context-mode, agent-mail, **postgres-\*** (driving-school, kami, premium-rosstil, grandslamcup), **prisma**, **socraticode**, **letar-consultant**. Подробнее: [MCP серверы](/.claude/docs/mcp-servers.md)

**SocratiCode** — MCP-сервер семантического поиска по кодовой базе (Qdrant + Ollama + ast-grep). При первом запуске поднимает Docker-контейнеры (~5 мин). После: «Проиндексируй кодовую базу» → спрашивай «What is the codebase index status?». Контекстные артефакты (схемы БД, docs) — [`.socraticodecontextartifacts.json`](/.socraticodecontextartifacts.json). **Правило использования:** [socraticode-first](/.claude/rules/socraticode-first.md) — когда и какой инструмент вызывать (codebase_search vs codebase_context_search vs codebase_symbol vs codebase_impact). Используй вместо grep для семантического поиска.

**letar-consultant** — локальный AI-консультант (qwen2.5-coder:14b @ Ollama + RAG). Даёт «вторую голову» для синтеза архитектурных решений по letar. Инструменты: `consult_letar({ question, mode, chunks })`, `consultant_status`. **Правило использования:** [consult-local](/.claude/rules/consult-local.md). Вызывай когда нужна рекомендация/объяснение поверх данных из SocratiCode.

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

**Обновлено:** 2026-05-16 | **Nx** 22.6 | **Next.js** 16.2 | **React** 19 | **Chakra** 3.34 | **Zod** 4.3 | **ZenStack** 3.5 | **Prisma** 7.6 | **Scope:** `@letar/*`

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
