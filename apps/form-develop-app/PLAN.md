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

## E2E Тесты

### Покрытие тестами (21 файл)

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

**Последнее обновление:** 2026-08-09 (архивация выполненных фаз в PLAN_COMPLETED.md)
