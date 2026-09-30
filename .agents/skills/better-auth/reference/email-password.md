# Email/Password Authentication

Аутентификация по email и паролю в Better Auth.

---

## Включение

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,

    // Требовать подтверждение email
    requireEmailVerification: true,

    // Настройки пароля
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
})
```

---

## Регистрация (Sign Up)

### Клиентский компонент

```typescript
'use client'

import { signUp } from '@/lib/auth-client'
import { useState } from 'react'

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const { data, error } = await signUp.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      callbackURL: '/dashboard',
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Успешная регистрация
    // Если requireEmailVerification: true — редирект на страницу подтверждения
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Имя" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Пароль" required />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Загрузка...' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}
```

### С @letar/forms

```typescript
'use client'

import { signUp } from '@/lib/auth-client'
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
import { z } from 'zod/v4'

const signUpSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
})

export function SignUpForm() {
  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onChange: signUpSchema },
    onSubmit: async ({ value }) => {
      const { error } = await signUp.email({
        ...value,
        callbackURL: '/dashboard',
      })

      if (error) {
        form.setErrorMap({ onSubmit: error.message })
      }
    },
  })

  return (
    <form.Form>
      <FormGroup>
        <form.AppField name="name">
          {(field) => <ChakraFormField field={field} label="Имя" />}
        </form.AppField>

        <form.AppField name="email">
          {(field) => <ChakraFormField field={field} label="Email" type="email" />}
        </form.AppField>

        <form.AppField name="password">
          {(field) => <ChakraFormField field={field} label="Пароль" type="password" />}
        </form.AppField>
      </FormGroup>

      <form.SubmitButton>Зарегистрироваться</form.SubmitButton>
    </form.Form>
  )
}
```

---

## Вход (Sign In)

```typescript
'use client'

import { signIn } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function SignInForm() {
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { data, error } = await signIn.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      callbackURL: '/dashboard',
    })

    if (error) {
      alert(error.message)
      return
    }

    // Успешный вход — редирект
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Пароль" required />
      <button type="submit">Войти</button>
    </form>
  )
}
```

---

## Подтверждение Email

### Отправка письма

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Настройка отправки email
  emailVerification: {
    sendVerificationEmail: async (user, url, token) => {
      await sendEmail({
        to: user.email,
        subject: 'Подтвердите email',
        html: `
          <h1>Подтверждение email</h1>
          <p>Нажмите на ссылку для подтверждения:</p>
          <a href="${url}">Подтвердить email</a>
        `,
      })
    },

    // Время жизни токена (секунды)
    expiresIn: 60 * 60, // 1 час
  },
})
```

### PIN-верификация (6-значный код)

Альтернатива ссылкам — отправка PIN-кода:

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendVerificationEmail: async (user, url, token) => {
      // Генерируем 6-значный код из токена
      const pin = token.slice(0, 6).toUpperCase()

      await sendEmail({
        to: user.email,
        subject: 'Код подтверждения',
        html: `
          <h1>Ваш код подтверждения</h1>
          <p style="font-size: 24px; font-weight: bold;">${pin}</p>
          <p>Код действителен 1 час.</p>
        `,
      })
    },
  },
})
```

### Форма ввода PIN

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { PinInput } from '@chakra-ui/react'

export function VerifyPinForm({ email }: { email: string }) {
  async function handleComplete(pin: string) {
    const { error } = await authClient.verifyEmail({
      token: pin,
    })

    if (error) {
      alert('Неверный код')
      return
    }

    // Email подтверждён
    window.location.href = '/dashboard'
  }

  return (
    <div>
      <h2>Введите код из email</h2>
      <PinInput.Root onValueComplete={(e) => handleComplete(e.valueAsString)}>
        <PinInput.Control>
          {[0, 1, 2, 3, 4, 5].map((i) => <PinInput.Input key={i} index={i} />)}
        </PinInput.Control>
      </PinInput.Root>
    </div>
  )
}
```

---

## Сброс пароля

### Конфигурация

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,

    // Настройка сброса пароля
    sendResetPasswordEmail: async (user, url, token) => {
      await sendEmail({
        to: user.email,
        subject: 'Сброс пароля',
        html: `
          <h1>Сброс пароля</h1>
          <p>Нажмите на ссылку для сброса пароля:</p>
          <a href="${url}">Сбросить пароль</a>
        `,
      })
    },
  },
})
```

### Запрос сброса

```typescript
'use client'

import { authClient } from '@/lib/auth-client'

export function ForgotPasswordForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { error } = await authClient.forgetPassword({
      email: formData.get('email') as string,
      redirectTo: '/reset-password',
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Письмо отправлено!')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Отправить ссылку</button>
    </form>
  )
}
```

### Установка нового пароля

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { useSearchParams } from 'next/navigation'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { error } = await authClient.resetPassword({
      token: token!,
      newPassword: formData.get('password') as string,
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Пароль изменён!')
    window.location.href = '/sign-in'
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="password" type="password" placeholder="Новый пароль" required />
      <input name="confirm" type="password" placeholder="Подтвердите пароль" required />
      <button type="submit">Установить пароль</button>
    </form>
  )
}
```

---

## Смена пароля (авторизованный)

```typescript
'use client'

import { authClient } from '@/lib/auth-client'

export function ChangePasswordForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const { error } = await authClient.changePassword({
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Пароль изменён!')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="currentPassword" type="password" placeholder="Текущий пароль" required />
      <input name="newPassword" type="password" placeholder="Новый пароль" required />
      <button type="submit">Изменить пароль</button>
    </form>
  )
}
```

---

## Rate Limiting

```typescript
export const auth = betterAuth({
  rateLimit: {
    // Лимит на вход
    signIn: {
      window: 60, // 60 секунд
      max: 5, // Максимум 5 попыток
    },

    // Лимит на регистрацию
    signUp: {
      window: 60 * 60, // 1 час
      max: 3, // 3 регистрации
    },

    // Лимит на сброс пароля
    forgetPassword: {
      window: 60 * 60, // 1 час
      max: 3, // 3 запроса
    },
  },
})
```

---

## Валидация пароля

### Кастомная валидация

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,

    password: {
      // Кастомная проверка сложности
      validate: (password) => {
        if (password.length < 8) {
          return { valid: false, message: 'Минимум 8 символов' }
        }
        if (!/[A-Z]/.test(password)) {
          return { valid: false, message: 'Нужна хотя бы одна заглавная буква' }
        }
        if (!/[0-9]/.test(password)) {
          return { valid: false, message: 'Нужна хотя бы одна цифра' }
        }
        return { valid: true }
      },
    },
  },
})
```

### Zod v4 схема для клиента

```typescript
import { z } from 'zod/v4'

export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/[A-Z]/, 'Нужна хотя бы одна заглавная буква')
  .regex(/[0-9]/, 'Нужна хотя бы одна цифра')
  .regex(/[!@#$%^&*]/, 'Нужен хотя бы один спецсимвол')
```

---

## См. также

- [oauth-providers.md](oauth-providers.md) — OAuth вход
- [2fa-plugin.md](2fa-plugin.md) — Двухфакторная аутентификация
- [security-best-practices.md](security-best-practices.md) — Безопасность
