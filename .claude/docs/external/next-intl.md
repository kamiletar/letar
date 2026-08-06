# next-intl v4 — Документация

> Пакет: `next-intl` | Docs: https://next-intl.dev
> Интернационализация для Next.js App Router

## Быстрый старт — структура файлов

```
src
├── app
│   └── [locale]
│       ├── layout.tsx
│       ├── page.tsx
│       └── ...
├── i18n
│   ├── routing.ts      # defineRouting — конфиг роутинга
│   ├── navigation.ts   # createNavigation — Link, useRouter, etc.
│   └── request.ts      # getRequestConfig — загрузка сообщений
└── messages
    ├── ru.json
    └── en.json
```

---

## routing.ts — defineRouting

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Поддерживаемые локали
  locales: ['ru', 'en'],

  // Локаль по умолчанию
  defaultLocale: 'ru',

  // Стратегия префикса: 'always' | 'as-needed' | 'never'
  localePrefix: 'as-needed', // /ru/about → /about (дефолтная без префикса)

  // Локализованные пути (опционально)
  pathnames: {
    '/': '/',
    '/about': {
      ru: '/o-nas',
      en: '/about',
    },
    '/blog/[slug]': {
      ru: '/blog/[slug]',
      en: '/blog/[slug]',
    },
  },
})
```

---

## navigation.ts — createNavigation

```typescript
// src/i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Локаль-aware обёртки над Next.js навигацией
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

---

## request.ts — getRequestConfig

```typescript
// src/i18n/request.ts
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

---

## middleware (proxy.ts)

```typescript
// proxy.ts (или middleware.ts до Next.js 16)
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
```

---

## Переводы — messages файлы

```json
// messages/ru.json
{
  "HomePage": {
    "title": "Добро пожаловать",
    "welcome": "Привет, {name}!"
  },
  "Navigation": {
    "home": "Главная",
    "about": "О нас"
  },
  "Products": {
    "count": "{count, plural, one {# товар} few {# товара} many {# товаров} other {# товара}}"
  }
}
```

---

## useTranslations — Client и Server Components

```tsx
// ✅ Client Component
import { useTranslations } from 'next-intl'

export function HomePage() {
  const t = useTranslations('HomePage')
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome', { name: 'Иван' })}</p>
    </div>
  )
}

// ✅ Async Server Component
import { getTranslations } from 'next-intl/server'

export default async function AboutPage() {
  const t = await getTranslations('About')
  return <h1>{t('title')}</h1>
}

// ✅ Pluralization
const t = useTranslations('Products')
t('count', { count: 5 }) // "5 товаров"
```

---

## Серверные API

```tsx
// getTranslations — Server Components, Server Actions
import { getFormatter, getLocale, getTimeZone, getTranslations } from 'next-intl/server'

// Server Action с переводами
async function submitForm(formData: FormData) {
  'use server'
  const t = await getTranslations('Form')
  const locale = await getLocale()
  if (!formData.get('email')) {
    return { error: t('emailRequired') }
  }
  return { success: t('submitSuccess') }
}

// generateMetadata с переводами
export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  return {
    title: t('title'),
    description: t('description'),
  }
}
```

---

## Навигация

```tsx
'use client'
import { Link, useRouter, usePathname } from '@/i18n/navigation'

// Link — локализованный
<Link href="/about">О нас</Link>
<Link href="/" locale="en">Switch to English</Link>
<Link href={{ pathname: '/users', query: { sort: 'name' } }}>Пользователи</Link>

// useRouter — программная навигация
const router = useRouter()
router.push('/about')
router.replace('/about', { locale: 'en' }) // переключить язык

// usePathname — текущий путь без префикса локали
const pathname = usePathname()
// На /ru/o-nas → вернёт /about (внутренний путь)
```

---

## generateStaticParams

```typescript
// app/[locale]/layout.tsx
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
```

---

## TypeScript — типобезопасность

```typescript
// src/global.d.ts — типизация ключей сообщений
import ru from '../messages/ru.json'

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof ru
    Locale: (typeof routing.locales)[number]
  }
}

// Теперь TypeScript знает все ключи переводов
const t = useTranslations('HomePage')
t('title') // ✅ известный ключ
t('unknown') // ❌ ошибка TypeScript
```

---

## Route Handler с локалью

```typescript
// app/api/route.ts
import { routing } from '@/i18n/routing'
import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale')

  if (!hasLocale(routing.locales, locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const t = await getTranslations({ locale, namespace: 'API' })
  return NextResponse.json({ message: t('greeting') })
}
```

---

## Паттерны в letar

```tsx
// Типовой layout с провайдером
// app/[locale]/layout.tsx
import { routing } from '@/i18n/routing'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
} // Типовой компонент с переводами

'use client'
import { useTranslations } from 'next-intl'

export function ProductCard({ product }) {
  const t = useTranslations('ProductCard')
  return (
    <div>
      <h2>{product.name}</h2>
      <p>{t('price', { price: product.price })}</p>
      <button>{t('addToCart')}</button>
    </div>
  )
}
```

---

## Ссылки

- Docs: https://next-intl.dev/docs/getting-started/app-router
- GitHub: https://github.com/amannn/next-intl
