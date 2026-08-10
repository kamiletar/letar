# Changelog

Все значимые изменения в библиотеке @letar/forms-shadcn документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

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
