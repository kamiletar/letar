# Выполненные задачи — form-example

## P2: README — полная документация (2026-09-09)

Старый `README.md` описывал 16 примеров (из текущих 46) и давал команды для несуществующего
standalone-репозитория (`git clone .../form-example.git`, `npm install`, `npx prisma db push`) —
приложение живёт внутри монорепо `letar` и таких команд никогда не было в актуальном виде.

Переписано целиком:

- Quick Start — реальный воркфлоу монорепо (`git clone` самого `letar`, `bun install`, `nx dev
  form-example`, `nx run form-example:zenstack:generate`/`db:push`/`db:seed`), плюс Docker-запуск
  из каталога приложения.
- Component Examples — таблица всех 46 examples, сгруппированная по тем же 6 категориям, что и
  сайдбар (`nav.tsx`) после [P2: Категоризация сайдбара](#p2-категоризация-сайдбара-2026-09-09) —
  README и сайдбар теперь описывают одну и ту же структуру, не расходятся.
- Tech Stack — добавлены `@letar/forms-core`/`@letar/form-mcp`, актуальные версии (Next.js 16,
  Chakra v3, Zod v4, ZenStack/Prisma 7).

## P2: Категоризация сайдбара (2026-09-09)

`nav.tsx` держал один плоский список из 46 ссылок под заголовком EXAMPLES. PLAN.md давно
описывал целевую схему из 6 категорий, но сам файл был к тому же продублирован — секция «P2 —
UX и навигация» встречалась в PLAN.md дважды (короткая версия без деталей и полная со схемой) —
консолидировано в одну.

`exampleCategories` — массив из 6 групп (`{ title, items }`) вместо плоского `examples`; рендер
в `Nav()` — `.map()` по категориям вместо одного `Stack`. Итоговое распределение всех 46
examples (включая Schedule и MCP Demo, которых не было в исходной схеме PLAN.md — размещены в
FIELDS и GENERATION соответственно, по типу контента, не по дате появления):

- **BASICS** (5): basic, all-fields, advanced-fields, validation, constraints
- **LAYOUT** (4): conditional, watch, multi-step, groups
- **FIELDS** (8): schedule, documents, credit-card, signature, survey-fields, table-editor,
  data-grid, matrix-choice
- **GENERATION** (6): auto-fields, auto-fields-advanced, templates, conversational, mcp-demo,
  zenstack
- **PATTERNS** (9): offline, persistence, autosave, i18n, security, captcha, autofill,
  edit-intent, recipes
- **ADVANCED** (14): analytics, undo-redo, server-errors, readonly, skeleton, theming,
  calculated, utility, async-validation, comparison, depends-on, debug-values,
  testing-utilities, url-prefill

Проверено вживую (Browser pane, `get_page_text` на `/`) — все 6 заголовков категорий и все 46
ссылок отрендерились, активная подсветка (`NavLink`) не тронута.

## P1: Offline — реальный @letar/forms/offline (2026-09-09)

[`/examples/offline`](src/app/examples/offline/page.tsx) описывал в тексте страницы
«Uses `@letar/forms/offline`», но фактически имитировал офлайн локальным `useState` +
`navigator.onLine`/`window.addEventListener` и не имел настоящей персистентной очереди.

Переписано на реальный API библиотеки:

- `useOfflineForm<ReportValues>({ actionType, onlineSubmit, onSuccess, onQueued, onError })` —
  при реальном отключении сети (`navigator.onLine`) сам кладёт данные в IndexedDB-очередь и
  автоматически синхронизирует при восстановлении соединения.
- `FormOfflineIndicator` и `FormSyncStatus` — готовые бейджи библиотеки вместо кастомного
  `Badge` на локальном стейте.
- Кнопка **Simulate Offline**. Библиотека не предоставляет способ форсировать `isOffline`
  программно (индикаторы читают настоящий `navigator.onLine` через `useOfflineStatus`), поэтому
  симуляция не подделывает индикаторы, а маршрутизирует `onSubmit` напрямую в `addAction` из
  `useSyncQueue()` — тот же singleton-стор очереди, что `useOfflineForm` использует внутри.

Проверено вживую (Browser pane, `javascript_tool` — form_input/computer click оказались
ненадёжны на этой странице, как и в предыдущих сессиях): переключение Simulate Offline меняет
текст кнопки и показывает бейдж "Simulated offline"; submit в этом режиме кладёт запись в
очередь (`onQueued` коллбэк сработал) — и тут же обнаруживается корректное поведение реальной
библиотеки: поскольку браузер **на самом деле** онлайн, встроенный в `useOfflineForm` эффект
автосинхронизации почти мгновенно обрабатывает и очищает добавленную запись, поэтому счётчик
успевает вернуться к "Queue empty" раньше, чем его можно замерить руками — это ожидаемое
сквозное поведение настоящей библиотеки, не баг демо-страницы.

## P1: Recipes — Profile Edit, Checkout, Feedback (2026-09-09)

[`/examples/recipes`](src/app/examples/recipes/page.tsx) имел 4 карточки (Login, Registration,
Contact, Settings) — по PLAN.md ожидались ещё три. Добавлены:

- **Profile Edit** — `name`/`bio` (Textarea, max 280)/`website`/`publicProfile` (Switch).
- **Checkout** — адрес доставки (`fullName`/`address`/`city`/`zip`) + `Form.Field.CreditCard`
  (`layout="inline"`, тот же паттерн, что на `/examples/credit-card`).
- **Feedback** — `Form.Field.Likert` с якорями `['Terrible', 'Bad', 'OK', 'Good', 'Excellent']`
  (паттерн взят с `/examples/conversational`), Textarea-комментарий, Checkbox
  `wouldRecommend`.

Проверено вживую через Browser pane (`get_page_text` на `/examples/recipes`) — все 7 карточек
рендерятся, форма Feedback показывает `Form Values` с `rating: undefined` до выбора (поле
`optional()` в схеме).

## P1: MCP Demo page (2026-09-08)

Новая страница [/examples/mcp-demo](src/app/examples/mcp-demo/page.tsx) — walkthrough того, как
AI-агент генерирует форму через `@letar/form-mcp`. Страница статичная: `form-mcp` работает по
stdio для агентов в редакторе, у него нет HTTP-эндпоинта, который можно было бы вызвать из
браузера — поэтому вместо live-запроса показан **дословный слепок** реального вывода
инструментов (`list_fields`/`generate_form`), сверенный построчно с
`libs/form-mcp/src/index.ts` (`generateFormCode`/`mapFieldTypeToZod`/`getDefaultValue`) на
конкретном примере (ContactForm: name/email/message).

Четыре шага: 1) текстовый запрос пользователя → 2) вызов `list_fields` и его результат →
3) вызов `generate_form` и сгенерированный код (в старом API `useAppForm`, как реально отдаёт
инструмент) → 4) тот же набор полей, отрендеренный живьём через актуальный декларативный `Form`
API — чтобы показать, что сгенерированный код реально работает.

Пункт "MCP Demo" добавлен в [nav.tsx](src/components/nav.tsx) после Schedule. Проверено вживую:
все 4 шага рендерятся, живая форма (шаг 4) принимает ввод и сабмитится, ошибок гидратации нет
(только фоновый HMR-websocket шум dev-режима). При первой проверке `message` в живой форме
ошибочно показывал required-звёздочку, хотя в сгенерированном коде поле необязательное — исправлено
(`.optional()` в Zod-схеме демо). `nx lint`/`typecheck:tsgo` зелёные.

## P1: Schedule page (2026-09-08)

Новая страница [/examples/schedule](src/app/examples/schedule/page.tsx), showcase для
`Form.Field.Schedule` — недельного редактора рабочих часов из `@letar/forms`. Две секции:

1. **Instructor Schedule** — форма с `instructorName` + `specialty` (enum) + полное недельное
   расписание (`Form.Field.Schedule`, все дефолты — 7 дней, кнопка "Copy Mon to weekdays").
   Реальный прообраз — `apps/driving-school` (`schedule-settings-form.tsx`, форма настроек
   расписания инструктора автошколы).
2. **Weekdays Only (Customized)** — та же схема данных, но с `days` (только будни),
   кастомными `dayNames` (короткие Mon/Tue/…) и `showCopyToWeekdays={false}` — демонстрация
   пропсов кастомизации компонента.

Добавлен пункт "Schedule" в [nav.tsx](src/components/nav.tsx) между Groups & Arrays и Auto
Fields. Проверено вживую через Browser pane: обе секции рендерятся, toggle дня (Saturday
off→on) корректно меняет значение в форме (`null` → `{ open, close }`), `nx lint`/
`typecheck:tsgo` зелёные.

## P0: Groups — sortable drag&drop + вложенные массивы (2026-09-08)

Задача из PLAN.md значилась невыполненной, но реализация присутствовала на странице
[groups/page.tsx](src/app/examples/groups/page.tsx) с самого initial commit (`69fdf2ea`) — просто
не была отмечена в чек-листе. Три секции:

1. Nested Object + Dynamic Array (address + contacts)
2. Sortable Array (Drag & Drop) — `Form.Group.List name="skills" sortable` +
   `Form.Group.List.Button.DragHandle`
3. Nested Arrays (Course → Modules → Lessons) — два уровня вложенных `Form.Group.List`

Проверено вживую через Browser pane: все три секции рендерятся, Add Contact/Add Lesson/Add
Module корректно добавляют элементы на любом уровне вложенности (модуль 1→2, урок 2→3).

**Побочная находка — делегирована в `@letar/forms`:** секция 2 (sortable) даёт hydration
mismatch на каждой полной перезагрузке — `aria-describedby="DndDescribedBy-N"` расходится
между сервером и клиентом. Root cause: `SortableWrapper`
(`libs/forms/src/lib/declarative/form-group/form-group-list-sortable.tsx`) рендерит
`<DndContext>` без явного `id` — `@dnd-kit/utilities` `useUniqueId("DndDescribedBy", id)` без
`value` берёт номер из module-level счётчика (`ids[prefix]++`), не детерминированного между SSR
и клиентской гидратацией. Технически безвредно (React не патчит эти атрибуты), но шумит в
консоли на любой странице с `Form.Group.List sortable`. Предложенный фикс — прокинуть уже
вычисляемый `fullPath` как явный `id` в `SortableWrapper`/`DndContext` (при заданном `value`
`useUniqueId` счётчик не трогает). Задача не в компетенции form-example — отправлена
`forms-coordinator-dev` (agent-mail, thread `forms-bug-sortable-dnddescribedby`), запись в
`libs/forms/PLAN.md` § Backlog.

## fix: hydration mismatch на всех страницах — Turbopack+Chakra Global, не `as="nav"` (2026-09-09)

Побочная находка при живой проверке (не связана с задачей по локали десятичного разделителя):
консоль на `/examples/all-fields` (и на всех остальных страницах, включая `/`) стабильно печатала
«Hydration failed because the server rendered HTML didn't match the client» на каждой полной
перезагрузке.

**Первая гипотеза (частично верна, но не root cause):** [nav.tsx](src/components/nav.tsx) держал
`<Box as="nav">` — запрещённый проп по правилу `.claude/rules/components.md` ⛔. Исправлено на
`asChild` + `<nav>`, заодно найден и исправлен второй случай — `Box as="button"` в
[server-errors/page.tsx](src/app/examples/server-errors/page.tsx). Это было правильно сделать
независимо от исхода, но после фикса ошибка гидратации никуда не делась — воспроизводилась так же
стабильно на всех страницах, не только на той, что использует `Nav`.

**Реальная причина:** диф React в оверлее Next dev показал `<Insertion> +<nav> -<style
data-emotion="css-global ad1llf">` — точная сигнатура задокументированного бага
[nextjs16-turbopack-default-emotion-hydration](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md):
Turbopack (дефолтный бандлер `next dev`/`next build` в Next 16 без явного флага) + Chakra
`ChakraProvider`'s внутренний `<Global>` дают структурный SSR/CSR-мисматч. `form-example` просто не
попал в аудит 2026-08-04/25 по остальным ~10 приложениям монорепо.

**Фикс** — `--webpack` в `dev`/`build` [project.json](project.json) (частичный override поверх
инференса `@nx/next`, тот же паттерн, что `auth-hub`/`aira-web`/`dashboard`). Проверено вживую
через Browser pane: до фикса — ошибка на `/` и `/examples/all-fields` при каждой полной
перезагрузке (`force: true`/`window.location.href`); после — консоль чистая на обеих страницах,
`nx lint`/`nx typecheck:tsgo form-example` зелёные.

Коммит `24c5280b`.

**Расширенная проверка (2026-09-09), отдельная сессия:** первоначальная проверка охватывала
только `/` и `/examples/all-fields`. Дополнительно прогнаны через Browser pane с полной
перезагрузкой (`force: true`/`window.location.href`) пять интерактивных страниц:
`/examples/multi-step` (переход между шагами кнопкой Next с сохранением значений),
`/examples/conditional` (переключение radio Personal/Business → появление Company Name/Tax ID,
чекбокс newsletter → появление Email frequency), `/examples/watch` (`onFieldChange` name→slug,
`Form.Watch` country→currency/greeting), `/examples/groups` (`+ Add Contact` на динамический
массив) и `/products/new` (заполнение полей + клик Submit — кнопка живая, корректно
заблокировала отправку валидацией на пустом обязательном Tags). Ни на одной странице не
воспроизвелась ни ошибка «Hydration failed» в консоли, ни класс бага «мёртвая кнопка без ошибок
в консоли» (найденный ранее на auth-hub, см.
[nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)
§ «Найдено на auth-hub») — все интерактивные элементы (кнопки, radio, checkbox, combobox, submit)
реагировали сразу после полной перезагрузки страницы. `--webpack`-фикс подтверждён шире одной
страницы.

## fix: `@letar/demo-protection` резолв через bun isolated linker (2026-09-01)

Тот же класс бага, что уже был найден и исправлен в aboi: пакет числился только в
`nx.implicitDependencies` (`package.json`), но не в `dependencies` — изолированный линковщик bun
кладёт symlink пакета в `apps/<app>/node_modules/@letar/`, не в корневой `node_modules`, только
если пакет реально перечислен в `dependencies`. Без него `nx typecheck:tsgo form-example` падал
с `TS2307: Cannot find module '@letar/demo-protection'`. Фикс — добавить
`"@letar/demo-protection": "workspace:*"` в `dependencies` + `bun install` из корня. Проверено
свежим `typecheck:tsgo --skip-nx-cache` — зелёный. `v0.1.4`.

## Сессия 2026-08-12 — GlitchTip + первый staging + фикс невалидного e2e-прогона

Подключение к GlitchTip (`nx g @letar/generators:glitchtip-integrate form-example`,
PLAN-INFRA.md §70) — только production (нет `docker-compose.staging.yml` на тот момент), DSN
проекта id=11.

Заведён **первый staging** (§18.7 Тираж M2) — `docker-compose.staging.yml` (Traefik-лейблы,
`form-example-stage.s3.letar.best`, порты 5466/3033), `.env.staging.enc`. БД (`Product`/`Contact`,
демо-данные) — e2e-сьют тестирует поведение форм напрямую, сид не понадобился.

Первый прогон e2e (BlackCove) оказался невалидным — `apps/form-example-e2e/playwright.config.ts`
хардкодил `webServer.url: 'http://localhost:3022'` вместо `baseURL`: readiness-проверка стучалась
в localhost, не видела там ничего и тихо поднимала `next dev` на `localhost:3000` (Turbopack) —
все 48 тестов упали против него, не против стейджа. Плюс `form-example-e2e` не имел
`project.json` — та же категория бага, что чинили на `time`/`aboi`/`grandslamcup-e2e` 2026-07-19:
без явного `executor: '@nx/playwright:playwright'` Nx-инференс через `@nx/playwright/plugin`
добавляет `dependsOn` на dev-таск ДО проверки `reuseExistingServer`/`url`, обходя
`playwright.config.ts`. Оба фикса внесены, `project.json` заведён.

## Сессия 2026-08-06 — package.json создан + lint-ошибки в демо-страницах починены

### `package.json` + `nx.implicitDependencies`

Приложение вообще не имело `package.json` (только `tsconfig.json`) — единственное среди `apps/*`
в таком состоянии (см. корневую причину сломанного `zenstack:generate` в сессии 2026-08-04 ниже:
тогда фикс был через относительный `provider`-путь в `schema.zmodel`, а не через добавление
`package.json`). По правилу [libs.md](/.claude/rules/libs.md) создан `package.json` (`name:
"form-example"`, `version: "0.1.1"` — по последней записи `CHANGELOG.md`) с `nx.implicitDependencies:
["@letar/forms", "@letar/demo-protection", "@letar/analytics", "@letar/seo"]` — сверено с `paths`
в `tsconfig.json`. `nx show project form-example` после правки резолвит то же имя проекта, что и
раньше (через `project.json`), регрессии нет.

⚠️ `nx typecheck:tsgo form-example` по-прежнему падает (11 ошибок `TS2339` на `db.product` и
т.п.) — это не связано с этой правкой: `zenstack:generate` для приложения падает независимо,
из-за отсутствующего `DATABASE_URL` в локальном `.env.local` (уже задокументировано в
[PLAN-INFRA.md §45](/PLAN-INFRA.md)). Подтверждено на чистом состоянии: ошибка та же и без
`package.json`.

### Lint-ошибки в демо-страницах (pre-existing, не связаны с добавлением package.json)

`nx lint form-example` падал на 5 ошибках в 3 файлах — не следствие правок этой сессии, чинилось
заодно:

- `examples/theming/page.tsx` (×2), `examples/undo-redo/page.tsx` — пустые `onSubmit={async () =>
  {}}` (`@typescript-eslint/no-empty-function`) заменены на no-op с комментарием-пояснением.
- `examples/async-validation/page.tsx` — `curly`: однострочный `if` без фигурных скобок.
- `examples/persistence/page.tsx` — `no-empty`: пустой `catch {}` дополнен комментарием.

`nx lint form-example` — зелёный (остались только 3 несвязанных pre-existing warning
`Unused eslint-disable directive` в `input.ts`/`models.ts`/`schema.ts`, вне скоупа).

## Сессия 2026-08-04 — таргет zenstack:generate починен

Обнаружено в сессии §37 корневого `PLAN.md`: таргет `zenstack:generate` был сломан на чистом
checkout'е, обходился вручную сгенерированным клиентом мимо таргета.

- **Корневая причина:** `apps/form-example` — единственное приложение среди потребителей
  `@letar/zenstack-form-plugin`, у которого нет собственного `package.json` (не участвует в bun
  workspaces индивидуально). Из-за этого нигде не появляется симлинк
  `node_modules/@letar/zenstack-form-plugin`, а `provider = '@letar/zenstack-form-plugin'` в
  `schema.zmodel` не резолвится обычным Node-разрешением модулей (ZenStack CLI — Node-процесс,
  не TypeScript, `tsconfig` paths/`customConditions` ему не помогают).
- **Фикс:** `provider` переведён на относительный путь к сборке —
  `'../../libs/zenstack-form-plugin/dist/index.js'` — тем же приёмом, что уже применён в
  `apps/form-develop-app/schema.zmodel`.
- **Побочная находка:** сам fallback `zenstack generate || (... npx prisma generate)` был
  логической ошибкой, а не временным костылём под сломанный плагин. `@zenstackhq/cli` v3.9.0
  игнорирует блок `generator client { provider = 'prisma-client-js' }` в zmodel (warning
  `"generator" is not used by ZenStack`) — Prisma Client им не генерируется вообще. `||`
  означал, что после фикса плагина `zenstack generate` стал бы успешным и полностью скрывал
  вызов `prisma generate`, оставляя `PrismaClient` не пересгенерированным. Заменено на
  последовательное `zenstack generate && prisma generate` (без `npx` — бинарь берётся из
  `node_modules/.bin` монорепо через nx, `npx` в подкаталоге без своего `package.json` вместо
  этого лез в registry за посторонним пакетом `zenstack@2.22.3`).
- Также раскрылась причина, почему `npx zenstack generate` руками из `apps/form-example` вообще
  не работал ни разу: `npx` в каталоге без локального `node_modules` не поднимается по дереву до
  корневого `node_modules/.bin` (в отличие от PATH, который получает процесс, запущенный через
  `nx`) — и подтягивал из npm registry несвязанный пакет `zenstack@2.22.3` вместо
  `@zenstackhq/cli@3.9.0` монорепо.
- Проверено на чистой генерации (`--skip-nx-cache`, `rm -rf src/generated/form-schemas/*`):
  `nx run form-example:zenstack:generate` и `nx run form-example:typecheck:tsgo` — оба зелёные.
  Регенерированные `.form.ts`-файлы отличаются только форматированием более новой версии
  плагина, содержательных регрессий нет.
- Оставлено на будущее (не в скоупе этой сессии — низкий приоритет, апп единственный без
  `output = "./prisma"` в `generator client`, PrismaClient пишется в общий хойстнутый
  `node_modules/@prisma/client`): миграция на паттерн `plugin prisma` + `plugin typescript` по
  образцу `form-develop-app`, чтобы ZenStack v3 сам генерировал `prisma/schema.prisma` из
  `schema.zmodel` вместо ручной синхронизации двух файлов.

## Сессия 2026-07-15 — rollout-профиль включён, деплой закрыт

- `letar.rollout: 'true'` раскомментирован в `docker-compose.production.yml` — приложение
  структурно готово к rollout ещё с 2026-07-12 (commit `098eb75`), ждало подтверждения
  NPM-роутинга обычным деплоем (условие выполнено).
- Rollout-пилот прошёл с четвёртой попытки — вскрылись и устранены три независимых бага
  инфраструктуры (все правки в compose/env, не в коде приложения):
  1. `db:` секция никогда не публиковала host-порт — `deploy-affected.sh` мигрирует с хоста
     через `localhost:$DB_PORT`, слушать было нечего (`P1001`). Фикс: `ports: '5443:5432'`
     (commit `d0c5cfc`).
  2. `.env.docker` содержал `POSTGRES_PASSWORD`, но не `DB_PASSWORD` — единственное такое
     приложение в монорепо, скрипт строит `DATABASE_URL` для миграций именно из `DB_PASSWORD`
     (`P1000` Authentication failed). Фикс: добавлена переменная, `.env.docker.enc` пересобран
     через `sops` (commit `fd67766`).
  3. `prisma/migrations/` никогда не существовала в репо — схема на проде была накатана через
     `prisma db push`, а не `migrate`, что несовместимо с `migrate deploy` против непустой БД
     (`P3005`). Фикс: сгенерирована и провалидирована baseline-миграция `20260715163011_init`
     (commit `b63b132`), на проде помечена применённой через `prisma migrate resolve --applied`
     (без DDL, схема совпадала).
- Итог: `form-example-app-2` healthy, zero-downtime, старый контейнер убран. Деплой-агент —
  BlackCove, координация через Agent Mail (thread `deploy-form-example-mandala-rollout-J`).

## Сессия 2026-07-12 — security-фикс + баг /products 500

### Ротация захардкоженного пароля Postgres

- В `docker-compose.production.yml` был захардкожен пароль Postgres в открытом виде (публичный репозиторий) — `POSTGRES_PASSWORD` и внутри `DATABASE_URL`
- Сгенерирован новый пароль через `openssl rand -base64 32`, вынесен в `.env.docker`/`.env.docker.enc` (SOPS), compose переведён на `${POSTGRES_PASSWORD}` (образец `apps/time`)
- Деплой через BlackCove: `ALTER USER forms` на живом `form-example-db` синхронно с пересозданием контейнеров

### Баг `/products` 500 (ECONNREFUSED) — найдена и устранена реальная причина

- Предыдущая попытка фикса через `outputFileTracingIncludes` (`.prisma/client`) была мимо цели — файлы трассировки были ни при чём
- Реальная причина: в bun-хостинге монорепо параллельно установлено несколько версий `pg` (hoisting: 8.20/8.21/8.22). `db.ts` создавал `new Pool()` через одну версию, `@prisma/adapter-pg` внутри резолвил свою — `instanceof Pool`-проверка между разными классами не проходила, адаптер тихо создавал свой Pool без connectionString → падал на `localhost:5432`. Ошибка маскировалась generic `ECONNREFUSED` внутри `performIO` (известный баг Prisma, [prisma/prisma#28055](https://github.com/prisma/prisma/issues/28055))
- Фикс: `src/lib/db.ts` — `PrismaPg({ connectionString })` напрямую вместо готового `Pool`-инстанса
- Диагностика и проверка фикса проведены вживую на s2 через `docker exec` в работающем контейнере (не через локальную пересборку — Windows-сборка даёт другой класс проблем с абсолютными symlink, не относящийся к прод-багу)

## v0.1.0 (2026-04-04)

### Реализовано

- 38 example-страниц (basic, validation, multi-step, offline, i18n, и др.)
- ArticleLink компонент — ссылки на статьи цикла
- 5 новых DX-страниц: analytics, server-errors, undo-redo, readonly, skeleton
- Интеграция с @letar/forms через tsconfig path alias

### Фикс `references` на библиотеки в `tsconfig.json` (2026-08-07)

`apps/form-example/tsconfig.json` ссылался на 4 библиотеки (`demo-protection`, `analytics`,
`forms`, `seo`) через `references` — тот же редирект-баг, что в `dashboard-agent` (0.11.1), см.
`.claude/rules/libs.md`.

- Убран блок `references`, добавлен `"rootDir": "../.."` (тот же приём, что в
  `form-develop-app` — приложение расширяет `tsconfig.next-app.json` с заданным `outDir`,
  без явного `rootDir` TypeScript выводил его как `apps/form-example` и отбрасывал файлы `libs/*`
  с `TS6059`).
- Базовый прогон (без фикса) — 118 ошибок в 51 файле. После фикса — 11 ошибок, все `TS2339`
  (`Property 'contact'/'product' does not exist on PrismaClient`) — не связаны с этой правкой,
  предсуществующее расхождение сгенерированного Prisma-клиента, вне скоупа.
- `nx build form-example --skip-nx-cache` — успешно.

---

**Последнее обновление:** 2026-08-07

## Починка графа Nx (2026-09-09)

- [x] `@letar/forms-core` реально импортировался в коде, но не был объявлен ни в
      `dependencies`, ни в `nx.implicitDependencies` (PLAN-INFRA-6.md §169). Добавлен в
      `dependencies` (`workspace:*`), проверено format/lint/typecheck:tsgo.
