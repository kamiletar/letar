# Next-intl Setup

## Установка

```bash
bun add next-intl
```

## Конфигурация

```typescript
// i18n/config.ts
export const locales = ['ru', 'en', 'de'] as const
export const defaultLocale = 'ru' as const

export type Locale = (typeof locales)[number]

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
```

## Структура проекта

```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── products/
│       └── page.tsx
├── api/                    # API без локализации
└── layout.tsx              # Корневой layout

i18n/
├── config.ts
├── request.ts
└── routing.ts

messages/
├── ru.json
├── en.json
└── de.json
```

## Routing

```typescript
// i18n/routing.ts
import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // /ru не показывается для дефолтного
})

// Навигационные хелперы
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```

## Request config

```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Валидация локали
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Europe/Moscow',
    now: new Date(),
  }
})
```

## Next.js config

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl({
  // Остальная конфигурация Next.js
})
```

## Proxy (middleware замена)

```typescript
// proxy.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: [
    // Пропускаем API, статику и внутренние файлы Next.js
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
```

## Root Layout

```tsx
// app/layout.tsx
import { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
```

## Locale Layout

```tsx
// app/[locale]/layout.tsx
import { routing } from '@/i18n/routing'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Валидация локали
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Включить статическую генерацию для этой локали
  setRequestLocale(locale)

  // Загрузить сообщения
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

## Использование в Server Components

```tsx
// app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('home')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </main>
  )
}

// Metadata
export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}
```

## Использование в Client Components

```tsx
'use client'

import { useTranslations } from 'next-intl'

export function ProductCard() {
  const t = useTranslations('products')

  return (
    <div>
      <button>{t('addToCart')}</button>
    </div>
  )
}
```

## Language Switcher

```tsx
'use client'

import { type Locale, locales } from '@/i18n/config'
import { usePathname, useRouter } from '@/i18n/routing'
import { useLocale } from 'next-intl'

const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function handleChange(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <Select.Root value={[locale]} onValueChange={({ value }) => handleChange(value[0] as Locale)}>
      <Select.Trigger>
        <Select.ValueText>{LOCALE_NAMES[locale as Locale]}</Select.ValueText>
      </Select.Trigger>
      <Select.Content>
        {locales.map((loc) => (
          <Select.Item key={loc} item={loc}>
            {LOCALE_NAMES[loc]}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}
```

## Static Generation

```tsx
// Для каждой страницы с динамическим locale
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// В layout и каждой page
setRequestLocale(locale)
```

## Правила

- **MUST** вызывать `setRequestLocale` в каждой странице для static generation
- **MUST** использовать `Link` из `@/i18n/routing` вместо `next/link`
- **SHOULD** использовать `generateStaticParams` для предгенерации всех локалей
- **NEVER** использовать `middleware.ts` — заменён на `proxy.ts`
