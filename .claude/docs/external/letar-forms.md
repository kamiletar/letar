# @letar/forms — Документация

> Версия: 1.3.0 | Внутренняя библиотека монорепо letar\
> Детальная документация: `libs/forms/README.md`, `libs/forms/docs/`

## Философия

Отделение вёрстки от логики:

- **Валидация** → Zod схема
- **UI метаданные** → Zod `.meta({ ui: {...} })`
- **Структура** → TypeScript типы
- **Вёрстка** → JSX (только имена полей)

## Быстрый старт

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z.string().min(2).meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(0).max(10).meta({ ui: { title: 'Рейтинг' } }),
})

// С кастомным layout
<Form schema={Schema} initialValue={{ title: '', rating: 5 }} onSubmit={save}>
  <Form.Field.String name="title" />
  <Form.Field.Number name="rating" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>

// Полная автогенерация из схемы
<Form.FromSchema schema={Schema} initialValue={data} onSubmit={save} submitLabel="Создать" />
```

## createForm — ОБЯЗАТЕЛЬНЫЙ паттерн в letar

Каждое приложение ОБЯЗАНО создавать свой инстанс через `createForm()`:

```tsx
// src/my-app-form/my-app-form.tsx
import { createForm, lazyComboboxes, lazySelects } from '@letar/forms'

export const MyAppForm = createForm({
  // Enum Select-ы (lazy imports для экономии памяти)
  extraSelects: lazySelects({
    Status: () => import('./selects/status-select'),
    Category: () => import('./selects/category-select'),
  }),
  // Async Combobox для поиска сущностей
  extraComboboxes: lazyComboboxes({
    User: () => import('./comboboxes/user-combobox'),
  }),
  // Синхронные кастомные поля
  extraFields: {
    PlateNumber: PlateNumberField,
  },
})

// Использование
<MyAppForm initialValue={defaults} onSubmit={handleSubmit}>
  <MyAppForm.Field.String name="title" />
  <MyAppForm.Select.Status name="status" />
  <MyAppForm.Combobox.User name="userId" />
  <MyAppForm.Button.Submit />
</MyAppForm>
```

Образец: `apps/driving-school/src/driving-school-form/` (46 Select, 10 Combobox, 3 Field)

## 56 Field компонентов

### Текстовые

| Компонент                     | Описание              |
| ----------------------------- | --------------------- |
| `Form.Field.String`           | Текстовое поле        |
| `Form.Field.Textarea`         | Многострочный текст   |
| `Form.Field.Password`         | Пароль с toggle       |
| `Form.Field.PasswordStrength` | Пароль с индикатором  |
| `Form.Field.Editable`         | Inline редактирование |
| `Form.Field.RichText`         | WYSIWYG (Tiptap)      |

### Числовые

| Компонент                | Описание                   |
| ------------------------ | -------------------------- |
| `Form.Field.Number`      | Числовое поле              |
| `Form.Field.NumberInput` | Числовое со стрелками      |
| `Form.Field.Slider`      | Ползунок                   |
| `Form.Field.Rating`      | Рейтинг звёздами           |
| `Form.Field.Currency`    | Денежное с форматированием |
| `Form.Field.Percentage`  | Процентное                 |

### Дата / Время

| Компонент                   | Описание             |
| --------------------------- | -------------------- |
| `Form.Field.Date`           | Дата                 |
| `Form.Field.Time`           | Время                |
| `Form.Field.DateRange`      | Диапазон дат         |
| `Form.Field.DateTimePicker` | Дата + время         |
| `Form.Field.Duration`       | Длительность HH:MM   |
| `Form.Field.Schedule`       | Недельное расписание |

### Выбор

| Компонент                    | Описание                 |
| ---------------------------- | ------------------------ |
| `Form.Field.Select`          | Styled select            |
| `Form.Field.NativeSelect`    | Нативный select          |
| `Form.Field.Combobox`        | Searchable с группами    |
| `Form.Field.Autocomplete`    | Текст с подсказками      |
| `Form.Field.Listbox`         | Listbox single/multi     |
| `Form.Field.RadioGroup`      | Радиокнопки              |
| `Form.Field.RadioCard`       | Card-based radio         |
| `Form.Field.SegmentedGroup`  | Segmented control        |
| `Form.Field.ImageChoice`     | Визуальный выбор         |
| `Form.Field.CascadingSelect` | Каскадный (страна→город) |

### Множественный выбор

| Компонент                 | Описание         |
| ------------------------- | ---------------- |
| `Form.Field.Checkbox`     | Чекбокс          |
| `Form.Field.CheckboxCard` | Card-based multi |
| `Form.Field.Switch`       | Переключатель    |
| `Form.Field.Tags`         | Ввод тегов       |
| `Form.Field.YesNo`        | Бинарный Да/Нет  |

### Специализированные

| Компонент                | Описание                   |
| ------------------------ | -------------------------- |
| `Form.Field.Auto`        | Автоопределение из Zod     |
| `Form.Field.PinInput`    | PIN/OTP                    |
| `Form.Field.OTPInput`    | OTP с таймером resend      |
| `Form.Field.Phone`       | Телефон с маской           |
| `Form.Field.MaskedInput` | Универсальная маска        |
| `Form.Field.Address`     | Адрес с автодополнением    |
| `Form.Field.City`        | Город с автодополнением    |
| `Form.Field.Signature`   | Цифровая подпись           |
| `Form.Field.CreditCard`  | Банковская карта           |
| `Form.Field.ColorPicker` | Выбор цвета                |
| `Form.Field.FileUpload`  | Загрузка файлов            |
| `Form.Field.Hidden`      | Скрытое поле               |
| `Form.Field.Calculated`  | Вычисляемое поле           |
| `Form.Field.TableEditor` | Табличный редактор массива |
| `Form.Field.Relation`    | Relation поле              |

## Form-level компоненты

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  {/* Реактивные побочные эффекты */}
  <Form.Watch field="name" onChange={(v, { setFieldValue }) => setFieldValue('slug', transliterate(v))} />

  {/* Условный рендеринг */}
  <Form.When field="type" is="company">
    <Form.Field.String name="companyName" />
  </Form.When>

  {/* Мультистеп */}
  <Form.Steps animated validateOnNext>
    <Form.Steps.Step title="Основное">
      <Form.Field.String name="title" />
    </Form.Steps.Step>
    <Form.Steps.Step title="Детали">
      <Form.Field.Textarea name="description" />
    </Form.Steps.Step>
    <Form.Steps.Navigation />
  </Form.Steps>

  {/* Группы и массивы */}
  <Form.Group name="address">
    <Form.Field.String name="city" /> {/* → address.city */}
    <Form.Field.String name="street" /> {/* → address.street */}
  </Form.Group>

  <Form.Group.List name="phones">
    <Form.Field.Phone />
    <Form.Group.List.Button.Add>Добавить</Form.Group.List.Button.Add>
  </Form.Group.List>

  <Form.Errors title="Исправьте ошибки:" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

## ZenStack интеграция

```zmodel
// schema.zmodel
model Product {
  /// @form.title("Название")
  /// @form.placeholder("Введите название")
  title String

  /// @form.title("Цена")
  /// @form.fieldType("currency")
  /// @form.props({ min: 0, currency: "RUB" })
  price Int
}
```

```tsx
// Использование сгенерированных схем
import { ProductCreateFormSchema } from '@/generated/form-schemas'
<Form.FromSchema schema={ProductCreateFormSchema} initialValue={data} onSubmit={save} />
```

## Обработка серверных ошибок

```typescript
import { applyServerErrors, mapServerErrors } from '@letar/forms'

try {
  await db.product.create({ data: value })
} catch (error) {
  // Автодетект Prisma P2002 / ZenStack policy / Zod flatten
  const mapped = mapServerErrors(error)
  applyServerErrors(form, mapped)
}
```

## Offline поддержка

```tsx
import { useOfflineForm } from '@letar/forms/offline'

const { submit, isOffline, pendingCount } = useOfflineForm({
  actionType: 'UPDATE_PROFILE',
  onlineSubmit: async (value) => await updateProfile(value),
  onQueued: () => toast.info('Сохранено локально'),
  onSynced: () => toast.success('Синхронизировано'),
})

<Form offline={{ actionType: 'UPDATE_PROFILE', onQueued, onSynced }} onSubmit={handleSubmit}>
  <Form.OfflineIndicator />
  <Form.Field.String name="name" />
  <Form.Button.Submit />
</Form>
```

## Security фичи

```tsx
// Honeypot против ботов
<Form honeypot={true} ...>

// Rate limiting
<Form rateLimit={{ maxSubmits: 3, windowMs: 60000 }} ...>

// Безопасная загрузка файлов
<Form.Field.FileUpload
  name="doc"
  security={{ maxSize: '10MB', allowedTypes: ['image/jpeg'], stripMetadata: true }}
/>
```

## Ключевые хуки

```typescript
import {
  useAppForm, // Основной хук (обёртка TanStack Form)
  useFieldActions, // Императивные действия: value, onChange, setError
  useFieldContext, // TanStack FieldApi<T>
  useFormAutosave, // Автосохранение
  useFormContext, // TanStack FormApi
  useFormGroup, // Контекст группы { name, originalName }
  useFormGroupList, // Операции массива { pushValue, removeValue }
  useFormHistory, // Undo/Redo { undo, redo, canUndo }
  useFormStepsContext, // { goToNext, goToPrev, skipToEnd }
} from '@letar/forms'
```

## DX утилиты

```tsx
// Undo/Redo — Ctrl+Z/Ctrl+Y
const { undo, redo } = useFormHistory(form, { maxHistory: 50 })
<Form.History.Controls />

// ReadOnly view
<FormReadOnlyView data={user} schema={UserSchema} compact />

// Skeleton loading
<FormSkeleton schema={UserSchema} showSubmit />

// Comparison diff
<FormComparison original={old} current={newData} schema={Schema} onlyChanged />

// URL Prefill (маркетинг)
const url = generatePrefillUrl('/contact', { name: 'Иван' })
const prefilled = useUrlPrefill({ fields: ['name', 'email'], cleanUrl: true })
```

## Testing utilities

```tsx
import { expectFieldError, fillField, renderForm, submitForm } from '@letar/forms/testing'

const { onSubmit } = renderForm(ContactForm)
await fillField('name', 'Иван')
await submitForm()
expect(onSubmit).toHaveBeenCalled()
```

## Что НЕЛЬЗЯ

- ❌ НЕ импортировать `@tanstack/react-form` напрямую
- ❌ НЕ использовать `react-hook-form` или `Conform` в новых компонентах
- ❌ НЕ писать кастомные поля если есть аналог — проверяй `form-mcp → list_fields`
- ❌ НЕ забывать `.strip()` в Zod схемах

## Ссылки

- README: `libs/forms/README.md`
- API Reference: `libs/forms/docs/api-reference.md`
- Fields: `libs/forms/docs/fields.md`
- ZenStack интеграция: `libs/forms/docs/zenstack.md`
- Form-level: `libs/forms/docs/form-level.md`
- MCP: `form-mcp` → list_fields, get_field_props, get_form_pattern
