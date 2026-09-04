# PLAN.md — Form Develop App

План разработки и примеры для проработки концепции переиспользуемых форм.

---

## Цель

Создать примеры желаемого API использования форм, чтобы:

1. Определить идеальный DX (Developer Experience)
2. Спроектировать необходимые компоненты для `@letar/forms`
3. Протестировать решения в реальном Next.js окружении

---

## Реализованный API

### Базовое использование

```tsx
import { Form } from '@letar/forms'
<Form initialValue={{ title: '', count: 0 }} onSubmit={handleSubmit}>
  <Form.Field.String name="title" label="Title" />
  <Form.Field.Number name="count" label="Count" />
  <Form.Button.Submit>Save</Form.Button.Submit>
</Form>
```

### Вложенные группы

```tsx
<Form.Group name="info">
  <Form.Group name="base">
    <Form.Field.Number name="rating" />
  </Form.Group>
</Form.Group>
```

### Массивы объектов

```tsx
<Form.Group.List name="components">
  <Form.Field.String name="title" />
  <Form.Field.Number name="weightGrams" />
</Form.Group.List>
```

### Примитивные массивы

```tsx
<Form.Group.List name="tags">
  <Form.Field.String /> {/* без name */}
</Form.Group.List>
```

### Расширяемость (app-specific поля)

```tsx
import { createForm } from '@letar/forms'

export const AppForm = createForm({
  extraSelects: { Type: SelectType }
})

// Использование
<AppForm.Select.Type name="type" />
```

### Zod валидация

```tsx
import { z } from 'zod/v4'

const Schema = z.object({
  title: z.string().min(2, 'Минимум 2 символа'),
  rating: z.number().min(0).max(10),
})

<Form initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  <Form.Field.String name="title" />
  <Form.Field.Number name="rating" />
</Form>
// Ошибки валидации автоматически отображаются под полями
```

---

## Структура файлов (реализовано)

```
libs/forms/src/lib/declarative/
├── index.ts                    # Реэкспорт API
├── types.ts                    # Типы
├── form-context.tsx            # DeclarativeFormContext
├── form-root.tsx               # <Form> корневой компонент
├── form-persistence.tsx        # localStorage Persistence
├── form-group-declarative.tsx  # Form.Group
├── form-group-list-declarative.tsx  # Form.Group.List
├── form-group-list-sortable.tsx    # DnD: SortableWrapper, SortableItem, DragHandle
├── form-when.tsx               # Form.When (conditional rendering)
├── dirty-guard.tsx             # Form.DirtyGuard
├── create-form.tsx             # Фабрика createForm()
├── form-fields/
│   ├── index.ts
│   ├── base-field.tsx          # useDeclarativeField hook
│   ├── field-string.tsx        # Form.Field.String
│   ├── field-number.tsx        # Form.Field.Number
│   ├── field-textarea.tsx      # Form.Field.Textarea
│   ├── field-password.tsx      # Form.Field.Password
│   ├── field-pin-input.tsx     # Form.Field.PinInput
│   ├── field-slider.tsx        # Form.Field.Slider
│   ├── field-date.tsx          # Form.Field.Date
│   ├── field-time.tsx          # Form.Field.Time
│   ├── field-checkbox.tsx      # Form.Field.Checkbox
│   ├── field-switch.tsx        # Form.Field.Switch
│   ├── field-select.tsx        # Form.Field.Select (Chakra Select)
│   ├── field-native-select.tsx # Form.Field.NativeSelect
│   ├── field-radio-group.tsx   # Form.Field.RadioGroup
│   ├── field-combobox.tsx      # Form.Field.Combobox
│   ├── field-listbox.tsx       # Form.Field.Listbox
│   ├── field-checkbox-card.tsx # Form.Field.CheckboxCard
│   ├── field-radio-card.tsx    # Form.Field.RadioCard
│   ├── field-rating.tsx        # Form.Field.Rating
│   ├── field-segmented-group.tsx   # Form.Field.SegmentedGroup
│   ├── field-color-picker.tsx  # Form.Field.ColorPicker
│   ├── field-editable.tsx      # Form.Field.Editable
│   ├── field-schedule.tsx      # Form.Field.Schedule
│   ├── field-file-upload.tsx   # Form.Field.FileUpload
│   └── field-rich-text.tsx     # Form.Field.RichText
├── form-buttons/
│   ├── index.ts
│   ├── button-submit.tsx       # Form.Button.Submit
│   └── button-reset.tsx        # Form.Button.Reset
└── form-steps/
    ├── index.ts                # Реэкспорт Form.Steps API
    ├── form-steps-context.tsx  # FormStepsContext
    ├── form-steps.tsx          # Form.Steps (root)
    ├── form-steps-step.tsx     # Form.Steps.Step
    ├── form-steps-indicator.tsx    # Form.Steps.Indicator
    ├── form-steps-navigation.tsx   # Form.Steps.Navigation
    └── form-steps-completed.tsx    # Form.Steps.CompletedContent
```

---

## CRUDL Recipes (реализовано)

Полноценный CRUD с использованием декларативного Form API:

### Страницы

| Путь            | Описание                               |
| --------------- | -------------------------------------- |
| `/recipes`      | Список рецептов с кнопками Edit/Delete |
| `/recipes/new`  | Создание нового рецепта                |
| `/recipes/[id]` | Редактирование существующего рецепта   |

### Компоненты

- `RecipeForm` — универсальная форма для create/edit режимов
- `RecipeFormFields` — переиспользуемые поля формы
- Интеграция с ZenStack hooks (`useFindManyRecipe`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`)

### Особенности

- **Form.api** — автоматическая загрузка данных для edit режима
- **transformData** — трансформация данных формы в Prisma-формат
- **ZenStack workaround** — компоненты обрабатываются отдельно (deleteMany + createMany) из-за ограничений REST API

---

## Native Attributes Demo (реализовано, Фаза 1 zenstack-form-plugin v2.4.0)

`/native-attributes-demo` — рендерит реально сгенерированный `RecipeCreateFormSchema` (не ручной
Zod), демонстрирует 4 из 11 новых нативных атрибутов (`@startsWith`+`@trim`+`@lower` на `slug`,
`@url` на `website`, `@phone` на `authorPhone`, `@date` на `publishedOn`) плюс исключение поля
через `@omit` (`internalNote`). Проверено живьём: невалидный `slug` («invalid-slug») даёт ошибку
формы `Invalid string: must start with "recipe-"` — валидация приходит из
`ZodUtils.addStringValidation`, ни строчки ручного кода. Полное решение — `libs/forms/PLAN.md`
(Фаза 0 spike + Фаза 1), `libs/zenstack-form-plugin/CHANGELOG.md` v2.4.0.

---

## Cross-Field Validation Demo (реализовано, Фаза 2 zenstack-form-plugin v2.5.0)

`/cross-field-validation-demo` — рендерит реально сгенерированный `BookingCreateFormSchema` из
модели `Booking` (`startsAt`/`endsAt` DateTime) с `@@validate(endsAt > startsAt, "Дата окончания
раньше начала", ["endsAt"])`. Проверено живьём: `endsAt` раньше `startsAt` даёт ошибку под полем
`endsAt` (не общей строкой формы — сработал `path`-аргумент), валидная пара дат отправляется
успешно. Forced-mismatch типовая проба на `tsgo` подтвердила отсутствие стирания типа через
`withNative`+`ZodUtils.addCustomValidation` (тот же приём проверки, что и у Фазы 1).

⚠️ **`@@strict()` в демо не участвует.** Живой прогон `zenstack generate` показал, что стандартная
библиотека ZModel разрешает `@@strict()` только на `type`-определениях, не на `model` — попытка
поставить его на `Booking` дала ошибку схемы ещё на этапе генерации. Кодогенерация под него в
плагине реализована и юнит-протестирована, но для `model` де-факто неприменима — см.
`libs/zenstack-form-plugin/CHANGELOG.md` v2.5.0, раздел «Investigated, not shipped».

Полное решение — `libs/forms/PLAN.md` (Фаза 2), `libs/zenstack-form-plugin/CHANGELOG.md` v2.5.0.

---

## Meta Syntax Demo (реализовано, Фаза 3 zenstack-form-plugin v3.0.0)

`/meta-syntax-demo` — модель `MetaSyntaxDemo`, демонстрирует `@meta("form.*", …)` как основной
синтаксис field-метаданных вместо comment-директив `@form.*`: `name` (`title`/`placeholder`),
`rating` (`fieldType` + плоские `form.props.count`/`form.props.allowHalf` — объектный литерал
`@meta(key, {...})` ломает `zenstack generate` целиком, `ObjectExpr` не поддержан
upstream-генератором TS-схемы), `bio` (`description`), `hidden` (`exclude`). Поле `legacyNote`
намеренно оставлено на старом `@form.title`-комментарии — единственное во всей экосистеме
`form-develop-app`/`form-example` — чтобы demo показывал живой deprecation-warning в консоли
`nx zenstack:generate`, а не описание постфактум.

`schema.zmodel` целиком мигрирован кодмодом `scripts/codemods/codemod-form-directives.mjs`:
30 директив в `Category`/`Recipe`/`RecipeInfoBase`/`Booking` конвертированы автоматически.
Побочно найден и исправлен мёртвый `Recipe.category` — позиционный `@form.relation("Category",
"name")` парсер плагина никогда не поддерживал (только объектный литерал), relation-select для
этого поля не рендерился до фикса.

Полное решение — `libs/forms/PLAN.md` (Фаза 3), `libs/zenstack-form-plugin/CHANGELOG.md` v3.0.0.

---

## E2E Тесты

### Покрытие тестами (22 файла)

| Файл                            | Описание                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `example.spec.ts`               | Навигация, заголовки страниц                                                                                                                                                             |
| `form-submit.spec.ts`           | CRUD операции с рецептами                                                                                                                                                                |
| `fields-demo.spec.ts`           | Все типы полей (String, Number, Date, Time, Password, Checkbox, Switch, RadioGroup, Select, Combobox, Listbox, RadioCard, CheckboxCard, SegmentedGroup, ColorPicker, Editable, Schedule) |
| `persistence-demo.spec.ts`      | localStorage сохранение черновиков                                                                                                                                                       |
| `pin-input-demo.spec.ts`        | PinInput компонент                                                                                                                                                                       |
| `slider-demo.spec.ts`           | Slider компонент                                                                                                                                                                         |
| `rating-demo.spec.ts`           | Rating компонент                                                                                                                                                                         |
| `file-upload-demo.spec.ts`      | FileUpload (button, dropzone, input варианты)                                                                                                                                            |
| `rich-text-demo.spec.ts`        | RichText (Tiptap) редактор                                                                                                                                                               |
| `when-demo.spec.ts`             | Form.When условный рендеринг                                                                                                                                                             |
| `steps-demo.spec.ts`            | Form.Steps мультистеп формы                                                                                                                                                              |
| `date-range-demo.spec.ts`       | DateRange выбор диапазона дат с пресетами                                                                                                                                                |
| `tags-demo.spec.ts`             | Tags ввод тегов                                                                                                                                                                          |
| `autocomplete-demo.spec.ts`     | Autocomplete текстовое поле с подсказками                                                                                                                                                |
| `numeric-demo.spec.ts`          | NumberInput, Currency, Percentage (Фаза 6)                                                                                                                                               |
| `masked-demo.spec.ts`           | Phone, MaskedInput с масками (Фаза 6)                                                                                                                                                    |
| `advanced-demo.spec.ts`         | Address, Duration, DateTimePicker (Фаза 6)                                                                                                                                               |
| `auth-demo.spec.ts`             | PasswordStrength, OTPInput (Фаза 6)                                                                                                                                                      |
| `offline-demo.spec.ts`          | Оффлайн формы: OfflineIndicator, SyncStatus, useOfflineForm (Фаза 7)                                                                                                                     |
| `controlled-state-demo.spec.ts` | Form без onSubmit: controlled state, form.Subscribe, live preview (Фаза 10)                                                                                                              |
| `meta-syntax-demo.spec.ts`      | `@meta("form.*", …)` вместо comment-директив, обратная совместимость с legacy-синтаксисом (Фаза 3 zenstack-form-plugin)                                                                  |
| `constraints-demo.spec.ts`      | Автоматические Zod constraints: minLength/maxLength, aria-valuemin/max, min/max дат, minItems/maxItems массивов (Фаза 11)                                                                |

### Запуск тестов

```bash
nx e2e form-develop-app-e2e                          # Все тесты
nx e2e form-develop-app-e2e -- --project=chromium    # Только Chrome
nx e2e form-develop-app-e2e -- --grep="Schedule"     # Конкретные тесты
```

---

## Связанные документы

- [/libs/forms/PLAN.md](../../libs/forms/PLAN.md) — план развития библиотеки
- [/libs/forms/README.md](../../libs/forms/README.md) — документация библиотеки

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
form-develop-app`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не
подключён. Уже подключено: domwellbes, studio, aboi. Подключать по одному, не пакетно —
allowlist легитимных исключений собирается руками при первом прогоне. Разбор —
`.claude/docs/theme-hardcode-gate-coverage.md`.

---

**Последнее обновление:** 2026-08-26 — фикс пререндера `controlled-state-demo`/`filters-state-demo`
(баг `@letar/forms` 2.7.6), детали в `PLAN_COMPLETED.md`.
