# Server Error Mapping

Утилита `mapServerErrors()` автоматически маппит серверные ошибки на поля формы.

## Проблема

Каждый проект пишет обработку серверных ошибок вручную:

```tsx
// ❌ Ручной маппинг в каждой форме
const result = await createUser(value)
if (result.error === 'EMAIL_EXISTS') {
  setError('email', 'Этот email уже зарегистрирован')
} else if (result.error === 'VALIDATION_ERROR') {
  toaster.error({ title: 'Ошибка валидации' })
}
```

## Решение

```tsx
import { mapServerErrors, applyServerErrors } from '@letar/forms'

// ✅ Одна утилита для всех форматов
<Form schema={UserSchema} onSubmit={async ({ value }) => {
  try {
    await createUser(value)
  } catch (error) {
    const mapped = mapServerErrors(error, {
      fieldMap: {
        email: { field: 'email', message: 'Этот email уже зарегистрирован' },
      },
    })
    applyServerErrors(form, mapped)
  }
}}>
```

## Поддерживаемые форматы

### Prisma

```typescript
// P2002 (unique constraint) → маппинг meta.target на поле
{ code: 'P2002', meta: { target: ['email'] } }
// → fieldErrors: [{ field: 'email', message: 'email уже существует' }]

// P2002 (composite) → первое поле из target
{ code: 'P2002', meta: { target: ['organizationId', 'name'] } }
// → fieldErrors: [{ field: 'organizationId', message: 'Комбинация organizationId + name уже существует' }]

// P2003 (foreign key) → field_name
{ code: 'P2003', meta: { field_name: 'categoryId' } }
// → fieldErrors: [{ field: 'categoryId', message: 'Связанная запись не найдена' }]

// P2025 (not found) → глобальная ошибка
{ code: 'P2025' }
// → formErrors: ['Запись не найдена']

// P2014 (relation violation) → глобальная
{ code: 'P2014' }
// → formErrors: ['Невозможно удалить — есть связанные записи']
```

### ZenStack

```typescript
// Нарушение access policy
{ reason: 'rejected-by-policy' }
// → formErrors: ['Нет доступа для выполнения этой операции']

// cannot-read-back (операция прошла, но результат недоступен)
{ reason: 'rejected-by-policy', rejectedByPolicyReason: 'cannot-read-back' }
// → formErrors: ['Операция выполнена, но результат недоступен...']

// db-query-error с Prisma кодом → делегация Prisma парсеру
{ reason: 'db-query-error', code: 'P2002', meta: { target: ['email'] } }
// → fieldErrors: [{ field: 'email', message: 'email уже существует' }]
```

### Zod v4 flatten

```typescript
// Стандартный flatten() формат
{ formErrors: ['Пароли не совпадают'], fieldErrors: { email: ['Некорректный'] } }
// → formErrors: ['Пароли не совпадают'], fieldErrors: [{ field: 'email', message: 'Некорректный' }]
```

### ActionResult

```typescript
// Строковая ошибка
{ success: false, error: 'Пользователь уже существует' }
// → formErrors: ['Пользователь уже существует']

// Вложенный Zod flatten
{ success: false, error: { fieldErrors: { name: ['Обязательное'] }, formErrors: [] } }
// → fieldErrors: [{ field: 'name', message: 'Обязательное' }]
```

## API

### mapServerErrors(error, config?)

```typescript
const mapped = mapServerErrors(error, {
  // Кастомный маппинг constraint → поле
  fieldMap: {
    email: { field: 'email', message: 'Email уже зарегистрирован' },
    organizationId_name: { field: 'name', message: 'Название занято' },
  },
  // Формат (по умолчанию auto)
  format: 'auto' | 'prisma' | 'zenstack' | 'zod' | 'action-result',
  // Locale для встроенных сообщений
  locale: 'ru' | 'en',
  // Fallback сообщение
  defaultMessage: 'Произошла ошибка',
})

// Результат: MappedServerErrors
mapped.fieldErrors // [{ field: 'email', message: '...' }]
mapped.formErrors // ['Глобальная ошибка']
```

### applyServerErrors(form, mapped)

```typescript
// Применяет ошибки к TanStack Form инстансу
applyServerErrors(form, mapped)
// fieldErrors → form.setFieldMeta(field, ...)
// formErrors → form.setErrorMap({ onSubmit: '...' })
```

## fieldMap — кастомный маппинг

Ключи fieldMap:

- Имя поля (`'email'`) — маппит P2002 с `meta.target: ['email']`
- Составной ключ (`'organizationId_name'`) — маппит P2002 с `meta.target: ['organizationId', 'name']`
- Имя FK (`'categoryId'`) — маппит P2003 с `meta.field_name: 'categoryId'`

```typescript
const config = {
  fieldMap: {
    // P2002: email unique → поле email
    email: { field: 'email', message: 'Этот email уже зарегистрирован' },
    // P2002: composite unique → поле name
    organizationId_name: { field: 'name', message: 'Такое название уже занято' },
    // P2003: FK categoryId → поле categoryId
    categoryId: { field: 'categoryId', message: 'Выберите существующую категорию' },
  },
}
```

## Импорт

```typescript
// Из основного пакета
import { applyServerErrors, mapServerErrors } from '@letar/forms'

// Или из subpath (tree-shakeable)
import { applyServerErrors, mapServerErrors } from '@letar/forms/server-errors'

// Отдельные парсеры (для кастомных пайплайнов)
import { parsePrismaError, parseZenStackError } from '@letar/forms/server-errors'
```
