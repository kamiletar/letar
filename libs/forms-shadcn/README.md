# @letar/forms-shadcn

shadcn/ui-скин `@letar/forms` — beta, реализация `UIKit`-контракта из `@letar/forms-core` на
прямых Radix-примитивах + `cva`/`tailwind-merge` (не `shadcn` CLI — обоснование в
[libs/forms/PLAN.md](../forms/PLAN.md), Фаза 7.3, Шаг 5).

Композиционный слой (`createField`, `FieldWrapper`, `FieldErrorBoundary`) не отличается от
Chakra-скина — оба используют `createFieldPrimitives` из `@letar/forms-react`, каждый со своей
реализацией `UIKit`. Ни `forms-core`, ни `forms-react` не потребовалось менять при подключении
второй реализации — это и есть проверка архитектуры Фазы 7.1/7.3.

## Требования потребителя

Tailwind 4 в приложении (сканирование контента через `@source`) — скин не самодостаточен без
него. Для приложений монорепо (все на Chakra) это не актуально: пакет предназначен для внешней
OSS-аудитории.

## Установка

Библиотека уже включена в монорепозиторий.

```tsx
import {
  FieldCheckbox,
  FieldCombobox,
  FieldDate,
  FieldNativeSelect,
  FieldNumber,
  FieldPassword,
  FieldPinInput,
  FieldRadioGroup,
  FieldSegmentGroup,
  FieldSelect,
  FieldSlider,
  FieldString,
  FieldSwitch,
  FieldTextarea,
} from '@letar/forms-shadcn'
```

## Поля (beta — 14 из 15–20 запланированных)

| Поле                | Radix-примитив                     |
| ------------------- | ---------------------------------- |
| `FieldString`       | нативный `<input>`                 |
| `FieldCheckbox`     | `@radix-ui/react-checkbox`         |
| `FieldSelect`       | `@radix-ui/react-select`           |
| `FieldTextarea`     | нативный `<textarea>`              |
| `FieldNumber`       | нативный `<input type="number">`   |
| `FieldRadioGroup`   | `@radix-ui/react-radio-group`      |
| `FieldSegmentGroup` | `@radix-ui/react-toggle-group`     |
| `FieldDate`         | нативный `<input type="date">`     |
| `FieldNativeSelect` | нативный `<select>`                |
| `FieldSwitch`       | `@radix-ui/react-switch`           |
| `FieldSlider`       | `@radix-ui/react-slider`           |
| `FieldPassword`     | нативный `<input>` + toggle-кнопка |
| `FieldCombobox`     | `@radix-ui/react-popover` (beta)   |
| `FieldPinInput`     | нативные `<input maxLength=1>`     |

`FieldCombobox` — упрощённая beta-версия: только статичные `options`, фильтрация по вхождению
подстроки в `label`. Без `useQuery` (async-поиск) и группировки — Chakra-версия их поддерживает,
здесь не портировано. `FieldPinInput` — без вставки кода из буфера одним действием, только
посимвольный ввод с автопереходом.

Остальные ходовые поля (RichText, FileUpload, Address и т.д.) — по мере миграции, каждое почти
бесплатно благодаря готовому `UIKit`-контракту.

## `shadcnUIKit`

Реализует `UIKitCorePrimitives` (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`)

- `ErrorFallback`/`NumberInput`/`RadioGroup`/`SegmentGroup`/`NativeSelect`/`Combobox`/`PinInput`
  из extended-набора. Остальные extended-примитивы (`Button`, `Tooltip` и т.д.) появятся по мере
  миграции полей, которым они нужны.
- `Textarea`, дата-инпут, `Switch`, `Slider` намеренно НЕ вошли в UIKit-примитив — этих
  примитивов нет и в самом контракте `forms-core` (`UIKitExtendedPrimitives`), тот же паттерн,
  что у Chakra-скина: поле рисует свою разметку напрямую внутри skin-agnostic `FieldWrapper`, а
  не через `UIKit`.

## Известные упрощения beta

- Tooltip у `FieldLabel` — нативный `title`, не полноценный Radix Tooltip с попапом (пакет уже
  установлен, доведём при миграции полей, где это важнее).
- Нет группировки опций в `Select` (`groupOptions` из `forms-core/uikit` не подключена) — не
  нужна для 2 демо-опций, подключим вместе с полем, которому это действительно требуется.
- `FieldCombobox` — только статичные опции, без async-поиска (`useQuery`) и группировки.
- `FieldPinInput` — без вставки кода из буфера одним действием на первую ячейку.

## Команды

```bash
nx test forms-shadcn
nx lint forms-shadcn
nx typecheck:tsgo forms-shadcn
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-shadcn` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-shadcn` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
