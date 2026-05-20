# TanStack Form v1 — Документация

> Источник: https://tanstack.com/form/latest/docs/overview\
> **Важно:** В letar используется через `@letar/forms` — НЕ импортировать `@tanstack/react-form` напрямую!

## Обзор

TanStack Form — headless библиотека управления формами с:

- Field-level реактивностью (ре-рендерится только изменённое поле)
- Type-safe API через TypeScript
- Встроенной валидацией (sync/async, onChange/onBlur/onSubmit)
- Framework adapters: React, Vue, Angular, Solid, Lit

## Базовое использование (React)

```tsx
import { useForm } from '@tanstack/react-form'

const form = useForm({
  defaultValues: {
    firstName: '',
    lastName: '',
  },
  onSubmit: async ({ value }) => {
    console.log(value)
  },
})

return (
  <form
    onSubmit={(e) => {
      e.preventDefault()
      form.handleSubmit()
    }}
  >
    <form.Field
      name="firstName"
      validators={{
        onChange: ({ value }) => (!value ? 'Required' : value.length < 3 ? 'Min 3 chars' : undefined),
      }}
    >
      {(field) => (
        <>
          <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
          {!field.state.meta.isValid && <em>{field.state.meta.errors.join(', ')}</em>}
        </>
      )}
    </form.Field>
    <button type="submit">Submit</button>
  </form>
)
```

## Валидация

### Когда запускается

- `onChange` — при каждом изменении поля
- `onBlur` — при потере фокуса
- `onSubmit` — при отправке формы
- `onMount` — при монтировании

```tsx
<form.Field
  name="age"
  validators={{
    onChange: ({ value }) =>
      value < 13 ? 'Must be 13+' : undefined,
    onBlur: ({ value }) =>
      value > 120 ? 'Invalid age' : undefined,
    onChangeAsync: async ({ value }) => {
      // Async валидация с debounce
      const taken = await checkEmail(value)
      return taken ? 'Email taken' : undefined
    },
    onChangeAsyncDebounceMs: 500,
  }}
>
```

### Zod интеграция

```tsx
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod/v4'

const form = useForm({
  defaultValues: { email: '' },
  validatorAdapter: zodValidator(),
})

<form.Field
  name="email"
  validators={{
    onChange: z.string().email(),
  }}
>
```

## Состояние формы

```tsx
// Subscribe для чтения состояния без лишних рендеров
<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isValid]}>
  {([canSubmit, isSubmitting, isValid]) => (
    <button type="submit" disabled={!canSubmit}>
      {isSubmitting ? '...' : 'Submit'}
    </button>
  )}
</form.Subscribe>
```

### Ключевые флаги состояния

| Флаг           | Описание                                  |
| -------------- | ----------------------------------------- |
| `canSubmit`    | false если форма невалидна И была touched |
| `isSubmitting` | true во время async onSubmit              |
| `isValid`      | все поля валидны                          |
| `isDirty`      | значения изменились от defaultValues      |
| `isTouched`    | хотя бы одно поле touched                 |

### Состояние поля (field.state.meta)

| Флаг           | Описание                |
| -------------- | ----------------------- |
| `errors`       | массив ошибок валидации |
| `isValid`      | поле валидно            |
| `isTouched`    | поле было focused       |
| `isDirty`      | значение изменилось     |
| `isValidating` | идёт async валидация    |

## Массивы (Array Fields)

```tsx
const form = useForm({
  defaultValues: {
    people: [{ name: '', age: 0 }],
  },
})

<form.Field name="people" mode="array">
  {(field) => (
    <>
      {field.state.value.map((_, index) => (
        <form.Field key={index} name={`people[${index}].name`}>
          {(subField) => (
            <input
              value={subField.state.value}
              onChange={(e) => subField.handleChange(e.target.value)}
            />
          )}
        </form.Field>
      ))}
      <button
        type="button"
        onClick={() => field.pushValue({ name: '', age: 0 })}
      >
        Add Person
      </button>
    </>
  )}
</form.Field>
```

## Программное управление

```tsx
// Установить значение поля
form.setFieldValue('name', 'John')

// Установить ошибку вручную
form.setFieldMeta('email', (meta) => ({
  ...meta,
  errors: ['Email already taken'],
}))

// Сброс формы
form.reset()

// Полный API
form.handleSubmit()
form.validateField('name', 'change')
form.getFieldValue('email')
form.setFieldMeta(...)
```

## В letar — @letar/forms

В монорепо TanStack Form используется через `@letar/forms`:

```tsx
// ✅ Правильно — через @letar/forms
import { Form } from '@letar/forms'
import { useAppForm } from '@letar/forms'

// ❌ НИКОГДА не импортировать напрямую
import { useForm } from '@tanstack/react-form'
```

### createForm — app-specific инстанс

```tsx
import { createForm } from '@letar/forms'

export const MyAppForm = createForm({
  extraSelects: lazySelects({ Status: () => import('./selects/status') }),
  extraComboboxes: lazyComboboxes({ User: () => import('./comboboxes/user') }),
})
```

### Доступ к form/field API внутри @letar/forms

```tsx
import { useFieldContext, useFormContext } from '@letar/forms'

// Внутри кастомного компонента формы
const form = useFormContext() // TanStack FormApi
const field = useFieldContext<string>() // TanStack FieldApi
```

## Ссылки

- Docs: https://tanstack.com/form/latest/docs/overview
- Validation: https://tanstack.com/form/latest/docs/framework/react/guides/validation
- GitHub: https://github.com/TanStack/form
