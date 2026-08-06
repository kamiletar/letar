# @letar/validation-utils

Централизованные валидационные схемы для всех приложений монорепозитория.

## Установка

```bash
bun add @letar/validation-utils
```

## Использование

### Схемы паролей

```typescript
import { passwordSchema, strongPasswordSchema, withPasswordConfirmation } from '@letar/validation-utils'
import { z } from 'zod/v4'

// Базовая схема пароля (uppercase + lowercase + digit)
const LoginSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
})

// Усиленная схема пароля (+ спецсимвол)
const RegisterSchema = z.object({
  email: z.string().email(),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
})

// Добавление проверки подтверждения пароля
const RegisterWithConfirmation = withPasswordConfirmation(RegisterSchema)
```

### Общие схемы

```typescript
import { emailSchema, nameSchema, requiredCheckbox, tokenSchema } from '@letar/validation-utils'

const ProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
})

const ResetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
})

const AcceptTermsSchema = z.object({
  acceptOffer: requiredCheckbox('Необходимо принять условия договора-оферты'),
  acceptPrivacy: requiredCheckbox('Необходимо принять политику конфиденциальности'),
})
```

## API

### Схемы паролей

#### `passwordSchema`

Базовая схема валидации пароля.

**Требования:**

- Минимум 8 символов
- Минимум 1 заглавная буква
- Минимум 1 строчная буква
- Минимум 1 цифра

**Используется в:** premium-rosstil, imot

#### `strongPasswordSchema`

Усиленная схема валидации пароля с требованием спецсимвола.

**Требования:**

- Минимум 8 символов
- Минимум 1 заглавная буква
- Минимум 1 строчная буква
- Минимум 1 цифра
- Минимум 1 спецсимвол

**Используется в:** driving-school

#### `withPasswordConfirmation(schema, passwordField?, confirmPasswordField?)`

Хелпер для добавления проверки подтверждения пароля.

**Параметры:**

- `schema` - базовая схема объекта с полем password
- `passwordField` - название поля с паролем (по умолчанию 'password')
- `confirmPasswordField` - название поля подтверждения (по умолчанию 'confirmPassword')

**Возвращает:** схема с добавленной проверкой совпадения паролей

### Общие схемы

#### `emailSchema`

Схема валидации email. Используется во всех приложениях для полей email.

#### `nameSchema`

Схема валидации имени пользователя. Минимум 2 символа.

#### `tokenSchema`

Схема валидации токена (для сброса пароля, верификации и т.д.).

#### `requiredCheckbox(errorMessage)`

Схема для обязательного чекбокса (например, принятие оферты).

**Параметры:**

- `errorMessage` - сообщение об ошибке при невыбранном чекбоксе

## Миграция

### Было (driving-school)

```typescript
// register.schema.ts
import { z } from 'zod/v4'

export const PasswordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')
  .regex(/[^A-Za-z0-9]/, 'Пароль должен содержать хотя бы один спецсимвол')

export const RegisterSchema = z
  .object({
    email: z.email('Введите корректный email'),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .strip()
```

### Стало

```typescript
// register.schema.ts
import { emailSchema, strongPasswordSchema, withPasswordConfirmation } from '@letar/validation-utils'
import { z } from 'zod/v4'

export const RegisterSchema = withPasswordConfirmation(
  z.object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  }),
).strip()
```

## Версия

- **0.1.0** - Первый релиз с базовыми схемами валидации
