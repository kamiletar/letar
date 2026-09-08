# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.1.18] - 2026-09-09

### Changed

- `README.md` полностью переписан: старые команды ссылались на несуществующий standalone-репозиторий
  (`git clone .../form-example.git`) — заменены на реальный monorepo-воркфлоу (`nx dev
  form-example`, `nx run form-example:zenstack:generate`/`db:push`/`db:seed`). Список примеров
  расширен с устаревших 16 до всех 46, сгруппирован по тем же 6 категориям, что и сайдбар.

## [0.1.17] - 2026-09-09

### Changed

- `nav.tsx` — сайдбар разбит на 6 категорий (BASICS / LAYOUT / FIELDS / GENERATION / PATTERNS /
  ADVANCED) вместо одного плоского списка на 46 ссылок.

## [0.1.16] - 2026-09-09

### Changed

- `/examples/offline` переведён с самодельной имитации (`navigator.onLine` + локальный `useState`
  для очереди) на реальный `@letar/forms/offline`: `useOfflineForm` + `useSyncQueue` (настоящая
  IndexedDB-очередь), `FormOfflineIndicator`/`FormSyncStatus`. Добавлена кнопка "Simulate Offline"
  — библиотека не даёт форсировать offline-статус программно, поэтому симуляция маршрутизирует
  submit напрямую в `addAction` того же singleton-стора очереди, не подделывая индикаторы.

## [0.1.15] - 2026-09-09

### Added

- `/examples/recipes` — три новые карточки: Profile Edit (name/bio/website/publicProfile),
  Checkout (адрес доставки + `Form.Field.CreditCard`), Feedback (`Form.Field.Likert` + comment +
  wouldRecommend). Всего 7 готовых паттернов форм на странице.

## [0.1.14] - 2026-09-08

### Added

- Новая страница `/examples/mcp-demo` — статичный walkthrough генерации формы через
  `@letar/form-mcp` (`list_fields`/`generate_form`) с живым эквивалентом на текущем API. Пункт
  "MCP Demo" добавлен в навигацию.

## [0.1.13] - 2026-09-08

### Added

- Новая страница `/examples/schedule` — showcase `Form.Field.Schedule` (недельный редактор
  рабочих часов): форма расписания инструктора и демо кастомизации (`days`, `dayNames`,
  `showCopyToWeekdays`). Пункт "Schedule" добавлен в навигацию.

## [0.1.12] - 2026-09-09

### Fixed

- `nav.tsx`/`server-errors/page.tsx`: убран запрещённый проп `as=` (Chakra UI v3) — `asChild` +
  нативный элемент.
- Реальная причина hydration mismatch на всех страницах — не `as=`, а известный баг Turbopack +
  Chakra `ChakraProvider`'s `<Global>`. Фикс — `--webpack` в `dev`/`build` (`project.json`), по
  образцу `auth-hub`/`aira-web`/`dashboard`. Подробности — `PLAN_COMPLETED.md`.

## [0.1.11] - 2026-09-09

### Fixed

- `package.json`: `@letar/forms-core` не был объявлен ни в `dependencies`, ни в
  `nx.implicitDependencies`, хотя реально импортируется — граф Nx не видел это ребро. Добавлен
  в `dependencies` (`workspace:*`).

## [0.1.10] - 2026-09-08

### Added

- `examples/edit-intent` — пример `Form.Field.EditIntent` для внешних пользователей (замена
  API-ключа без передачи старого значения клиенту). Пункт добавлен в навигацию.

## [0.1.9] - 2026-09-04

### Changed

- `schema.zmodel` мигрирован на Фазу 3 `zenstack-form-plugin` (v3.0.0): все 32 comment-директивы
  `@form.*` конвертированы в field-атрибуты `@meta("form.*", …)` через
  `scripts/codemods/codemod-form-directives.mjs`, ноль элементов на ручную проверку. Сгенерированный
  `form-schemas/*.form.ts` байт-в-байт идентичен версии до миграции — переход семантически
  нейтрален. Витрина намеренно не содержит примеров старого comment-синтаксиса (в отличие от
  `form-develop-app`) — она показывает внешним пользователям только рекомендуемый `@meta`-синтаксис.

## [0.1.8] - 2026-09-04

### Added

- Новая модель `Event` (`schema.zmodel`) с `@@validate(endsAt > startsAt, "End date must be after
  start date", ["endsAt"])` — демонстрация Фазы 2 миграции `zenstack-form-plugin` (v2.5.0) на
  кросс-полевую валидацию. Миграция `20260904144257_event_cross_field_validate`.
- `examples/zenstack` — вторая форма на странице (`EventCreateFormSchema`): попытка поставить
  дату окончания раньше даты начала даёт ошибку, привязанную к полю `endsAt` через `path`-аргумент
  `@@validate`.

## [0.1.7] - 2026-09-04

### Added

- `examples/zenstack` — `Product.sku`/`Product.website` теперь демонстрируют Фазу 1 миграции
  `zenstack-form-plugin` (v2.4.0) на нативные ZModel-атрибуты: `@startsWith`/`@trim`/`@upper` на
  `sku`, `@url` на `website`. Валидация целиком приходит из `schema.zmodel`, ни строчки ручного
  Zod на этой странице.

## [0.1.6] - 2026-09-02

### Fixed

- `robots.ts` уже использовал `@letar/seo` (`isProductionDomain()`) корректно, но
  `NEXT_PUBLIC_BASE_URL` не была проброшена ни в один из compose-файлов и env — гейт был
  no-op, staging (`form-example-stage.s3.letar.best`) индексировался наравне с продом. Добавлена
  переменная в `docker-compose.staging.yml`/`docker-compose.production.yml` и
  `.env.staging.enc`/`.env.docker.enc` (§33 `PLAN-INFRA-2.md`).

## [0.1.5] - 2026-09-02

### Added

- `public/llms.txt` — карта публичных разделов для LLM-агентов (llmstxt.org), см.
  [.claude/docs/llms-txt-pattern.md](../../.claude/docs/llms-txt-pattern.md).

## [0.1.4] - 2026-09-01

### Fixed

- `@letar/demo-protection` резолвился только через `nx.implicitDependencies`, не был в
  `dependencies` — под изолированным линковщиком bun это тихо ронял `typecheck:tsgo` с
  `TS2307: Cannot find module '@letar/demo-protection'`. Добавлен в `dependencies`.

## [0.1.2] - 2026-08-20

### Fixed

- Все 42 examples-страницы получили настоящий `<h1>` — Chakra `Heading` рендерит `<h2>` по
  умолчанию, ни одна страница не имела `<h1>` в DOM. Root cause 5 упавших e2e-спеков (§18.7 M2:
  `basic`/`conditional`/`groups`/`multi-step`/`validation`, все проверяют
  `getByRole('heading', {level: 1})`). Добавлен общий `PageH1` (`asChild` + нативный `<h1>`).

## [0.1.1] - 2026-04-04

### Improved

- Обновлён PLAN.md — цели синхронизированы с библиотекой v0.84.2 (56 полей)
- 42 демо-страницы покрывают все основные паттерны

## [0.1.0] - 2026-03-23

### Added

- Showcase приложение @letar/forms
- 11 демо-страниц (basic, all-fields, validation, conditional, multi-step, groups, auto-fields, zenstack, theming, i18n, offline)
- ZenStack интеграция с `schema.zmodel` и `@form.*` директивами
- Docker деплой на forms-example.letar.best (порт 3022)
