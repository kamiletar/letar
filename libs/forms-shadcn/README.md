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

## CSS-переменные для потребителей

`shadcnUIKit` рассчитан на набор CSS-переменных shadcn/ui (`--background`, `--foreground`,
`--border`, `--input`, `--ring`, `--primary`, `--secondary`, `--muted`, `--accent`,
`--destructive`, `--popover`, `--card` и их `-foreground`-пары, light/dark через `oklch`) —
пакет их не определяет сам, только потребляет через `@theme inline`. Референс-реализация —
[`apps/form-develop-app-shadcn/src/app/globals.css`](../../apps/form-develop-app-shadcn/src/app/globals.css),
единственный текущий потребитель (Шаг 5 Фазы 7.3, [PLAN.md](../forms/PLAN.md)).

⚠️ **Пока потребитель один — CSS не выносится в библиотеку** (это была бы преждевременная
абстракция без второго примера использования). Как только появится второй потребитель (Vue-пруф
Фазы 7.8, showcase-приложение для shadcn-скина и т.п.) — вынести этот набор переменных как
готовый файл для подключения, например экспортируемый как `@letar/forms-shadcn/styles.css` через
`exports` в `package.json`. Chakra-версии (`@letar/forms`) этот шаг не нужен — там тема часть
Chakra-провайдера, а не отдельный статический CSS.

## Установка

Библиотека уже включена в монорепозиторий.

```tsx
import {
  FieldAddress,
  FieldAutocomplete,
  FieldCheckbox,
  FieldCheckboxCard,
  FieldCity,
  FieldColorPicker,
  FieldCombobox,
  FieldCurrency,
  FieldDate,
  FieldDateRange,
  FieldDateTimePicker,
  FieldDuration,
  FieldEditable,
  FieldFileUpload,
  FieldHidden,
  FieldListbox,
  FieldNativeSelect,
  FieldNumber,
  FieldNumberInput,
  FieldOTPInput,
  FieldPassword,
  FieldPasswordStrength,
  FieldPercentage,
  FieldPhone,
  FieldPinInput,
  FieldRadioCard,
  FieldRadioGroup,
  FieldRating,
  FieldSegmentGroup,
  FieldSelect,
  FieldSlider,
  FieldString,
  FieldSwitch,
  FieldTags,
  FieldTextarea,
  FieldTime,
  FieldYesNo,
} from '@letar/forms-shadcn'
```

## Поля (beta — 40 из 56, продолжаем к паритету с `@letar/forms`)

Плюс `FormSteps` и `FieldTableEditor` — compound-компоненты форм-уровня, не `createField()`-поля
(см. разделы ниже).

| Поле                    | Radix-примитив                                |
| ----------------------- | --------------------------------------------- |
| `FieldString`           | нативный `<input>`                            |
| `FieldCheckbox`         | `@radix-ui/react-checkbox`                    |
| `FieldSelect`           | `@radix-ui/react-select`                      |
| `FieldTextarea`         | нативный `<textarea>`                         |
| `FieldNumber`           | нативный `<input type="number">`              |
| `FieldNumberInput`      | нативный `<input type="number">` + степпер    |
| `FieldRadioGroup`       | `@radix-ui/react-radio-group`                 |
| `FieldSegmentGroup`     | `@radix-ui/react-toggle-group`                |
| `FieldDate`             | нативный `<input type="date">`                |
| `FieldNativeSelect`     | нативный `<select>`                           |
| `FieldSwitch`           | `@radix-ui/react-switch`                      |
| `FieldSlider`           | `@radix-ui/react-slider`                      |
| `FieldPassword`         | нативный `<input>` + toggle-кнопка            |
| `FieldPasswordStrength` | `<input>` + прогресс-бар + чеклист требований |
| `FieldCombobox`         | `@radix-ui/react-popover` (beta)              |
| `FieldPinInput`         | нативные `<input maxLength=1>`                |
| `FieldHidden`           | без DOM (синхронизация значения)              |
| `FieldRating`           | звёзды-кнопки (`lucide-react`)                |
| `FieldTags`             | нативный `<input>` + чипы                     |
| `FieldAddress`          | `@radix-ui/react-popover` (beta)              |
| `FieldDateRange`        | два нативных `<input type="date">`            |
| `FieldDuration`         | `NumberInput` ×1 или ×2 (HH:MM)               |
| `FieldDateTimePicker`   | `<input type="date">` + `<input type="time">` |
| `FieldPhone`            | нативный `<input type="tel">` + маска         |
| `FieldCurrency`         | `NumberInput` + символ валюты рядом           |
| `FieldPercentage`       | `NumberInput` + `%` рядом                     |
| `FieldAutocomplete`     | `@radix-ui/react-popover` (beta)              |
| `FieldListbox`          | обычные кнопки, без Radix                     |
| `FieldRadioCard`        | обычные кнопки, без Radix                     |
| `FieldCheckboxCard`     | обычные кнопки, без Radix                     |
| `FieldCity`             | `@radix-ui/react-popover` (beta)              |
| `FieldOTPInput`         | нативные `<input>` (числовой)                 |
| `FieldEditable`         | нативный `<input>`/`<textarea>`               |
| `FieldColorPicker`      | нативный `<input type="color">` (beta)        |
| `FieldSignature`        | `<canvas>` + typed mode (без Radix)           |
| `FieldFileUpload`       | нативный `<input type="file">` (без Radix)    |
| `FieldTableEditor`      | native `<table>` (без Radix, compound)        |
| `FieldRichText`         | Tiptap, native `<button>`-тулбар (без Radix)  |
| `FieldYesNo`            | обычные кнопки, без Radix                     |
| `FieldTime`             | нативный `<input type="time">`                |

`FieldCombobox` — упрощённая beta-версия: только статичные `options`, фильтрация по вхождению
подстроки в `label`. Без `useQuery` (async-поиск) и группировки — Chakra-версия их поддерживает,
здесь не портировано. `FieldPinInput` — без вставки кода из буфера одним действием, только
посимвольный ввод с автопереходом. `FieldTags` — только Enter добавляет тег, без вставки со
множественным разделителем. `FieldAddress` — переиспользует тот же Popover-примитив, что
`FieldCombobox`, с async-подгрузкой из `AddressProvider` (`@letar/forms-core/address`); без
клавиатурной навигации стрелками по списку и без визуального спиннера в инпуте. `FieldDateRange`
— пресеты рядом кнопок вместо выпадающего меню (нет `@radix-ui/react-dropdown-menu` в
peer-зависимостях, не нужна ради 7 текстовых пунктов). `FieldCurrency`/`FieldPercentage` — без
живого Intl-форматирования значения внутри инпута при вводе, символ рядом с полем.
`FieldAutocomplete` — переиспользует тот же Combobox-примитив, но всегда принимает произвольный
текст (`allowCustomValue`); только статичные `suggestions`, без `useQuery`. `FieldListbox` — все
опции видны сразу, ряд кнопок с `aria-selected` вместо выпадающего списка. `FieldRadioCard`/
`FieldCheckboxCard` — карточки (label/description/icon) вместо мелких кружков/квадратов,
`role="radio"`/`role="checkbox"` на обычных кнопках; без `keyboardNavigation` (циклическая
навигация стрелками у `FieldRadioCard`). `FieldCity` — тот же `AddressProvider`/Popover-паттерн,
что `FieldAddress`, значение — простая строка; без сохранения набранного вручную текста на
`blur` (`UIKitComboboxProps` не даёт колбэк `onBlur`). `FieldOTPInput` — переиспользует
`shadcnUIKit.PinInput`, только числовой ввод (`type="alphanumeric"` не поддержан). `FieldEditable`
— без `showControls` (Edit/Cancel/Submit-кнопок), только режимы активации `click`/`none`.
`FieldColorPicker` — системный color picker браузера вместо полного Ark UI `ColorPicker.Root`.
`FieldSignature` — canvas-рисование + typed mode, переключатель режимов — обычные кнопки (не
Radix), логика геометрии штрихов/SVG-сборки портирована из Chakra-версии как есть.
`FieldFileUpload` — три варианта (`button`/`dropzone`/`input`), скрытый нативный
`<input type="file">` + `onDragOver`/`onDrop` на дропзоне вместо Radix/Ark UI `FileUpload.Root`
(нет такого примитива в контракте); превью изображений — `URL.createObjectURL`, не
`FileUpload.ItemPreviewImage`. Security-проверка (`processFileWithSecurity`) — общая
framework-free утилита с Chakra-версией, без изменений.

`FieldRichText` — Tiptap-редактор (`StarterKit`+`Underline`+`Link`+`Placeholder`), портирован из
Chakra-версии без изменений домена (extensions, `onUpdate`, синхронизация `value`); без
`imageUpload`/`ImagePopover` (загрузка изображений на сервер не портирована) и без Popover-формы
для ссылки (`window.prompt`) — см. отдельный раздел ниже.

`FieldTime` — нативный `<input type="time">` в обход `UIKitInputProps` (не пропускает
`min`/`max`/`step`), тот же приём `NATIVE_INPUT_CLASS`, что у `FieldDateRange`.

`FieldYesNo` — два кликабельных блока (`role="radio"` в `role="radiogroup"`), тот же подход, что
`FieldRadioCard`/`FieldListbox`; портирован из Chakra-версии без изменений логики, значение —
`boolean`. `variant="thumbs"`/`"emoji"` добавляют эмодзи-иконки поверх текста кнопок.

`FieldNumberInput` — тот же `shadcnUIKit.NumberInput`, что у `FieldNumber`, плюс видимые
степпер-кнопки (increment/decrement, `lucide-react` иконки), поверх инпута абсолютным
позиционированием. Beta: без `formatOptions` (Intl-форматирование внутри инпута),
`allowMouseWheel`, `clampValueOnBlur` — клампинг min/max только при клике по степперу.

`FieldPasswordStrength` — портирован из Chakra-версии без изменений логики расчёта силы пароля
(доля выполненных требований × 100, требования: `minLength:8`/`uppercase`/`lowercase`/`number`/
`special`). Полоса прогресса — свой `<div>` с шириной в процентах, не Chakra `Progress.Root`
(нет такого примитива в UIKit-контракте).

Остальные ходовые поля — по мере миграции, каждое почти бесплатно благодаря готовому
`UIKit`-контракту. Приоритетный список координатора (Signature → FileUpload → Steps → Table →
RichText) закрыт полностью.

## `FormSteps` — мультистеп (beta, не Field)

```tsx
import { FieldString, FormSteps } from '@letar/forms-shadcn'
<FormSteps>
  <FormSteps.Indicator showDescriptions />
  <FormSteps.Step title="Личное" description="Как к вам обращаться">
    <FieldString name="firstName" label="Имя" required />
  </FormSteps.Step>
  <FormSteps.Step title="Контакты">
    <FieldString name="email" label="Email" />
  </FormSteps.Step>
  <FormSteps.CompletedContent>Готово!</FormSteps.CompletedContent>
  <FormSteps.Navigation />
</FormSteps>
```

`FormSteps` — не `createField()`-поле, а compound-компонент форм-уровня (та же категория, что
`Form.Steps` у Chakra-версии): работает поверх `useDeclarativeForm()` из `@letar/forms-react`
напрямую, не требует `createForm()`/`Form` (у `forms-shadcn` его пока нет — backlog). Навигация,
валидация текущего шага и localStorage-персистенция (`stepPersistence`) портированы из
Chakra-версии без изменений — framework-free логика. UI (индикатор с прогрессом, кнопки
Назад/Далее/Отправить) — нативная разметка вместо Chakra `Steps.Root`.

**Beta-упрощения:** без интеграции с `Form.When` (условное скрытие полей от валидации на шаге —
в Chakra-версии это `hiddenFields`), без пропа `segment` (авто-обёртка `Form.Group` — модуля
`FormGroupDeclarative` в `@letar/forms-react` ещё нет) и без анимаций перехода между шагами
(`framer-motion` не добавлен как peer-зависимость — не оправдана для первого прохода).

## `FieldTableEditor` — инлайн-таблица (beta, не `createField()`-поле)

```tsx
import { FieldTableEditor } from '@letar/forms-shadcn'

<FieldTableEditor
  name="items"
  label="Позиции заказа"
  sortable
  selectable
  columns={[
    { name: 'product', label: 'Товар', width: '50%' },
    { name: 'qty', label: 'Кол-во', width: '15%', align: 'right' },
    { name: 'price', label: 'Цена', width: '15%', align: 'right' },
    {
      name: 'total',
      label: 'Итого',
      computed: (row) => (Number(row.qty) || 0) * (Number(row.price) || 0),
      format: (v) => `${Number(v).toLocaleString('ru-RU')} ₽`,
    },
  ]}
  addLabel="Добавить позицию"
  footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]}
/>
```

`FieldTableEditor` — не `createField()`-поле, а compound-компонент, компонующий
`form.Field(mode="array")` напрямую (та же категория, что `Form.Field.TableEditor` у
Chakra-версии). Инлайн-редактируемая таблица для array-полей: каждая ячейка — отдельный
`form.Field`, per-cell Zod-валидация автоматическая. Портирована из `@letar/forms` без изменений
в логике — `use-table-columns`/`use-table-navigation` и утилиты `@letar/forms-core/table`/
`@letar/forms-core/schema` framework-free, общие с Chakra-скином; отличается только разметка
(native `<table>` + Tailwind вместо Chakra `Table.Root`).

Поддерживает: авто-колонки из Zod schema (или кастомные `columns` с `computed`/`format`),
footer-агрегаты (`sum`/`avg`/`count`/`min`/`max`), copy-paste из Excel/Sheets (TSV через
`onPaste`), keyboard-навигацию (Tab/Shift+Tab/Enter/Escape/стрелки между ячейками),
чекбокс-выбор строк с bulk-delete, мобильный вид карточками (ниже брейкпоинта `md`),
`minRows`/`maxRows` (override `.min()`/`.max()` схемы).

**Beta-упрощение:** `sortable` — нативный HTML5 drag&drop (`draggable` на `<tr>` +
`onDragStart`/`onDragOver`/`onDrop`), не `@dnd-kit/sortable` — тот же принцип, что у `FormSteps`
без `framer-motion`: не тянуть новый peer-зависимость ради одной фичи в первом проходе.
Функционально эквивалентно (перетаскивание строк работает и вызывает `moveRow`), но без
keyboard-DnD и анимации перестроения списка при перетаскивании.

## `FieldRichText` — WYSIWYG-редактор (beta)

```tsx
import { FieldRichText } from '@letar/forms-shadcn'

<FieldRichText
  name="content"
  label="Содержимое"
  minHeight="200px"
  toolbarButtons={['bold', 'italic', 'underline', 'link', 'bulletList', 'orderedList']}
/>
```

Tiptap-редактор (`StarterKit` + `Underline` + `Link` + `Placeholder`), портирован из
`@letar/forms` без изменений домена: те же extensions, `onUpdate` → `field.handleChange`
(`outputFormat: 'html'` — по умолчанию, или `'json'` для `editor.getJSON()`), синхронизация
`value` при внешнем изменении без прыжка курсора (`setContent(..., { emitUpdate: false })` только
если контент реально отличается). Отличается только обвязка — native `<button>`-тулбар вместо
Chakra `IconButton`/`HStack`, Tailwind arbitrary-selector'ы (`[&_.tiptap_h1]:...`) вместо
Chakra `css`-пропа для стилизации заголовков/списков/цитат/кода/ссылок внутри редактора, и
`content-[attr(data-placeholder)]` вместо `_before`-стиля для placeholder.

**Beta-упрощения:**

- без `imageUpload`/`ImagePopover` — вставка изображений с загрузкой на сервер (Chakra-версия
  принимает `imageUpload: { endpoint, category?, maxSize?, acceptTypes? }`) не портирована:
  требует app-specific upload endpoint, не framework-free логика для первого прохода;
- кнопка `link` — `window.prompt('URL ссылки')` вместо Popover-формы с полем ввода и кнопкой
  «удалить ссылку» (Chakra `LinkPopover`). Тот же фолбэк уже существовал в Chakra
  `TOOLBAR_CONFIG.link.action` как запасной вариант без отдельного Popover-компонента — здесь он
  стал основным путём, не запасным.

## `shadcnUIKit`

Реализует `UIKitCorePrimitives` (`FieldRoot`/`FieldLabel`/`FieldError`/`Input`/`Checkbox`/`Select`)

- `ErrorFallback`/`NumberInput`/`RadioGroup`/`SegmentGroup`/`NativeSelect`/`Combobox`/`PinInput`
  из extended-набора. Остальные extended-примитивы (`Button`, `Tooltip` и т.д.) появятся по мере
  миграции полей, которым они нужны.
- `Textarea`, дата-инпут, `Switch`, `Slider`, `Rating`, `Tags` намеренно НЕ вошли в UIKit-примитив
  — этих примитивов нет и в самом контракте `forms-core` (`UIKitExtendedPrimitives`), тот же
  паттерн, что у Chakra-скина: поле рисует свою разметку напрямую внутри skin-agnostic
  `FieldWrapper`, а не через `UIKit`.

## Известные упрощения beta

- Tooltip у `FieldLabel` — нативный `title`, не полноценный Radix Tooltip с попапом (пакет уже
  установлен, доведём при миграции полей, где это важнее).
- Нет группировки опций в `Select` (`groupOptions` из `forms-core/uikit` не подключена) — не
  нужна для 2 демо-опций, подключим вместе с полем, которому это действительно требуется.
- `FieldCombobox` — только статичные опции, без async-поиска (`useQuery`) и группировки.
- `FieldPinInput` — без вставки кода из буфера одним действием на первую ячейку.
- `FieldTags` — только Enter добавляет тег, без кастомного `delimiter`/`addOnPaste`.

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
