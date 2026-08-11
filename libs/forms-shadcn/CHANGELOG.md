# Changelog

Все значимые изменения в библиотеке @letar/forms-shadcn документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [0.30.0] - 2026-08-11

### Added

- **`FieldAuto`** — автоопределение типа поля из Zod-схемы, диспетчеризация на существующие поля
  пакета по базовому Zod-типу. Beta: без `renderFieldByType`/`meta.fieldType`-диспетчеризации на
  ~50 типов (Chakra-версия). **Полный паритет с `@letar/forms` достигнут — 56 из 56 полей.**

## [0.29.0] - 2026-08-11

### Added

- **`FieldCalculated`** — вычисляемое поле (readonly, автопересчёт из других полей формы).
  `useComputedValue` (framework-free) портирован из Chakra-версии дословно, `useDebounce`
  переиспользован из уже публичного экспорта `@letar/forms-react`. Паритет с `@letar/forms`: 47
  из 56.

## [0.28.0] - 2026-08-11

### Added

- **`FieldDataGrid`** — большая таблица на `@tanstack/react-table` (новый peer-dep, `>=8.0.0`):
  сортировка, текстовая фильтрация, пагинация, инлайн-редактирование, CSV-экспорт, bulk-удаление.
  Реализация изолирована через `lazy()` + dynamic `import()` (`field-data-grid-impl.tsx`) — тот же
  паттерн, что у `FieldRichText`, `@tanstack/react-table` резолвится только при рендере поля.
  Beta: без виртуализации, resize/drag-reorder колонок и auto-резолва из schema. Паритет с
  `@letar/forms`: 46 из 56.

## [0.27.0] - 2026-08-11

### Added

- **`FieldMatrixChoice`** — таблица «вопрос × вариант ответа» (radio/checkbox/rating), портирован
  из Chakra-версии без изменений логики. Beta: одна разметка на все брейкпоинты, без стрелочной
  клавиатурной навигации по ячейкам. Паритет с `@letar/forms`: 45 из 56.

## [0.26.0] - 2026-08-11

### Added

- **`FieldLikert`** — шкала Лайкерта для опросов, портирован из Chakra-версии без изменений
  логики. Beta: один горизонтальный ряд на все брейкпоинты, без раздельного мобильного вида.
  Паритет с `@letar/forms`: 44 из 56.

## [0.25.0] - 2026-08-11

### Added

- **`FieldSchedule`** — редактор недельного расписания (toggle дня, время open/close,
  копирование понедельника на будни, предупреждение при `close <= open`). Портирован из
  Chakra-версии без изменений логики. Паритет с `@letar/forms`: 43 из 56.

## [0.24.0] - 2026-08-11

### Added

- **`FieldImageChoice`** — grid карточек с изображениями (single/multiple selection),
  портирован из Chakra-версии без изменений логики. Beta: фиксированные колонки через inline
  `gridTemplateColumns`, без `SimpleGrid`-responsive. Паритет с `@letar/forms`: 42 из 56.

## [0.23.0] - 2026-08-11

### Added

- **`FieldCascadingSelect`** — каскадный select (страна→город), не `createField()`-поле —
  компонует `form.Subscribe` напрямую. Портирован из Chakra-версии без изменений логики. Beta:
  только `string`-generic, без спиннера загрузки. Паритет с `@letar/forms`: 41 из 56.

## [0.22.0] - 2026-08-11

### Added

- **`FieldTime`** — нативный `<input type="time">` с поддержкой `min`/`max`/`step` (в обход
  `UIKitInputProps`, `NATIVE_INPUT_CLASS`). Паритет с `@letar/forms`: 40 из 56.

## [0.21.0] - 2026-08-11

### Added

- **`FieldPasswordStrength`** — пароль с индикатором силы (прогресс-бар + чеклист требований),
  портирован из Chakra-версии без изменений логики расчёта. Паритет с `@letar/forms`: 39 из 56.

## [0.20.0] - 2026-08-11

### Added

- **`FieldNumberInput`** — числовое поле со степпер-кнопками (increment/decrement) поверх
  `shadcnUIKit.NumberInput`. Beta: без `formatOptions`/`allowMouseWheel`/`clampValueOnBlur`.
  Паритет с `@letar/forms`: 38 из 56.

## [0.19.0] - 2026-08-11

### Added

- **`FieldYesNo`** — бинарный выбор (согласие/подтверждение) двумя кликабельными блоками
  (`role="radio"` в `role="radiogroup"`), тот же паттерн, что `FieldRadioCard`/`FieldListbox`.
  Портирован из Chakra-версии (`field-yes-no.tsx`) без изменений логики. Варианты `variant`:
  `'buttons'` (текст), `'thumbs'` (👍/👎), `'emoji'` (😊/😞). Значение — `boolean`. Продолжение
  паритета с `@letar/forms` (37 из 56 полей).

## [0.18.1] - 2026-08-11

### Changed

- **`FieldRichText` изолирован через `lazy()` + dynamic `import()`.** Пакет пока чистый
  workspace-пакет без tsup/entry-сплиттинга — до этого изменения любой импорт из
  `@letar/forms-shadcn` требовал резолва `@tiptap/*` в графе сборки, даже если реально
  используются только текстовые/числовые поля. Реализация вынесена в
  `field-rich-text-impl.tsx`, `field-rich-text.tsx` стал тонкой `lazy()`-обёрткой (тот же
  паттерн, что применён в `@letar/forms` 2.0.3 к `FieldRichText`/`FieldMaskedInput`/
  `Form.Document.*`/`FieldDataGrid`/`FieldTableEditor`). Публичный API не изменился.

## [0.18.0] - 2026-08-11

### Added

- **`FieldRichText`** — пятое, последнее из приоритетного списка координатора (Signature ✅ →
  FileUpload ✅ → Steps ✅ → Table ✅ → **RichText** ✅, тред `forms-phase7-3-shadcn`) — паритет
  по этому списку закрыт. WYSIWYG-редактор на Tiptap (`StarterKit` + `Underline` + `Link` +
  `Placeholder`), портирован из `@letar/forms` (Chakra-скин): тот же домен (extensions, `onUpdate`,
  синхронизация `value` при внешнем изменении, `outputFormat: 'html' | 'json'`), другая обвязка —
  native `<button>`-тулбар вместо `IconButton`/`HStack`, Tailwind arbitrary-selector'ы вместо
  Chakra `css`-проп для стилизации содержимого редактора (заголовки/списки/цитаты/код/ссылки) и
  placeholder (`content-[attr(data-placeholder)]`).
  - **Beta-упрощения:** без `imageUpload`/`ImagePopover` (загрузка изображений на сервер — не
    портирована, требует app-specific upload endpoint); кнопка `link` — `window.prompt` вместо
    Popover-формы (тот же фолбэк уже был в Chakra `TOOLBAR_CONFIG.link.action` на случай
    использования без отдельного `LinkPopover`).
  - Новые peer-зависимости: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
    `@tiptap/extension-underline`, `@tiptap/extension-placeholder` (уже установлены в корне
    монорепо как зависимости `@letar/forms`, здесь просто заявлены как peer).
  - Тесты: рендер contenteditable, label, тулбар по умолчанию/ограниченный/скрытый,
    disabled/readOnly, негативный контроль типов `toolbarButtons`. Клик по кнопке форматирования
    проверяется только на отсутствие краша — jsdom не реализует DOM Selection API до состояния,
    нужного ProseMirror, чтобы `toggleBold()` реально применился (аналог находки про
    blur-события в `FieldTableEditor`, см. `libs/forms/PLAN.md` §7.3).

## [0.17.0] - 2026-08-10

### Added

- **`FieldTableEditor`** — четвёртое из приоритетного списка координатора (Signature ✅ →
  FileUpload ✅ → Steps ✅ → **Table** ✅ → RichText, тред `forms-phase7-3-shadcn`). Инлайн-
  редактируемая таблица для array-полей, портирована из `@letar/forms` (Chakra-скин): та же
  логика (`use-table-columns`, `use-table-navigation`, `@letar/forms-core/table` и
  `@letar/forms-core/schema` утилиты, все без изменений), другая разметка (native `<table>` +
  Tailwind вместо Chakra `Table.Root`). Поддерживает авто-колонки из schema, кастомные колонки
  с `computed`/`format`, footer-агрегаты (sum/avg/count/min/max), copy-paste из Excel/Sheets
  (TSV), keyboard-навигацию (Tab/Enter/Escape/стрелки), чекбокс-выбор строк с bulk-delete,
  мобильный вид карточками (ниже `md`), `minRows`/`maxRows`.
  - **Beta-упрощение:** `sortable` — нативный HTML5 drag&drop (`draggable` +
    `onDragStart`/`onDragOver`/`onDrop`), не `@dnd-kit` — тот же принцип, что у `FormSteps` без
    `framer-motion`: не тянуть новый peer ради одной фичи в первом проходе. Функционально
    эквивалентно (перетаскивание строк работает), но без keyboard-DnD и анимации перестроения,
    которые даёт `@dnd-kit/sortable`.

## [0.16.1] - 2026-08-10

### Changed

- **`FormSteps`: `use-step-state.ts`/`use-step-navigation.ts`/`use-step-persistence.ts`
  удалены из пакета** — та же логика (framework-free, продублирована почти дословно при
  портировании 0.16.0) теперь в `@letar/forms-react` (0.2.1), импортируется оттуда.
  `useStepPersistence` получил параметр `storagePrefix` — `FormStepsRoot` передаёт
  `'form-steps-shadcn:'` явно вместо захардкоженной константы в самом хуке (поведение для
  потребителей не изменилось, ключи localStorage те же). Публичный API `FormSteps` без
  изменений.

## [0.16.0] - 2026-08-10

### Added

- `FormSteps` — мультистеп compound-компонент форм-уровня (beta), третий из приоритетного списка
  координатора (Signature → FileUpload → **Steps** → Table → RichText). Не `createField()`-поле —
  та же категория, что `Form.Steps` у Chakra-версии: `FormSteps`, `FormSteps.Step`,
  `FormSteps.Indicator`, `FormSteps.Navigation`, `FormSteps.CompletedContent`. Работает поверх
  `useDeclarativeForm()` из `@letar/forms-react` напрямую — не требует `createForm()`/`Form`
  (у `forms-shadcn` его пока нет, backlog). Навигация/валидация/localStorage-персистенция
  портированы из Chakra-версии без изменений — framework-free логика (`use-step-state.ts`,
  `use-step-navigation.ts`, `use-step-persistence.ts`). UI (индикатор, кнопки) — нативная разметка
  вместо Chakra `Steps.Root`/`Button`. Beta: без интеграции с `Form.When` (условное скрытие полей
  от валидации), без `segment` (авто-обёртка `Form.Group` — модуля `FormGroupDeclarative` в
  `forms-react` нет) и без анимаций перехода (`framer-motion` не добавлен как зависимость).

## [0.15.0] - 2026-08-10

### Added

- `FieldFileUpload` — 34-е поле. Значение — `File[]`. Три варианта отображения (`button`,
  `dropzone`, `input`), portировано с Chakra-версии. Beta: без Radix/Ark UI `FileUpload.Root`
  (нет такого примитива в UIKit-контракте) — скрытый нативный `<input type="file">` + drag&drop
  через `onDragOver`/`onDrop` на `variant="dropzone"`; превью изображений через
  `URL.createObjectURL` вместо `FileUpload.ItemPreviewImage`. Security-проверка
  (`processFileWithSecurity` из `@letar/forms-core/security`) портирована как есть —
  framework-free утилита, общая с Chakra-скином. Не входит в UIKit-контракт — тот же принцип,
  что у `Signature`/`Rating`/`Tags`.

## [0.14.0] - 2026-08-10

### Added

- `FieldSignature` — 33-е поле. Canvas-рисование мышью/пальцем + typed mode (текстовый ввод
  курсивом), переключатель режимов — две обычные кнопки (не Radix-примитив). Значение — data URI
  (`image/png` или `image/svg+xml` base64). Логика геометрии штрихов и SVG-сборки портирована из
  Chakra-версии как есть (`escapeXml`/`buildSvgString`/`buildTypedSvgString`), заменена только
  UI-обвязка. Не входит в UIKit-контракт (нет примитива для canvas) — тот же принцип, что у
  `Rating`/`Tags`/`ColorPicker`. Протечек границы `forms-core`/`forms-react` не найдено.

## [0.13.2] - 2026-08-10

### Fixed

- **`FieldAddress`/`FieldCity`: убран React-warning «Cannot update a component while rendering a
  different component» на непустых `defaultValues`.** Инициализация `inputValue` из значения поля
  (сценарий редактирования существующей записи) вызывала `setInputValue()` синхронно в теле
  `render()`, которое исполняется внутри рендера `<form.Field>` — чужого компонента. Перенесена в
  `useEffect` на верхнем уровне `useFieldState`, куда теперь прокидывается `form`/`fullPath` через
  новый параметр `@letar/forms-react`'s `useFieldState` (см. CHANGELOG `@letar/forms-react`
  0.2.0). Значение поля читается реактивно через `useStore(form.store, () =>
  form.getFieldValue(fullPath))`. Поведение полей не изменилось — только устранён консольный
  warning, тесты не менялись.

## [0.13.1] - 2026-08-10

### Changed

- Дедупликация кода, накопившегося за серию из 15 новых полей — без изменения поведения:
  - `useAddressProvider`/`useCityProvider` (идентичная логика резолва `AddressProvider`:
    проп → контекст формы → token-фолбэк) → общий `useResolvedAddressProvider` в
    `lib/utils/use-address-provider.ts`, используется `FieldAddress` и `FieldCity`.
  - `DATE_INPUT_CLASS`/`DATETIME_INPUT_CLASS` (буквально та же строка tailwind-классов, что у
    `shadcnUIKit.Input`) → общий `NATIVE_INPUT_CLASS` в
    `lib/uikit/primitives/native-input-class.ts`, используется `Input`, `FieldDateRange`,
    `FieldDateTimePicker`.
  - `cardClass` (идентичная реализация border+ring/opacity) → общий `lib/utils/card-class.ts`,
    используется `FieldRadioCard` и `FieldCheckboxCard`.

## [0.13.0] - 2026-08-10

### Added

- `FieldOTPInput` — 30-е поле. Переиспользует `shadcnUIKit.PinInput` (тот же примитив, что
  `FieldPinInput`) + таймер повторной отправки. Beta: только числовой ввод
  (`type="alphanumeric"` из Chakra-версии не поддержан).
- `FieldEditable` — 31-е поле. Клик по превью переключает в режим редактирования. Beta: без
  `showControls` (Edit/Cancel/Submit-кнопок), только режимы активации `click`/`none`.
- `FieldColorPicker` — 32-е поле. Нативный `<input type="color">` + hex-инпут + свотчи, вместо
  полного Ark UI `ColorPicker.Root` с областью насыщенности и hue/alpha-слайдерами.

## [0.12.0] - 2026-08-10

### Added

- `FieldCity` — 29-е поле. Тот же `AddressProvider`/`shadcnUIKit.Combobox`-паттерн, что и
  `FieldAddress`, значение — простая строка (имя города), `bounds` ограничивает подсказки
  уровнем city/settlement.

### Known limitations

- `FieldCity`: значение обновляется только через выбор подсказки или полное стирание текста —
  без сохранения набранного вручную текста на `blur` (Chakra-версия это умеет,
  `UIKitComboboxProps` не даёт колбэк `onBlur`).

### Added

- `FieldRadioCard` — 27-е поле. Одиночный выбор карточками (label/description/icon), без
  нового Radix-примитива — кнопки с `role="radio"` в `role="radiogroup"`. Beta: без
  `keyboardNavigation` (циклическая навигация стрелками).
- `FieldCheckboxCard` — 28-е поле. Множественный выбор карточками, тот же визуальный подход,
  `role="checkbox"`/`aria-checked`, значение — массив.

### Added

- `FieldAutocomplete` — 25-е поле. Упрощённая версия `FieldCombobox`, которая всегда принимает
  произвольный текст (`allowCustomValue`), не только значение из списка. Beta: только статичные
  `suggestions`, без `useQuery` (тот же статус, что у `FieldCombobox`).
- `FieldListbox` — 26-е поле. Все опции видны сразу (не выпадающий список) — ряд кнопок с
  `aria-selected`, одиночный или множественный выбор. Группировка через `groupOptions`
  (`@letar/forms-core/uikit`, framework-free).

## [0.9.0] - 2026-08-10

### Added

- `FieldPhone` — 22-е поле. Тот же чистый JS-форматтер маски, что у Chakra-версии
  (`@letar/forms-core/phone`, WebKit-safe с v1.4.4). Флаг страны (`showFlag`) — соседний `<span>`,
  не «приклеенный» бордер (в UIKit-контракте нет примитива для составных инпутов).
- `FieldCurrency` — 23-е поле. `NumberInput` + символ валюты рядом (через
  `Intl.NumberFormat().formatToParts`). Beta-упрощение: без живого форматирования значения
  внутри инпута при вводе.
- `FieldPercentage` — 24-е поле. `NumberInput` + `%` рядом, значение хранится как есть
  (50 = 50%). Тот же beta-принцип, что у `FieldCurrency`.

## [0.8.0] - 2026-08-10

### Added

- `FieldDuration` — 20-е поле. Значение — число минут, формат `HH:MM` (два `NumberInput`) или
  `minutes` (один `NumberInput`), с клампом по `min`/`max`. Полностью на UIKit-контракте — без
  обходов.
- `FieldDateTimePicker` — 21-е поле. Значение — строка ISO (`YYYY-MM-DDTHH:MM:00`), два нативных
  инпута (`type="date"` + `type="time"`) рядом — тот же обход `UIKitInputProps` без `min`/`max`/
  `step`, что у `FieldDateRange`.

## [0.7.0] - 2026-08-10

### Added

- `FieldDateRange` — 19-е поле. Два синхронизированных `<input type="date">` (max начала =
  значение конца и наоборот) + опциональные пресеты (сегодня/вчера/эта-прошлая неделя/этот-прошлый
  месяц/этот год). Beta-упрощение: пресеты — ряд кнопок, а не выпадающее меню
  (`@radix-ui/react-dropdown-menu` не установлена, не нужна ради 7 текстовых пунктов).

## [0.6.0] - 2026-08-10

### Added

- `FieldAddress` — 18-е поле, начало продолжения к паритету с `@letar/forms` (Chakra-скин).
  Переиспользует `shadcnUIKit.Combobox` (Popover + input, тот же примитив, что `FieldCombobox`) с
  async-подгрузкой подсказок из `AddressProvider` (`@letar/forms-core/address`, DaData встроен).
  Beta-упрощения: нет клавиатурной навигации стрелками по списку подсказок (Combobox-примитив
  UIKit её не поддерживает — только клик и Enter/Escape самого Popover) и нет визуального
  спиннера внутри инпута.

### Fixed

- Унаследованный `@nx/enforce-module-boundaries` в `vitest.config.ts` — импорт
  `buildFormsCoreAlias` шёл относительным путём через границу пакета. Общий фикс для
  `forms`/`forms-react`/`forms-shadcn`, новый subpath `@letar/forms-core/testing`.

## [0.5.1] - 2026-08-10

### Added

- Полный цикл документации beta-состояния: этот `CHANGELOG.md`.

## [0.5.0] - 2026-08-09

### Changed

- **`uikit-shadcn.tsx` разбит на отдельные примитивы.** Реализация `UIKit`-контракта
  (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select` + extended-набор) вынесена
  из одного файла в отдельные модули по примитиву — тот же принцип организации, что у
  Chakra-скина (`libs/forms/src/lib/declarative/form-fields/base/`). Публичный API не изменился.

## [0.4.2] - 2026-08-09

### Docs

- Зафиксирован триггер выноса shadcn CSS-переменных в отдельный файл: как только появится второй
  потребитель пакета (Vue-пруф Фазы 7.8, showcase-приложение), набор переменных из
  `apps/form-develop-app-shadcn/src/app/globals.css` переедет в библиотеку как
  `@letar/forms-shadcn/styles.css`.

## [0.4.1] - 2026-08-09

### Added

- `FieldHidden`, `FieldRating`, `FieldTags` — 17-е, 16-е и 15-е поле, план Шага 5 (15–20 полей)
  перевыполнен.

## [0.4.0] - 2026-08-09

### Added

- `FieldPinInput` — посимвольный ввод PIN/OTP с автопереходом между ячейками (без вставки кода
  из буфера одним действием — известное упрощение beta).

## [0.3.0] - 2026-08-09

### Added

- `FieldNativeSelect`, `FieldSwitch`, `FieldSlider`, `FieldPassword`, `FieldCombobox` (beta —
  только статичные `options`, без `useQuery`/группировки).

## [0.2.0] - 2026-08-09

### Added

- `FieldTextarea`, `FieldNumber`, `FieldRadioGroup`, `FieldSegmentGroup`, `FieldDate`.

### Changed

- Тестовый харнесс (`TestForm`) вынесен в `@letar/forms-react/testing` — переиспользуется обоими
  скинами (Chakra и shadcn) вместо дублирования в каждом пакете.

## [0.1.0] - 2026-08-09

### Added

- Каркас `@letar/forms-shadcn` (Фаза 7.3, Шаг 5): `shadcnUIKit` на прямых Radix-примитивах +
  `cva`/`tailwind-merge` (не `shadcn` CLI), первые три поля — `FieldString`, `FieldCheckbox`,
  `FieldSelect`.
- Композиционный слой (`createField`, `FieldWrapper`, `FieldErrorBoundary`) переиспользован из
  `@letar/forms-react` без изменений — вторая реализация `UIKit`-контракта не потребовала правок
  ни в `forms-core`, ни в `forms-react`. Это и есть верификация архитектуры Фазы 7.1.
