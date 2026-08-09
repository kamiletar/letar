# Changelog

Все значимые изменения в библиотеке @letar/forms документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [1.4.6] - 2026-08-09

### Changed

- **Внутренний рефакторинг (Фаза 7.1, Этап 3в-3г) — без изменений публичного API и поведения.**
  Chakra/React-free утилиты `credit-card` (luhn, detectBrand, formatExpiry, formatCardNumber,
  creditCardSchema), `format-phone`, `table-utils` (+ чистые типы из `table-types`), DaData
  address provider и `create-form-error-map` вынесены в `@letar/forms-core` (dependency-free
  ядро). Все прежние пути импорта (`@letar/forms`, `@letar/forms/i18n`, локальные `./providers`,
  `./table-types`/`./table-utils`) продолжают работать — реэкспорт-шимы.

## [1.4.5] - 2026-08-09

### Added

- **Провайдер Yandex SmartCaptcha для `Form.Captcha`.** Запрошено для `svoichuzhie` (152-ФЗ —
  Turnstile/reCAPTCHA/hCaptcha отправляют IP и телеметрию браузера на зарубежные серверы,
  SmartCaptcha хранит данные в РФ). `provider="smartcaptcha"` + новый файл
  `captcha/providers/smartcaptcha.tsx` (лениво грузит `smartcaptcha.cloud.yandex.ru/captcha.js`,
  тот же паттерн explicit-render, что у `hcaptcha.tsx`). Серверная верификация через
  `verifyCaptcha({ provider: 'smartcaptcha', ... })` — нормализует нестандартный формат ответа
  SmartCaptcha (`{status, message, host}` вместо `{success, 'error-codes', hostname}`) и другие
  имена полей запроса (`secret`+`token`+`ip` вместо `secret`+`response`+`remoteip`) под общий
  `CaptchaVerifyResult`, прозрачно для потребителя.

## [1.4.4] - 2026-08-09

### Fixed

- **`Form.Field.Phone` не работал в WebKit при посимвольном вводе.** Компонент использовал
  `use-mask-input` (imask) — библиотека мутирует DOM-элемент напрямую в обход React, и это
  конфликтовало с controlled `value` конкретно при быстром посимвольном вводе в WebKit
  (Chromium/Firefox проходили). Найдено в `apps/dsperevod-e2e/src/callback-drawer.spec.ts` —
  все 4 теста падали на шаге ввода телефона (`--project=webkit`). Фикс — маска теперь
  форматируется чистым JS на каждый `onChange` (новый `specialized/utils/format-phone.ts`),
  без сторонних DOM-мутирующих библиотек — тот же паттерн, что уже используется в
  `credit-card-field.tsx`. Добавлен регрессионный тест на посимвольный ввод через
  `userEvent.type` в `field-phone.spec.tsx`.

## [1.4.3] - 2026-07-22

### Fixed

- **Утечка подписки `form.store` при рассинхроне версий `@tanstack/store`.** В установленной у части
  приложений версии (`@tanstack/store@^0.11.0`, тянется транзитивно через `@tanstack/form-core@1.33.x`)
  `subscribe()` возвращает объект `{ unsubscribe }`, а не bare-функцию (как в `0.7.x`/`0.9.x`). Три
  места в `libs/declarative/` (`form-subscribe.tsx`, `use-active-filters-count.ts`,
  `use-form-url-sync.ts`) и одно в `libs/history/use-form-history.ts` вызывали/возвращали результат
  `subscribe()` так, будто это всегда функция — `as any`-каст скрывал ошибку типов, но в рантайме
  cleanup либо не вызывался (подписка утекала на каждый mount/unmount), либо кидал
  `TypeError: ... is not a function`. `form-steps-step.tsx` был асимметричен в обратную сторону —
  предполагал только объектную форму. Найдено при разборе краша вкладки браузера в `apps/mandala`
  (см. `apps/mandala/PLAN_COMPLETED.md`), где точно такой же баг сидел в двух компонентах
  `@letar/admin-ui` (`SlugField`/`SeoField`, коммит `a5893e7c`). Все 6 мест приведены к одному
  безопасному паттерну (проверка `typeof subscription === 'function'`).
- **Новый `useFormStoreSubscribe(form, callback, deps)`** (`libs/forms/src/lib/utils/`, экспортирован
  из корневого `index.ts`) — общий хелпер для подписки на `form.store` внутри `useEffect`, инкапсулирует
  проверку формы возврата `subscribe()`. Один источник правды вместо копипасты этой проверки по коду;
  используется в `use-active-filters-count.ts`. Остальные затронутые файлы оставлены с инлайн-фиксом —
  у них есть дополнительная логика в cleanup (debounce-таймеры), не покрываемая общим хелпером.

## [1.4.2] - 2026-07-16

### Fixed

- **GET-утечка данных в URL до hydration:** `method="post"` на корневом `<form>` в `FormSimple` и
  `FormWithApi` (`src/lib/declarative/form-root/`). Без гидрации React форма сабмитится нативным
  GET — чувствительные поля (пароли и т.п.) попадают в URL/history/Referer/access-логи. Найдено
  кросс-приложенческим аудитом логин-форм монорепо. Чисто аддитивный атрибут, без breaking changes.

## [1.4.0] - 2026-05-22 — Form as State Manager

### Added

- **`Form.Subscribe`** — компонент подписки на значения формы с опциональным debounce:
  - `<Form.Subscribe>{(values, state) => ...}</Form.Subscribe>` — немедленная подписка (live preview)
  - `<Form.Subscribe debounce={300}>{(filters) => ...}</Form.Subscribe>` — debounced (фильтры → API-запросы)
  - `state.isDirty` / `state.isSubmitting` доступны в render prop
- **`Form.UrlSync`** — renderless-компонент двусторонней синхронизации формы с URL-параметрами:
  - Размещается внутри `<Form>`, подписывается на изменения, пишет в URL с debounce
  - Пропускает поля с дефолтными значениями — URL остаётся чистым
  - Сохраняет сторонние параметры (`utm_*`, `ref`, etc.)
  - Поддержка Next.js `router.replace` через проп `router`
- **`useFormUrlSync(options)`** — хук для чтения initial values из URL при маунте:
  - Умная типизация: `number` → `Number()`, `boolean` → `=== 'true'`, `string[]` → повторяющиеся params
  - Whitelist полей — защита от инъекций через URL
- **`readUrlValues(fields, defaults, searchParams?)`** — чистая функция (тестируема без React)
- **`useFormRef()`** — создаёт ref для доступа к инстансу формы снаружи дерева `<Form>`:
  - Передаётся как `<Form formRef={ref}>` → `ref.current.reset()`, `ref.current.setFieldValue()` и др.
- **`useActiveFiltersCount(defaults)`** — возвращает количество полей, отличающихся от дефолтов:
  - Поддерживает массивы (сравнение без учёта порядка), объекты, примитивы
  - Используется для бейджей «Фильтры (3)»
- **`onSubmit` теперь опциональный** — `<Form initialValue={...}>` без `onSubmit` работает как state-контейнер
- **`formRef` prop** на `<Form>` — передаёт инстанс TanStack Form во внешний ref после инициализации

### Documentation

- Новая статья [`libs/forms/articles/14-forms-as-state.md`](./articles/14-forms-as-state.md)
- Новый docs-гайд [`guides/filters-state.mdx`](../../apps/form-docs/content/docs/guides/filters-state.mdx) (EN + RU)
- Обновлены `MAPPING.md` и `PLAN.md`

## [1.3.0] - 2026-04-10 — Testing Utilities + URL Prefill

### Added

- **@letar/forms/testing** — новый entry point с хелперами для тестирования форм:
  - `renderForm()` — рендер в ChakraProvider + привязанные хелперы
  - `fillField()` — заполнение полей по data-field-name (text, number, checkbox)
  - `submitForm()` — поиск и клик кнопки сабмита
  - `expectFieldError()` / `expectNoFieldError()` / `expectFieldValue()` — ассерты
  - `goToStep()` / `expectActiveStep()` — мультистеп хелперы
  - `addItem()` / `removeItem()` / `expectItemCount()` — массивы
  - `renderComparison()` / `renderReadOnlyView()` — утилитарные компоненты
  - `TestWrapper` — централизованный ChakraProvider wrapper
- **useUrlPrefill()** — хук для автозаполнения формы из URL-параметров (whitelist, маппинг, массивы, вложенные объекты, cleanUrl)
- **generatePrefillUrl()** — генерация маркетинговых ссылок с предзаполненными параметрами

### Documentation

- Обновлены GitHub READMEs: letar-forms (56 fields, новые фичи), zenstack-form-plugin (бейджи), letar-form-mcp (56 fields)
- Добавлены MDX guides (EN+RU) и демо-страницы в form-docs для testing-utilities и url-prefill
- Добавлены примеры в form-example с навигацией

## [0.84.3] - 2026-04-04 — Fix: TableEditor checkbox selection

### Fixed

- **TableEditor selectable** — клик по чекбоксу одной строки выделял все строки. Причина: Chakra Checkbox без уникального `id` и `Checkbox.Indicator` внутри `Checkbox.Control` вызывал коллизии label-input привязок. Добавлены уникальные `id` и `Checkbox.Indicator`.

### Added

- **table-selection.spec.tsx** — 3 unit-теста для проверки изолированного выделения строк

## [0.84.2] - 2026-04-04 — Аудит документации: 56 полей задокументированы

### Added

- **docs/analytics.md** — полная документация аналитики форм (useFormAnalytics, 4 адаптера, AnalyticsPanel, события)
- **docs/fields.md** — добавлены 17 недокументированных полей: Document (7), Survey (3), YesNo, TableEditor, DataGrid, Hidden, Calculated, Signature, CreditCard
- **docs/form-level.md** — добавлены секции: Captcha, Analytics.Panel, History.Controls, Comparison, ReadOnlyView, Skeleton, DependsOn
- **docs/api-reference.md** — добавлены: useFormHistory, useFormAnalytics, useFormAutosave, mapServerErrors, applyServerErrors, deepEqual, safeStringify

### Improved

- **README.md** — обновлён счётчик полей: "50+" → "56"
- **docs/fields.md** — обновлён счётчик: "40 типов" → "56 типов", добавлены 6 новых категорий полей

## [0.84.1] - 2026-04-04 — Аудит качества: unit-тесты ядра и документных полей

### Added

- **create-form.spec.tsx** — 10 unit-тестов для фабрики createForm (extraSelects, extraComboboxes, extraListboxes, extraFields, комбинирование)
- **form-autosave.spec.ts** — 12 unit-тестов для useFormAutosave (saveNow, loadDraft, localStorage fallback, callbacks, HTTP метод, draftId)
- **document-fields.spec.ts** — 27 unit-тестов для валидации документных полей (ИНН, БИК, ОГРН, СНИЛС, КПП, паспорт, р/с, корр. счёт)

### Improved

- **TESTING_PLAN.md** — актуализированы метрики (109 файлов, 1074 теста; убраны завышенные планируемые числа)
- Метрики: 112 тестовых файлов, 1074 теста (было 109/1020)

## [0.84.0] - 2026-04-04 — P3 тесты + документация DX-фич

### Added

- **5 unit-тестов P3**: creditCardSchema, KPP validator, table-utils (6 функций), captcha verify (3 провайдера), useConversationalState
- **5 MDX guides** (form-docs): comparison, depends-on, readonly-view, form-skeleton, debug-values
- **4 demo pages** (form-docs): comparison, depends-on, debug-values, form-templates
- **3 example pages** (form-example): comparison, depends-on, debug-values

### Improved

- Навигация form-example: +3 ссылки (Comparison Diff, DependsOn, Debug Values)
- meta.json form-docs: +5 guide slugs
- Метрики: 109 тестовых файлов, 1020 тестов (было 104/951)

## [0.83.0] - 2026-04-04 — DragHandle, SVG export, async validation Spinner

### Added

- **Signature SVG Export** — новый проп `exportFormat: 'png' | 'svg'` для поля подписи
  - Draw mode: запись stroke-координат → SVG `<path>` элементы
  - Typed mode: SVG `<text>` элемент с курсивным шрифтом
  - Векторный формат для печати без потери качества
  - XSS-защита через `escapeXml()` для typed mode
  - По умолчанию `'png'` — полная обратная совместимость
  - 10 unit-тестов для SVG утилит

### Improved

- **TableEditor DragHandle** — заменён текстовый ⋮ на полноценный `DragHandle` компонент из @dnd-kit с keyboard support, aria-label и grab/grabbing курсором
- **Async Validation Spinner** — заменён текст "⟳ Проверяю..." на Chakra `Spinner` компонент + синяя рамка на input при валидации (`data-validating` атрибут)

## [0.82.0] - 2026-04-04 — P2 тесты, lint/typecheck фиксы, E2E инфраструктура

### Fixed

- **honeypot.tsx** — tabIndex вынесен из style в JSX prop (TS2353)
- **field-file-upload.tsx** — добавлен generic FileUploadFieldState в createField (TS2322/TS2349)
- **field-signature.tsx** — placeholder/disabled из resolved вместо componentProps (TS2339)
- **rate-limiter.ts** — убрана неиспользуемая переменная attemptVersion (TS6133)
- **map-server-errors.ts** — `==` → `===` (eqeqeq)

### Tests

- 8 новых P2 unit-тестовых файлов: SegmentedGroup, Tags, CheckboxCard, RadioCard, Schedule, Address, RichText, City
- 828 тестов в 81 файле (100% проходят)
- E2E инфраструктура: form-example-e2e с Playwright (5 тестов: basic, validation, multi-step, conditional, groups)

## [0.81.0] - 2026-04-04 — Баг-фиксы, типобезопасность, тестовое покрытие

### Fixed

- **AbortController в FieldAddress** — отмена in-flight запросов при новом вводе и unmount, устранён race condition
- **deepEqual()** — замена JSON.stringify на корректное глубокое сравнение в FormComparison и RelationFieldProvider
- **safeStringify()** — безопасная сериализация объектов с circular refs в FormComparison и FormReadOnlyView

### Improved

- **Типобезопасность** — RelationConfig: `any` → `unknown`, убраны eslint-disable комментарии

### Tests

- 8 новых тестовых файлов: deepEqual, safeStringify, Rating, PinInput, OTPInput, ColorPicker, Editable, NumberInput, Autocomplete, Listbox
- 802 теста в 73 файлах (100% проходят)

## [0.80.0] - 2026-04-04 — DX фичи: Analytics, History, ServerErrors, ReadOnly, Skeleton, Comparison, DependsOn

### Added

- **mapServerErrors()** — автоматический маппинг серверных ошибок на поля формы
  - Автодетект формата: Prisma P2002/P2003/P2025/P2014, ZenStack policy/db-query, Zod flatten, ActionResult
  - `applyServerErrors(form, mapped)` для TanStack Form
  - Кастомный fieldMap для constraint → поле маппинга
  - Locale: ru/en, subpath `@letar/forms/server-errors`
  - 24 unit-теста, bench: 10M+ ops/sec
- **useFormHistory()** — Undo/Redo для форм (Ctrl+Z/Ctrl+Y)
  - Debounced structuredClone снапшоты
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
  - HistoryControls — визуальные кнопки ↩/↪
  - Persist в sessionStorage (опционально)
- **Form.Analytics** — встроенная field-level аналитика форм
  - useFormAnalytics() — focus/blur/error/correction/abandon/complete
  - AnalyticsPanel — dev-only live-панель
  - 4 адаптера: Umami, Яндекс Метрика, GA4, PostHog
  - Subpath `@letar/forms/analytics`, bench: 25M+ ops/sec
- **FormReadOnlyView** — отображение данных формы в режиме чтения
  - Автоматические labels из Zod .meta({ ui: { title } })
  - exclude/include, compact mode, кастомные formatters
- **FormSkeleton** — loading state из Zod-схемы
  - Автоопределение количества полей из schema
  - showSubmit, configurable fieldHeight/gap
- **FormComparison** — diff-view (было → стало)
  - Подсветка изменённых полей, onlyChanged mode
  - Labels из Zod .meta(), exclude, кастомные labels
- **FormDependsOn** — каскадный рендеринг по значению поля
  - cases map: значение → children, fallback

### Tests

- 59 новых unit/render тестов + 13 E2E + 16 бенчмарков

## [0.78.0] - 2026-04-03 — Captcha + CreditCard (Фазы 29-30)

### Added

- **Form.Captcha** — CAPTCHA для защиты форм (Cloudflare Turnstile, Google reCAPTCHA, hCaptcha)
  - Провайдер-абстракция с lazy loading
  - Серверная верификация через `verifyCaptcha()`
  - Интеграция с `createForm({ captcha: {...} })`
- **Form.Field.CreditCard** — ввод данных банковской карты
  - Авто-форматирование номера (4-4-4-4 / 4-6-5 для Amex)
  - Определение бренда по BIN (Visa, MC, Amex, МИР, JCB, Discover, UnionPay, Maestro)
  - Luhn валидация, MM/YY expiry
  - Готовая Zod-схема `creditCardSchema()`
  - SVG иконки брендов (inline)
  - Accessibility: role="group", aria-label, inputMode="numeric"

### Dependencies

- `@marsidev/react-turnstile` — peer dependency для Turnstile

## [0.77.0] - 2026-04-03

### Improved

- **DataGrid** — column reordering: drag заголовки колонок для изменения порядка
- **DataGrid** — diff highlighting: изменённые ячейки подсвечиваются жёлтым
- **MatrixChoice** — keyboard навигация: стрелки для перемещения между ячейками, Enter/Space для выбора

## [0.76.0] - 2026-04-03

### Improved

- **DataGrid** — виртуализация 1000+ строк через @tanstack/react-virtual (`virtualized` prop)
  - Автоматический scroll-container с фиксированной высотой
  - Пагинация автоматически отключается при виртуализации
  - overscan: 10 строк для плавной прокрутки
- **DataGrid** — column resizing: drag границы колонок (`columnResizing` prop)
  - Визуальный индикатор resize при перетаскивании
- **DataGrid** — расширенные фильтры уже поддерживают text (range, select, date — через кастомные filterFn)
- **MatrixChoice** — подсветка незаполненных строк красным при required + ошибке валидации
- **Async Validation** — loading indicator "Проверяю..." в FieldError при isValidating
- **TableEditor** — DnD сортировка строк через SortableWrapper (@dnd-kit)
- **TableEditor** — responsive mobile card view (карточки на sm breakpoints)

## [0.75.0] - 2026-04-03

### Added

- **`Form.Field.DataGrid`** — редактируемая таблица данных на TanStack Table (Фаза 16.2)
  - TanStack Table v8 под капотом
  - Сортировка по клику на заголовок (↑↓)
  - Текстовые фильтры по колонкам
  - Пагинация (кнопки Назад/Далее, номер страницы)
  - Inline editing: клик по ячейке → Input
  - Row-level save (`onRowSave` callback)
  - Чекбокс-выбор строк + bulk delete
  - Diff от TableEditor: DataGrid — для существующих данных с фильтрацией/сортировкой/пагинацией

### Changed

- Убраны из плана Фаза 16.3 (Spreadsheet) и 16.4 (Bulk Entry) — нишевые, избыточные

## [0.74.0] - 2026-04-03

### Added

- **Conversational Mode** — Typeform-стиль: одно поле за раз с анимацией
  - `ConversationalMode` компонент-обёртка для полей формы
  - Анимация fade-in-up при переходе между полями
  - Progress bar и номер вопроса ("Вопрос 3 из 7")
  - Enter → следующее поле, Alt+стрелки для навигации
  - Кнопки Назад/Далее/Отправить
  - Welcome screen и Completed screen
  - `useConversationalState` хук для кастомного UI
  - Keyboard-first UX

## [0.73.0] - 2026-04-03

### Added

- **Autosave to Server** — серверное автосохранение форм
  - `useFormAutosave(form, config)` хук: периодическое POST/PUT с debounce
  - `AutosaveIndicator` компонент: статус "Сохраняю..." / "Сохранено" / "Ошибка"
  - Fallback на localStorage при отсутствии сети
  - Восстановление черновиков: `loadDraft()` (сервер → localStorage)
  - Не отправляет если данные не изменились
  - AbortController-совместимый

## [0.72.0] - 2026-04-03

### Added

- **Form Templates** — 10 готовых шаблонов форм для быстрого старта
  - `Form.FromTemplate` — компонент автоматической генерации формы из шаблона
  - **Auth:** loginForm, registerForm, forgotPasswordForm
  - **Feedback:** contactForm, feedbackForm
  - **Survey:** npsForm
  - **Business:** companyRegistration (ИНН, КПП, ОГРН, реквизиты)
  - **E-commerce:** orderForm (клиент, адрес, товары)
  - **Profile:** profileForm (имя, email, телефон)
  - **Address:** addressForm (страна, город, улица, дом, индекс)
  - Headless: `templates.xxx.schema` + `templates.xxx.defaultValues`
  - Override: `exclude`, `fields` для кастомизации
  - `FormTemplate<T>` интерфейс для создания собственных шаблонов

## [0.71.0] - 2026-04-03

### Added

- **Async Validation** — асинхронная валидация полей через props или Zod `.meta()`
  - `asyncValidate` prop на любом поле: `<Form.Field.String asyncValidate={checkEmail} />`
  - Декларативно через `.meta({ asyncValidate, asyncDebounce, asyncTrigger })`
  - Debounce (по умолчанию 500мс), AbortController для отмены предыдущего запроса
  - Кэширование результатов (не перепроверяет уже валидированные значения)
  - Offline-safe: пропускает async-валидацию при отсутствии сети
  - Триггер: `onBlur` (по умолчанию) или `onChange`
  - Интеграция через TanStack Form `validators.onBlurAsync`/`onChangeAsync`
  - `useAsyncFieldValidation` хук для кастомного использования

## [0.70.0] - 2026-04-03

### Added

- **`Form.Field.ImageChoice`** — выбор из картинок (grid карточек с изображениями)
  - Single/multiple selection, hover + selected overlay
  - Responsive grid (1→2→N колонок)
- **`Form.Field.Likert`** — шкала Лайкерта (5-7 точек с текстовыми якорями)
  - Горизонтальная шкала (десктоп), вертикальный список (мобайл)
  - Опциональная нумерация точек
- **`Form.Field.YesNo`** — бинарный выбор (два больших блока)
  - Варианты: `buttons`, `thumbs` (👍👎), `emoji` (😊😞)
  - Зелёный/красный highlight при выборе

## [0.69.0] - 2026-04-03

### Added

- **`Form.Field.MatrixChoice`** — матричный выбор для опросников и NPS-форм
  - Таблица "вопрос × вариант ответа" (как в Google Forms, SurveyMonkey)
  - 3 варианта: `radio` (одиночный), `checkbox` (множественный), `rating` (звёзды)
  - Responsive: на мобильных — карточки вместо таблицы
  - Row hover highlight, keyboard navigation
  - Значение: `Record<string, string | string[]>`

## [0.68.0] - 2026-04-03

### Added

- **`Form.Field.TableEditor`** — инлайн-редактируемая таблица для array-полей
  - Авто-колонки из Zod schema `.meta({ ui: { title } })` или кастомные через `columns` prop
  - Клик по ячейке → inline editing (Input, NativeSelect, Checkbox в зависимости от типа)
  - Tab/Enter навигация между ячейками, Enter в последней → новая строка
  - Escape → выход из редактирования
  - Стрелки вверх/вниз для перемещения между строками
  - Computed columns — вычисляемые readonly колонки
  - Footer aggregates — SUM, AVG, COUNT, MIN, MAX по колонкам
  - Copy-paste из Excel/Sheets (парсинг TSV через Clipboard API)
  - Чекбокс-выбор строк + массовое удаление
  - Cell-level Zod валидация (ошибки прямо в ячейке)
  - Пустое состояние с placeholder текстом
  - `sortable`, `selectable`, `clipboard`, `striped` props
  - Хуки: `useTableColumns`, `useTableNavigation`, `useTableClipboard`, `useTableEditorContext`
  - Утилиты: `parseTSV`, `buildTSV`, `coerceValue`, `computeAggregate`, `formatCellValue`

## [0.67.0] - 2026-04-03

### Added

- **Russian Documents** — `zRu` Zod-валидаторы + `Form.Document.*` UI-компоненты
  - **Валидаторы** (`@letar/forms/validators/ru`): zRu.inn(), zRu.kpp(), zRu.ogrn(), zRu.ogrnip(), zRu.bik(), zRu.bankAccount(), zRu.corrAccount(), zRu.snils(), zRu.passport()
  - Контрольные суммы: ИНН (взвешенная mod 11), ОГРН (mod 11), ОГРНИП (mod 13), СНИЛС (mod 101), банковский счёт (контрольный ключ с БИК)
  - Варианты ИНН: `zRu.inn.legal()` (10 цифр), `zRu.inn.individual()` (12 цифр)
  - Transform: автоматическая очистка от пробелов/дефисов
  - **UI-компоненты** (`Form.Document.*`): INN, KPP, OGRN, BIK, BankAccount, CorrAccount, SNILS, Passport
  - Маска ввода (use-mask-input), иконки, realtime-валидация контрольных сумм
  - `createDocumentField` — фабрика для кастомных документных полей
  - Subpath export: `@letar/forms/validators/ru` для headless использования
- 46 unit-тестов для валидаторов

## [0.66.0] - 2026-04-03

### Added

- **`Form.Field.Signature`** — поле цифровой подписи
  - Draw mode: рисование мышью и пальцем (touch) на Canvas
  - Typed mode: ввод имени курсивным шрифтом, отрисовка на Canvas
  - Переключение режимов через SegmentedControl (Draw / Type)
  - Кнопка очистки подписи
  - Placeholder поверх пустого canvas
  - Responsive: canvas адаптируется к ширине контейнера
  - Touch support: `touchAction: none` для предотвращения scroll
  - Accessibility: `role="img"`, `aria-label`, Tab focus, typed mode как keyboard fallback
  - Dark mode support через props `strokeColor`/`backgroundColor`
  - Значение: data URI строка (image/png base64)
  - Props: `width`, `height`, `strokeColor`, `strokeWidth`, `backgroundColor`, `clearLabel`, `placeholder`, `allowTyped`, `typedFont`
- 7 unit-тестов для FieldSignature

## [0.65.0] - 2026-04-03

### Added

- **Security Patterns** — три механизма защиты форм
  - **Honeypot** — ловушка для ботов: `<Form honeypot={true}>`, скрытое поле блокирует submit ботов
  - **Rate Limiting** — клиентский лимит: `<Form rateLimit={{ maxSubmits: 3, windowMs: 60000 }}>`, обратный отсчёт, sessionStorage persistence
  - **Secure File Upload** — расширение FileUpload: `<Form.Field.FileUpload security={{ ... }}>`:
    - `maxSize` — проверка размера ('10MB', '500KB')
    - `allowedTypes` — проверка MIME по magic bytes (не по расширению)
    - `stripMetadata` — удаление EXIF через Canvas API
    - `renameFile` — замена имени на UUID (защита от path traversal)
- `parseFileSize()`, `validateMimeType()`, `sanitizeFileName()` — утилиты безопасности
- `useRateLimit()` — хук клиентского rate limiting
- `FileSecurityConfig`, `RateLimitConfig` — типы конфигурации
- 21 unit-тест для security модуля

## [0.64.0] - 2026-04-03

### Added

- **`Form.Field.Calculated`** — вычисляемое поле формы с автоматическим пересчётом
  - `compute(values)` — функция вычисления значения из всех полей формы
  - `format(value)` — форматирование отображения (например, `1 500 ₽`)
  - `deps` — список зависимых полей для оптимизации пересчёта
  - `debounce` — дебаунс вычислений для тяжёлых формул
  - `hidden` — скрытый режим (вычисляет без отображения, как Hidden)
  - Защита от циклических зависимостей (runtime detection)
  - Работает внутри `Form.Group` (group-aware paths)
  - Значение readonly, сохраняется в form state при submit
- `useComputedValue` — хук реактивного вычисления (подписка на form.store)
- 8 unit-тестов для FieldCalculated
- Демо-страница calculated-demo в form-develop-app

## [0.63.0] - 2026-04-03

### Added

- **`Form.InfoBlock`** — информационный блок внутри формы (info/warning/error/success/tip), на базе Chakra Alert
  - Props: `variant`, `title`, `appearance`, `size`
  - Интеграция с `Form.When` для условного отображения
- **`Form.Divider`** — разделитель секций формы с опциональной меткой и иконкой, на базе Chakra Separator
  - Props: `label`, `icon`, `variant` (solid/dashed/dotted), `size`, `colorPalette`
- **`Form.Field.Hidden`** — скрытое поле формы (не рендерится в DOM, только в form state)
  - Реактивная синхронизация `value` prop с form state
  - Полезно для UTM-меток, referral кодов, внутренних ID
- 10 unit-тестов для новых компонентов

## [0.62.0] - 2026-04-03

### Added

- **Smart Autofill** — автоматическое проставление HTML `autocomplete` атрибутов по имени поля (+30% конверсии, WCAG 1.3.5)
  - 30+ маппингов: email, phone, firstName, lastName, password, address, city, zip, country, company, username...
  - Override через `.meta({ ui: { autocomplete: '...' } })` или prop `autoComplete`
  - Приоритет: prop > meta > авто-определение
  - Поддержка dot-path (address.city → autocomplete="address-level2")
  - `autocomplete` в `FieldUIMeta` для ZenStack-генерации
- Поле `autocomplete` в `ResolvedFieldProps` — доступно всем field-компонентам
- 22 unit-теста для маппинга autocomplete

## [0.61.0] - 2026-04-03

### Added

- **`onFieldChange` prop** на `<Form>` — реактивные побочные эффекты при изменении полей (автогенерация slug, пересчёт итогов, синхронизация зависимых полей)
- **`<Form.Watch>`** — renderless compound component для отслеживания изменений поля внутри формы (group-aware, резолвит пути относительно `Form.Group`)
- **`FieldChangeApi`** — интерфейс с `setFieldValue`, `getFieldValue`, `getValues` для callbacks
- **`useFieldChangeListeners`** — хук подписки на изменения полей через `form.store.subscribe()` с `Object.is` сравнением
- 7 unit-тестов для нового функционала

### Fixed

- `FormRoot` теперь прокидывает `middleware` и `addressProvider` в `FormSimple`/`FormWithApi` (ранее терялись)

## [1.1.0] - 2026-04-01

### Added

- **size-limit** CI: bundle size проверка перед каждым npm publish (20 KB brotli full)
- **Категорийные entry points**: `@letar/forms/fields/{text,number,datetime,selection,boolean,specialized}`
- **Бенчмарк ре-рендеров**: 10 полей, ввод в одно → 0 лишних рендеров у остальных
- **FieldErrorBoundary**: ErrorBoundary для каждого field-компонента (fallback при ошибке рендеринга)
- **Type-тесты**: DeepKeys, DeepValue, useTypedFormSubscribe (vitest expectTypeOf)
- `loadingText` prop в `Form.Button.Submit` для кастомного текста при загрузке
- `City` и `sortable` в FormFieldComponents/FormGroupListComponent типах

### Fixed

- Race condition в Form.Steps — все шаги получали index=0
- Число полей "49" → "40" во всех 12 статьях и README

### Changed

- tsup entry points расширены с 3 до 9 (code splitting для categories)
- Bundle Size секция в README с актуальными метриками
- `package.publish.json` exports map с 6 category entry points

## [0.58.0] - 2026-03-31

### Added

- Pluggable `AddressProvider` interface for `Form.Field.Address` and `Form.Field.City`
- `createDaDataProvider()` — built-in DaData provider (Russia)
- `createForm({ addressProvider })` — set address provider once for all fields
- Provider resolution: field prop → createForm context → token fallback → env
- `addressProvider` prop on `Form` root component
- `CityFieldProps` exported from types
- `README.en.md`: Address Provider + createForm sections

### Changed

- All JSDoc, comments, runtime errors translated to English (118 files, ~3000 lines)
- Default UI strings: "Save", "Reset", "Unsaved changes", "Leave", "Stay", etc.
- `AddressValue.data` generalized to `Record<string, unknown>` (was DaData-specific)
- `AddressFieldProps.token` is now optional (use `provider` instead)
- `DaDataSuggestion` marked as deprecated
- `build:npm` copies `README.en.md` as `README.md` + `README.ru.md` for npm

## [0.56.0] - 2026-03-23

### Added

- `Form.DebugValues` — интерактивный JSON-инспектор значений формы (скрыт в production)
- `debug` prop на `Form` для автоматического отображения DebugValues
- Инфраструктура публикации `@letar/forms` на npm

### Fixed

- Совместимость с `@tanstack/store` 0.9+ (Subscription API)
- Исправлен баг `destroy` в `form-steps`

## [0.54.1] - 2026-01-05

### Fixed

- `FieldNumber`: для опциональных полей не передаём min/max в NumberInput когда значение пустое — убрана красная рамка для пустых опциональных полей

## [0.54.0] - 2026-01-03

### Added

- `form-from-schema.spec.tsx` — unit тесты для `FormFromSchema` (~15 тестов)
- `form-with-api.spec.tsx` — unit тесты для `FormWithApi` (~12 тестов)
- Покрытие тестами всех критичных компонентов схемогенерации

### Changed

- Deprecated type aliases централизованы в `form-fields/index.ts`
- Удалены локальные deprecated экспорты из 7 selection компонентов
- `field-select.tsx` использует `BaseOption<string | number>[]` вместо `SelectOption`

### Improved

- Общее покрытие тестами: +27 unit тестов
- Обратная совместимость сохранена через централизованный реэкспорт deprecated типов

## [0.53.0] - 2025-12-31

### Added

- Оптимизация производительности форм
- Улучшенная мемоизация в form-fields

## [0.51.0] - 2025-12-24

### Added

- `useAsyncSearch` — общий хук для async поиска с debounce (Combobox, Autocomplete)
- `AsyncQueryFn`, `AsyncQueryResult` — типы для async запросов
- Persistence TTL — опция `ttl` для времени жизни черновика
- `ClearDraftButton` — компонент кнопки очистки черновика
- `savedAt` — timestamp сохранения черновика в `FormPersistenceResult`

### Changed

- `FieldCombobox` и `FieldAutocomplete` используют `useAsyncSearch` вместо дублирования логики
- `useFormPersistence` теперь сохраняет данные в новом формате с метаданными (version, savedAt)
- Обратная совместимость со старым форматом сохранённых данных

## [0.50.0] - 2025-12-24

### Added

- `SelectionFieldLabel` — общий компонент для label+tooltip в selection полях
- `useGroupedOptions` — хук группировки опций (Combobox, Listbox, Select)
- `getOptionLabel` — утилита для получения label опции
- `zod-utils.ts` — централизованные функции `unwrapSchema`, `unwrapSchemaWithRequired`
- `LinkPopover` — модальное окно для ввода URL вместо `window.prompt()`
- Защита от циклических схем в `schema-traversal` (WeakSet + MAX_DEPTH=20)
- `SWITCH_STYLES` константы в `field-schedule.tsx`

### Changed

- `extractConstraints` рефакторинг с generic handler pattern
- `FormSteps` декомпозиция на хуки: `useStepState`, `useStepPersistence`, `useStepNavigation`
- Selection поля используют общие компоненты вместо дублирования

### Fixed

- `field-rich-text`: добавлен try/catch для JSON.parse

### Removed

- ~500 строк дублирующегося кода

## [0.49.0] и ранее

История изменений до v0.50.0 не документировалась.
