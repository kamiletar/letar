# Changelog

Все значимые изменения в библиотеке @letar/forms-shadcn документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

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
