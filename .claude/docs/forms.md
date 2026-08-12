# Формы и валидация

## @letar/forms — Единственный рекомендуемый подход

**ВСЕГДА** используй `@letar/forms` для всех форм в проекте. Библиотека построена на TanStack Form и предоставляет унифицированный API для всего монорепозитория.

### Философия: Отделение вёрстки от логики

Главная цель декларативного Form API — **полное отделение вёрстки от всего остального**:

| Аспект            | Где определяется           | Как используется в JSX          |
| ----------------- | -------------------------- | ------------------------------- |
| **Валидация**     | Zod схема                  | `schema={Schema}`               |
| **UI метаданные** | Zod `.meta({ ui: {...} })` | Автоматически из схемы          |
| **Структура**     | TypeScript типы            | `initialValue={data}`           |
| **Вёрстка**       | JSX                        | `<HStack>`, `<VStack>`, `<Box>` |

**Результат:** JSX содержит только вёрстку и имена полей. Вся логика живёт в схеме.

### Установка

Библиотека уже включена в монорепозиторий. Импортируй напрямую:

```typescript
// Декларативный API (рекомендуется для новых форм)
import { createForm, Form } from '@letar/forms'

// Императивный API (для сложных кейсов)
import {
  ChakraFormField,
  FormField,
  FormGroup,
  FormGroupList,
  FormGroupListItem,
  TanStackFormField,
  useAppForm,
  useFieldContext,
  useFormContext,
  withForm,
} from '@letar/forms'
```

---

## Декларативный Form API (v0.2.0+)

Новый compound component API для создания форм с минимальным boilerplate.

### Доступные поля (v0.51.0)

| Компонент                   | Описание                       | Пример использования                                         |
| --------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `Form.Field.String`         | Текстовое поле                 | `<Form.Field.String name="title" />`                         |
| `Form.Field.Number`         | Числовое поле                  | `<Form.Field.Number name="age" min={0} max={150} />`         |
| `Form.Field.Textarea`       | Многострочный текст            | `<Form.Field.Textarea name="bio" rows={4} />`                |
| `Form.Field.Date`           | Дата                           | `<Form.Field.Date name="birthDate" />`                       |
| `Form.Field.Time`           | Время                          | `<Form.Field.Time name="startTime" />`                       |
| `Form.Field.Password`       | Пароль с toggle                | `<Form.Field.Password name="password" />`                    |
| `Form.Field.Select`         | Chakra-стилизованный select    | `<Form.Field.Select name="type" options={opts} />`           |
| `Form.Field.NativeSelect`   | Нативный select                | `<Form.Field.NativeSelect name="type" options={opts} />`     |
| `Form.Field.Combobox`       | Searchable select с группами   | `<Form.Field.Combobox name="country" options={opts} />`      |
| `Form.Field.Listbox`        | Listbox single/multi selection | `<Form.Field.Listbox name="role" options={opts} />`          |
| `Form.Field.RadioGroup`     | Группа radio-кнопок            | `<Form.Field.RadioGroup name="size" options={opts} />`       |
| `Form.Field.RadioCard`      | Card-based radio selection     | `<Form.Field.RadioCard name="plan" options={opts} />`        |
| `Form.Field.SegmentedGroup` | Segmented control              | `<Form.Field.SegmentedGroup name="billing" options={opts}>`  |
| `Form.Field.Checkbox`       | Чекбокс                        | `<Form.Field.Checkbox name="agree" />`                       |
| `Form.Field.CheckboxCard`   | Card-based multi selection     | `<Form.Field.CheckboxCard name="features" options={opts} />` |
| `Form.Field.Switch`         | Переключатель                  | `<Form.Field.Switch name="darkMode" />`                      |
| `Form.Field.ColorPicker`    | Выбор цвета                    | `<Form.Field.ColorPicker name="brandColor" />`               |
| `Form.Field.Editable`       | Inline редактирование          | `<Form.Field.Editable name="title" showControls />`          |
| `Form.Field.Schedule`       | Редактор недельного расписания | `<Form.Field.Schedule name="workingHours" />`                |

### Zod Schema с UI метаданными (v0.3.0+)

Поля автоматически читают `label`, `placeholder`, `helperText` из Zod `.meta()`:

```tsx
import { z } from 'zod/v4'

const Schema = z.object({
  title: z.string().min(2).meta({
    ui: {
      title: 'Название',           // → label
      placeholder: 'Введите...',   // → placeholder
      description: 'Подсказка',    // → helperText
    },
  }),
  rating: z.number().min(0).max(10).meta({
    ui: { title: 'Рейтинг', description: 'От 0 до 10' },
  }),
})

<Form initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  <Form.Field.String name="title" />   {/* label="Название", placeholder="Введите..." */}
  <Form.Field.Number name="rating" />  {/* label="Рейтинг", helperText="От 0 до 10" */}
</Form>
```

**Приоритет:** Props > Schema meta — можно переопределить при необходимости:

```tsx
<Form.Field.String name="title" label="Своё название" />  {/* Перезапишет meta.ui.title */}
```

### Автоматические constraints из Zod схемы (v0.44.0+)

Поля автоматически извлекают ограничения из Zod схемы и применяют их к HTML/UI:

```tsx
const Schema = z.object({
  title: z.string().min(2).max(100),     // → minLength={2} maxLength={100}
  email: z.string().email(),             // → type="email"
  rating: z.number().min(1).max(10),     // → min={1} max={10}
  tags: z.array(z.string()).max(5),      // → maxItems={5} (Add отключается)
})

<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="title" />       {/* constraints из схемы */}
  <Form.Field.String name="email" />       {/* type="email" автоматически */}
  <Form.Field.Number name="rating" />      {/* min/max из схемы */}

  <Form.Group.List name="tags">            {/* Add отключается при 5 */}
    <Form.Field.String />
  </Form.Group.List>
</Form>
```

**Поддерживаемые constraints:**

- Строки: `minLength`, `maxLength`, `type` (email/url), `pattern` (regex)
- Числа: `min`, `max`, `step` (из `.int()` или `.multipleOf()`)
- Даты: `min`, `max` (конвертация Date → YYYY-MM-DD)
- Массивы: `minItems`, `maxItems` (отключение Add/Remove кнопок)

**Автоматические подсказки:** Если `helperText` не указан, генерируется из constraints ("Максимум 100 символов", "От 1 до 10").

**Props имеют приоритет над constraints из схемы.**

**Важно:** `.meta()` должен быть последним в цепочке вызовов, иначе метаданные потеряются:

```tsx
// ✅ Правильно
z.string()
  .min(2)
  .meta({ ui: { title: 'Title' } })

// ❌ Неправильно — .max() создаёт новый объект без meta
z.string()
  .meta({ ui: { title: 'Title' } })
  .max(100)
```

### Базовое использование

```tsx
import { Form } from '@letar/forms'
<Form initialValue={{ title: '', count: 0 }} onSubmit={handleSubmit}>
  <Form.Field.String name="title" label="Название" />
  <Form.Field.Number name="count" label="Количество" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### Вложенные группы

```tsx
<Form.Group name="info">
  <Form.Group name="base">
    <Form.Field.Number name="rating" label="Рейтинг" />
  </Form.Group>
</Form.Group>
// Путь поля: info.base.rating
```

### Массивы объектов

```tsx
<Form.Group.List name="components" emptyContent="Нет компонентов">
  <Form.Field.String name="title" label="Название" />
  <Form.Field.Number name="weightGrams" label="Вес (г)" />
</Form.Group.List>
// Автоматическая итерация по массиву
```

### Примитивные массивы

```tsx
<Form.Group.List name="tags">
  <Form.Field.String /> {/* без name для примитивов */}
</Form.Group.List>
// tags: string[]
```

### localStorage Persistence (v0.16.0+)

Автоматическое сохранение данных формы с диалогом восстановления. Подключай по умолчанию для
любой нетривиальной формы (создание/редактирование сущности, длинная форма — не одноразовый
auth-экран), не по напоминанию — принцип [Ководство §188](https://www.artlebedev.ru/kovodstvo/sections/188/):
пользовательский ввод священен, закрытие вкладки/краш/перезагрузка не должны его стирать.

```tsx
<Form
  initialValue={initialValues}
  schema={Schema}
  onSubmit={handleSubmit}
  persistence={{
    key: 'unique-form-key', // Уникальный ключ для localStorage
    debounceMs: 500, // Задержка сохранения (по умолчанию 500мс)
    dialogTitle: 'Восстановить?', // Заголовок диалога
    dialogDescription: 'Найдены сохранённые данные',
    restoreButtonText: 'Восстановить',
    discardButtonText: 'Начать заново',
    excludeFields: ['password', 'cvv'], // Чувствительные поля — см. ниже
  }}
>
  <Form.Field.String name="title" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Как это работает:**

1. При изменении полей данные автоматически сохраняются в localStorage
2. При загрузке формы проверяется наличие сохранённых данных
3. Если данные найдены — показывается диалог восстановления
4. При успешном submit данные автоматически удаляются из localStorage

⛔ **`excludeFields` (v2.4.0+) — чувствительные поля никогда не попадают в снимок.** Пароль,
номер карты, CVV, срок действия и другие auth/платёжные данные **обязаны** быть в этом списке
для любой формы, где они встречаются (см. `.claude/rules/forms.md` § Правила). Поле вычищается
из объекта перед сериализацией (shallow omit) — при восстановлении оно просто отсутствует в
`savedData`, форма его не перезаписывает и оставляет значение из `initialValue` как есть.

**Хук `useFormPersistence` для кастомных сценариев:**

```tsx
import { useFormPersistence } from '@letar/forms'

const persistence = useFormPersistence<MyFormData>({
  key: 'my-form',
  debounceMs: 500,
  excludeFields: ['password', 'cvv'],
})

// API:
persistence.saveValues(values) // Сохранить вручную (excludeFields применится автоматически)
persistence.clearSavedData() // Очистить сохранённые данные
persistence.hasSavedData // Есть ли сохранённые данные
persistence.savedData // Сохранённые данные
persistence.isDialogOpen // Открыт ли диалог
persistence.acceptRestore() // Принять восстановление
persistence.rejectRestore() // Отклонить и очистить
persistence.RestoreDialog // Компонент диалога
```

### Расширяемость (app-specific поля)

```tsx
import { createForm } from '@letar/forms'

// Создаём расширенную форму с кастомными Select компонентами
export const AppForm = createForm({
  extraSelects: {
    Type: SelectTypeComponent,
    Category: SelectCategoryComponent,
  },
})

// Использование
<AppForm initialValue={data} onSubmit={handleSubmit}>
  <AppForm.Select.Type name="type" />
  <AppForm.Field.String name="title" />
</AppForm>
```

### App-specific формы в проектах

Каждое приложение может создать свою расширенную форму с компонентами для всех ENUM'ов и моделей:

**Пример: DrivingSchoolForm**

```
apps/driving-school/src/driving-school-form/
├── driving-school-form.tsx      # createForm() с расширениями
├── labels.ts                    # Русские названия ENUM'ов
├── selects/                     # 38 Select компонентов для ENUM'ов
└── comboboxes/                  # 8 Combobox компонентов для моделей
```

```tsx
import { DrivingSchoolForm } from '@/driving-school-form'
<DrivingSchoolForm initialValue={data} onSubmit={handleSubmit}>
  <DrivingSchoolForm.Field.String name="name" label="Имя" />
  <DrivingSchoolForm.Select.LicenseCategory name="category" label="Категория" />
  <DrivingSchoolForm.Select.TransmissionType name="transmission" label="КПП" />
  <DrivingSchoolForm.Combobox.Instructor name="instructorId" label="Инструктор" />
  <DrivingSchoolForm.Button.Submit>Сохранить</DrivingSchoolForm.Button.Submit>
</DrivingSchoolForm>
```

**API createForm:**

```tsx
export const DrivingSchoolForm = createForm({
  // Select компоненты для статических ENUM'ов
  extraSelects: {
    LicenseCategory: SelectLicenseCategory,
    TransmissionType: SelectTransmissionType,
    // ... все 38 ENUM'ов
  },
  // Combobox компоненты для асинхронного поиска моделей
  extraComboboxes: {
    Instructor: ComboboxInstructor,
    Student: ComboboxStudent,
    School: ComboboxSchool,
    // ... все модели
  },
})
```

### Когда использовать декларативный vs императивный API

| Сценарий                         | API                    |
| -------------------------------- | ---------------------- |
| Простые формы                    | Декларативный (`Form`) |
| Формы со стандартными полями     | Декларативный (`Form`) |
| Формы с массивами                | Декларативный (`Form`) |
| Кастомная логика валидации       | Императивный           |
| Сложные зависимости между полями | Императивный           |
| Динамическое добавление полей    | Императивный           |

---

## Императивный API

### Базовый пример

```typescript
'use client'

import { Button, Input } from '@chakra-ui/react'
import { ChakraFormField, TanStackFormField, useAppForm } from '@letar/forms'
import { z } from 'zod/v4'

const ProfileSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Некорректный email'),
})

export function ProfileForm({ initialData, onSubmit }) {
  const form = useAppForm({
    defaultValues: initialData ?? { name: '', email: '' },
    validators: { onChange: ProfileSchema },
    onSubmit: async ({ value }) => {
      const result = await onSubmit(value)
      if (result.success) {
        toaster.success({ title: 'Сохранено' })
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => (
          <TanStackFormField name="name" field={field}>
            <ChakraFormField label="Имя" required>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </ChakraFormField>
          </TanStackFormField>
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <TanStackFormField name="email" field={field}>
            <ChakraFormField label="Email" required>
              <Input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </ChakraFormField>
          </TanStackFormField>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" colorPalette="fg" loading={isSubmitting}>
            Сохранить
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
```

### Компоненты библиотеки

#### Контексты именования

| Компонент           | Описание                                           |
| ------------------- | -------------------------------------------------- |
| `FormGroup`         | Создаёт контекст группы с dot-notation именованием |
| `FormField`         | Контекст именования отдельного поля                |
| `TanStackFormField` | Связывает TanStack Form field API с контекстом     |
| `ChakraFormField`   | Chakra UI v3 Field с автоматическими ошибками      |

```typescript
<FormGroup name="user">
  <FormGroup name="address">
    {/* useFormGroup() вернёт { name: 'user.address' } */}
  </FormGroup>
</FormGroup>
```

#### Работа с массивами

| Компонент           | Описание                                 |
| ------------------- | ---------------------------------------- |
| `FormGroupList`     | Обёртка для массива полей с операциями   |
| `FormGroupListItem` | Элемент массива с remove/moveUp/moveDown |

```typescript
<form.Field name="phones" mode="array">
  {(phonesField) => (
    <FormGroupList name="phones" field={phonesField} emptyContent="Нет телефонов">
      {(items, { pushValue }) => (
        <>
          {items.map((_, index) => (
            <FormGroupListItem key={index} index={index}>
              {({ remove, isFirst, isLast }) => (
                <HStack>
                  <form.Field name={`phones[${index}].number`}>
                    {(field) => <Input value={field.state.value} />}
                  </form.Field>
                  <Button onClick={remove}>Удалить</Button>
                </HStack>
              )}
            </FormGroupListItem>
          ))}
          <Button onClick={() => pushValue({ number: '' })}>Добавить</Button>
        </>
      )}
    </FormGroupList>
  )}
</form.Field>
```

**Доступные операции массива:**

- `pushValue(value)` — добавить в конец
- `removeValue(index)` — удалить по индексу
- `insertValue(index, value)` — вставить по индексу
- `replaceValue(index, value)` — заменить по индексу
- `moveValue(from, to)` — переместить элемент
- `swapValues(indexA, indexB)` — поменять местами

### Хуки

```typescript
// Доступ к field API внутри кастомных компонентов
const field = useFieldContext<string>()

// Доступ к form API
const form = useFormContext()

// Контекст именования группы
const group = useFormGroup() // { originalName, name }

// Контекст именования поля
const fieldCtx = useFormField() // { originalName, name }

// TanStack Form field с именованием
const ctx = useTanStackFormField() // { originalName, name, field }

// Операции с массивом
const list = useFormGroupList() // { pushValue, removeValue, ... }

// Контекст элемента массива
const item = useFormGroupListItem() // { index, remove, moveUp, moveDown, ... }
```

### Оффлайн-формы

Для PWA с оффлайн-поддержкой используй `useOfflineForm` из `@letar/forms/offline`:

```typescript
import { useAppForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus, useOfflineForm } from '@letar/forms/offline'

const { submit, isOffline, pendingCount, isProcessing } = useOfflineForm<ProfileFormData>({
  actionType: 'UPDATE_INSTRUCTOR_PROFILE',
  onlineSubmit: async (value) => {
    const result = await updateProfileAction(value)
    return result?.success ? { success: true } : { success: false, error: result?.error?.formErrors?.[0] }
  },
  onSuccess: () => toaster.success({ title: 'Профиль обновлён' }),
  onQueued: () => toaster.info({ title: 'Сохранено локально' }),
  onError: (error) => toaster.error({ title: 'Ошибка', description: error }),
})

const form = useAppForm({
  defaultValues: initialData,
  onSubmit: async ({ value }) => {
    await submit(value)
  },
})
```

### Расширение библиотеки

Если встретил кейс, которого нет в библиотеке — **добавь компонент в `libs/forms`**:

1. Создай компонент в `libs/forms/src/lib/`
2. Экспортируй из `libs/forms/src/index.ts`
3. Обнови документацию библиотеки

**Связанные документы:**

- [libs/forms/README.md](/libs/forms/README.md) — полное API
- [libs/forms/PLAN.md](/libs/forms/PLAN.md) — roadmap
- [libs/forms/TESTING_PLAN.md](/libs/forms/TESTING_PLAN.md) — тесты

---

## ⚠️ КРИТИЧНО - Next.js 16 'use server'

Файлы с директивой `'use server'` могут экспортировать **ТОЛЬКО async функции**!

**❌ НЕПРАВИЛЬНО:**

```typescript
'use server'

export const CONSTANTS = { MAX_SIZE: 100 } // Ошибка!
export type MyType = { id: string } // Ошибка!

export async function myAction() { ... }
```

**✅ ПРАВИЛЬНО:**

```typescript
'use server'

// Только async функции
export async function myAction() { ... }
export async function anotherAction() { ... }
```

**Решение:** Выноси константы, типы и объекты в отдельные файлы без `'use server'`.

---

## Zod v4 валидация

### Критичные импорты

```typescript
import { z } from 'zod/v4'
```

### Определение схемы

**КРИТИЧНО:** Всегда используй `.strip()` для удаления служебных полей:

```typescript
import { z } from 'zod/v4'

export const ProfileSchema = z
  .object({
    name: z.string().min(2, 'Минимум 2 символа'),
    email: z.string().email('Некорректный email'),
    isPublic: z.boolean(),
  })
  .strip() // ← КРИТИЧНО

export type ProfileFormData = z.infer<typeof ProfileSchema>
```

---

## React 19 хуки для оптимистичных обновлений

### useOptimistic

```typescript
import { useOptimistic, useTransition } from 'react'

const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(
  item.quantity,
  (_state, newQuantity: number) => newQuantity,
)

const handleUpdate = (newQty: number) => {
  startTransition(async () => {
    setOptimisticQuantity(newQty) // Мгновенно обновляем UI
    await updateCartItem(item.id, newQty) // Отправляем на сервер
    router.refresh()
  })
}
```

### useFormStatus

```typescript
import { useFormStatus } from 'react'

function SubmitButton({ children }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      {children}
    </Button>
  )
}
```

---

## Обработка ошибок в формах

### Типизация результатов Server Actions

**Простой паттерн** (без field-level ошибок):

```typescript
// _actions/vehicle.action.ts
export type VehicleActionResult = { success: true; id?: string } | { success: false; error: string }

export async function createVehicleAction(data: VehicleInput): Promise<VehicleActionResult> {
  const parsed = VehicleInputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  try {
    const vehicle = await prisma.instructorVehicle.create({ data: parsed.data })
    revalidatePath('/vehicles')
    return { success: true, id: vehicle.id }
  } catch (error) {
    console.error('Ошибка создания:', error)
    return { success: false, error: 'Произошла ошибка при создании' }
  }
}
```

**Расширенный паттерн** (с field-level ошибками):

```typescript
// _actions/client.action.ts
interface ClientActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createClientAction(data: ClientFormData): Promise<ClientActionResult> {
  // 1. Валидация Zod
  const parsed = ClientFormSchema.safeParse(data)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? 'form'
      if (!fieldErrors[field]) { fieldErrors[field] = [] }
      fieldErrors[field].push(issue.message)
    }
    return { success: false, fieldErrors }
  }

  try {
    // 2. Бизнес-валидация (уникальность email и т.д.)
    const emailExists = await prisma.client.findUnique({ where: { email: parsed.data.email } })
    if (emailExists) {
      return {
        success: false,
        fieldErrors: { email: ['Клиент с таким email уже существует'] },
      }
    }

    await prisma.client.create({ data: parsed.data })
    return { success: true }
  } catch (error) {
    // 3. Обработка ошибок Prisma
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false,
        fieldErrors: { email: ['Клиент с таким email уже существует'] },
      }
    }
    return { success: false, error: 'Произошла ошибка' }
  }
}
```

### Обработка ошибок в onSubmit

**Простой вариант — toast уведомления:**

```tsx
// vehicle-form.tsx
const handleSubmit = async (value: VehicleInput) => {
  const result = await createVehicleAction(value)

  if (result.success) {
    toaster.success({ title: 'Автомобиль добавлен' })
    router.push('/vehicles')
  } else {
    toaster.error({ title: 'Ошибка', description: result.error })
  }
}
```

**С field-level ошибками — mapServerErrors (v0.79.0):**

```tsx
import { applyServerErrors, mapServerErrors } from '@letar/forms'

// client-form.tsx — ошибки маппятся на поля формы автоматически
const handleSubmit = async (value: ClientFormData) => {
  const result = await createClientAction(value)

  if (result.success) {
    toaster.success({ title: 'Клиент создан' })
    router.push('/clients')
  } else {
    // Автодетект: Prisma P2002 → поле email, Zod flatten → поля, ActionResult → toast
    const mapped = mapServerErrors(result, {
      fieldMap: {
        email: { field: 'email', message: 'Клиент с таким email уже существует' },
      },
    })

    // Применить ошибки к полям формы (показываются под конкретными полями)
    applyServerErrors(form, mapped)

    // Глобальные ошибки — в toast
    if (mapped.formErrors.length) {
      toaster.error({ title: 'Ошибка', description: mapped.formErrors[0] })
    }
  }
}
```

> Подробнее: [docs/server-errors.md](../../libs/forms/docs/server-errors.md)

### Form.Errors — глобальные ошибки формы

Компонент `<Form.Errors />` показывает сводку всех ошибок валидации:

```tsx
<Form initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  {/* Глобальные ошибки в начале формы */}
  <Form.Errors title="Исправьте следующие ошибки:" />

  <Form.Field.String name="title" />
  <Form.Field.Number name="price" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Что показывает:**

- Ошибки валидации Zod по каждому полю (формат: `field: message`)
- Серверные ошибки из `apiState.mutationError` (если используется)

**Когда использовать:**

- Длинные формы где ошибки могут быть не видны
- Формы с несколькими шагами
- Как дополнение к ошибкам под полями

### Паттерны обработки ошибок

| Сценарий                   | Решение                                     |
| -------------------------- | ------------------------------------------- |
| Простая форма              | Toast уведомления                           |
| Длинная форма              | `<Form.Errors />` + Toast                   |
| Field-level ошибки сервера | Toast с первой ошибкой (TODO: setFieldMeta) |
| Сетевые ошибки             | try/catch + Toast                           |
| Ошибки авторизации         | Редирект на /signin                         |

### Эталонные примеры обработки ошибок

| Пример                 | Файл                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Простые ошибки (toast) | `apps/driving-school/src/app/(instructor)/vehicles/_components/vehicle-form.tsx`                       |
| Field-level ошибки     | `apps/driving-school/src/app/(school-admin)/school/students/_actions/create-student-account.action.ts` |
| Prisma P2002 (unique)  | `apps/svoichuzhie/src/app/_actions/admin-product.action.ts`                                            |

---

## Эталонные примеры

| Пример                  | Файл                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| TanStack Form с оффлайн | `apps/driving-school/src/app/(instructor)/instructor-profile/_components/instructor-profile-form.tsx` |
| Массивы полей           | `libs/forms/README.md`                                                                                |
| Switch/Checkbox         | `libs/forms/README.md`                                                                                |
| Обработка ошибок        | `apps/driving-school/src/app/(instructor)/vehicles/_components/vehicle-form.tsx`                      |

---

## Когда использовать что

**✅ ВСЕГДА используй `@letar/forms`:**

- Все новые формы
- Формы с Switch/Checkbox (решает Bug #21 — мигание)
- Сложные формы с массивами
- Формы с кастомными компонентами

**✅ React 19 хуки (useOptimistic, useFormStatus):**

- Одиночные оптимистичные обновления (like, favorite, количество)
- Submit button с автоматическим loading

---

## Мультиязычность (i18n) — v0.52.0+

### Конфигурация плагина

Для мультиязычных приложений включи i18n в `schema.zmodel`:

```zmodel
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'

  // i18n настройки
  i18n = true                           // Включить генерацию i18nKey
  i18nOutput = './messages/form-schemas' // Путь к файлам переводов
  defaultLocale = 'ru'                  // Локаль по умолчанию (перезаписывается)
  locales = 'ru,en'                     // Список локалей через запятую
}
```

### Генерируемые файлы

```
messages/form-schemas/
├── ru.json    # Переводы на русском (defaultLocale — перезаписывается)
├── en.json    # Переводы на английском (merge-стратегия)
└── keys.ts    # TypeScript типы ключей
```

### Формат переводов (v0.52.0+)

**ru.json** (defaultLocale — полностью перезаписывается):

```json
{
  "Product": {
    "name": { "title": "Название товара", "placeholder": "Введите название" }
  },
  "RecipeType": {
    "SWEET": { "label": "Сладкое" }
  },
  "validation": {
    "too_small": {
      "string": "Минимум {minimum} символов",
      "number": "Минимум {minimum}"
    },
    "invalid_format": {
      "email": "Некорректный email",
      "url": "Некорректный URL"
    },
    "invalid_type": "Неверный тип данных. Ожидался: {expected}",
    "invalid_value": "Недопустимое значение. Ожидается: {options}"
  }
}
```

**en.json** (merge-стратегия — сохраняет существующие переводы):

```json
{
  "Product": {
    "name": { "title": "Product name", "placeholder": "Enter name" }
  }
}
```

### Использование с next-intl

```tsx
import { FormI18nProvider } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl'

function ProductForm({ data, onSubmit }) {
  const t = useTranslations('formSchemas')
  const locale = useLocale()

  return (
    // setupZodErrorMap — глобальный перевод ошибок валидации
    <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
      <Form schema={ProductCreateFormSchema} initialValue={data} onSubmit={onSubmit}>
        <Form.Field.String name="name" /> {/* label из перевода */}
        <Form.Field.Select name="type" /> {/* options из перевода */}
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
      </Form>
    </FormI18nProvider>
  )
}
```

### Перевод ошибок валидации (v0.52.0+)

При включённом `setupZodErrorMap` ошибки валидации Zod автоматически переводятся:

```tsx
// Zod схема
const Schema = z.object({
  email: z.string().email(),      // → "Некорректный email"
  name: z.string().min(2),        // → "Минимум 2 символов"
  age: z.number().min(18),        // → "Минимум 18"
})

// Ошибки валидации переведены!
<FormI18nProvider t={t} locale={locale} setupZodErrorMap>
  <Form schema={Schema} ...>
    <Form.Field.String name="email" />
    <Form.Field.String name="name" />
    <Form.Field.Number name="age" />
  </Form>
</FormI18nProvider>
```

**Поддерживаемые ошибки Zod v4:**

| Код              | Ключ                                           | Параметры    |
| ---------------- | ---------------------------------------------- | ------------ |
| `too_small`      | `validation.too_small.{string\|number\|array}` | `{minimum}`  |
| `too_big`        | `validation.too_big.{string\|number\|array}`   | `{maximum}`  |
| `invalid_format` | `validation.invalid_format.{email\|url\|uuid}` | —            |
| `invalid_type`   | `validation.invalid_type`                      | `{expected}` |
| `invalid_value`  | `validation.invalid_value`                     | `{options}`  |
| `custom`         | `validation.custom`                            | `{message}`  |

### Хук useFormI18n

Для кастомных компонентов:

```tsx
import { getLocalizedValue, useFormI18n } from '@letar/forms'

function CustomField({ i18nKey, fallbackLabel }) {
  const { t, locale, enabled } = useFormI18n()

  const label = getLocalizedValue(t, i18nKey, 'title', fallbackLabel)

  return <Field label={label}>...</Field>
}
```

### Хук useLocalizedOptions

Для перевода enum options:

```tsx
import { useLocalizedOptions } from '@letar/forms'

function MySelect({ options }) {
  const localizedOptions = useLocalizedOptions(options)
  // options[].label переведены через i18nKey если есть FormI18nProvider

  return <Select options={localizedOptions} />
}
```

### Обратная совместимость

| Сценарий                  | Поведение                                 |
| ------------------------- | ----------------------------------------- |
| `i18n = false` (default)  | Без изменений — `i18nKey` не генерируется |
| Без `FormI18nProvider`    | Используются fallback значения из схемы   |
| `setupZodErrorMap: false` | Дефолтные сообщения Zod                   |
| Пустой перевод            | Используется fallback значение            |

---

## withUIMeta — интеграция с ZenStack (v0.48.0+)

ZenStack генерирует Zod схемы из `schema.zmodel`, но без UI метаданных. Используй `withUIMeta` для обогащения:

```tsx
import { ProductCreateInputSchema } from '@/generated/zod/objects/ProductCreateInput.schema'
import { withUIMeta, enumMeta, relationMeta } from '@letar/forms'

const ProductFormSchema = withUIMeta(ProductCreateInputSchema, {
  name: { title: 'Название', placeholder: 'Введите название' },
  price: { title: 'Цена', fieldType: 'currency', fieldProps: { currency: 'RUB' } },
  isActive: { title: 'Активен', fieldType: 'switch' },
})

<Form.FromSchema schema={ProductFormSchema} initialValue={data} onSubmit={save} />
```

**Вложенные объекты:**

```tsx
import { withUIMetaDeep } from '@letar/forms'

const UserFormSchema = withUIMetaDeep(UserCreateInputSchema, {
  firstName: { title: 'Имя' },
  address: {
    _meta: { title: 'Адрес' }, // meta для группы
    city: { title: 'Город' },
  },
})
```

**Хелперы:**

- `enumMeta({ title, labels: { VALUE: 'Label' } })` — enum с кастомными метками
- `relationMeta({ title, model, labelField })` — relation поля
- `textMeta()`, `numberMeta()`, `booleanMeta()`, `dateMeta()` — типизированные хелперы
- `commonMeta` — пресеты для id, createdAt, updatedAt

---

## MCP сервер для форм (@letar/form-mcp)

MCP сервер предоставляет AI-ассистентам программный доступ к документации форм-экосистемы.

**Локальная конфигурация** уже в `.mcp.json`. **npm пакет** для внешних пользователей: `@letar/form-mcp`.

### Tools

| Tool                | Описание                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `list_fields`       | Список 40+ типов полей с фильтром по категории                                                       |
| `get_field_props`   | Пропсы и документация конкретного поля                                                               |
| `get_field_example` | Код-пример использования поля                                                                        |
| `get_form_pattern`  | Паттерны: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action |
| `get_directives`    | Описание @form.\* директив zenstack-form-plugin                                                      |
| `generate_form`     | Генерация кода формы по спецификации полей                                                           |

### Resources

Документация доступна через `form-docs://` URI: fields, form-level, schema-generation, offline, i18n, zenstack, api-reference.

### Prompts

- `create-form` — шаблон генерации CRUD формы
- `add-field` — добавление поля к существующей форме
- `migrate-form` — миграция с RHF/Formik/Conform

Подробнее: `libs/form-mcp/README.md`

---

**Последнее обновление:** 2026-03-31
