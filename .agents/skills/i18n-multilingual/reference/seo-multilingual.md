# SEO Multilingual

## Metadata для локализации

```tsx
// app/[locale]/page.tsx
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords'),

    alternates: {
      canonical: `https://example.com/${locale}`,
      languages: {
        ru: 'https://example.com/ru',
        en: 'https://example.com/en',
        de: 'https://example.com/de',
        'x-default': 'https://example.com',
      },
    },

    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      locale: locale,
      alternateLocale: ['ru', 'en', 'de'].filter((l) => l !== locale),
    },
  }
}
```

## Hreflang теги

```tsx
// app/[locale]/layout.tsx
import { locales } from '@/i18n/config'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params

  const languages: Record<string, string> = {}

  for (const loc of locales) {
    languages[loc] = `https://example.com/${loc}`
  }
  languages['x-default'] = 'https://example.com'

  return {
    alternates: {
      canonical: `https://example.com/${locale}`,
      languages,
    },
  }
}
```

## Динамические страницы с переводами

```tsx
// app/[locale]/products/[id]/page.tsx
import { getTranslations } from 'next-intl/server'

interface Props {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'products' })

  // Загрузить данные продукта
  const product = await db.product.findUnique({
    where: { id },
    include: { translations: true },
  })

  // Найти перевод для текущей локали
  const translation = product?.translations.find((t) => t.locale === locale)
    || product?.translations.find((t) => t.locale === 'ru') // Fallback

  if (!product || !translation) {
    return { title: t('notFound') }
  }

  const baseUrl = 'https://example.com'

  // Генерация hreflang для всех доступных переводов
  const languages: Record<string, string> = {}
  for (const trans of product.translations) {
    languages[trans.locale] = `${baseUrl}/${trans.locale}/products/${id}`
  }
  languages['x-default'] = `${baseUrl}/products/${id}`

  return {
    title: `${translation.name} | ${t('brandName')}`,
    description: translation.description,

    alternates: {
      canonical: `${baseUrl}/${locale}/products/${id}`,
      languages,
    },

    openGraph: {
      title: translation.name,
      description: translation.description,
      images: product.images.map((img) => ({
        url: `${baseUrl}/api/images/${img.id}`,
        alt: translation.name,
      })),
      locale: locale,
    },
  }
}
```

## Sitemap для мультиязычности

```typescript
// app/sitemap.ts
import { defaultLocale, locales } from '@/i18n/config'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com'

  // Статические страницы
  const staticPages = ['', '/about', '/contact', '/products']

  const staticEntries = staticPages.flatMap((page) => {
    const languages: Record<string, string> = {}
    for (const locale of locales) {
      const path = locale === defaultLocale ? page : `/${locale}${page}`
      languages[locale] = `${baseUrl}${path}`
    }

    return {
      url: `${baseUrl}${page}`,
      lastModified: new Date(),
      alternates: { languages },
    }
  })

  // Динамические страницы (товары)
  const products = await db.product.findMany({
    where: { isActive: true },
    include: { translations: { select: { locale: true } } },
  })

  const productEntries = products.map((product) => {
    const languages: Record<string, string> = {}
    for (const trans of product.translations) {
      const path = trans.locale === defaultLocale
        ? `/products/${product.id}`
        : `/${trans.locale}/products/${product.id}`
      languages[trans.locale] = `${baseUrl}${path}`
    }

    return {
      url: `${baseUrl}/products/${product.id}`,
      lastModified: product.updatedAt,
      alternates: { languages },
    }
  })

  return [...staticEntries, ...productEntries]
}
```

## Структурированные данные (JSON-LD)

```tsx
// components/ProductJsonLd.tsx
interface ProductJsonLdProps {
  product: Product
  locale: string
  translation: ProductTranslation
}

export function ProductJsonLd({ product, locale, translation }: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: translation.name,
    description: translation.description,
    image: product.images.map((img) => `https://example.com/api/images/${img.id}`),
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: (product.price / 100).toFixed(2),
      priceCurrency: 'RUB',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://example.com/${locale}/products/${product.id}`,
    },
    inLanguage: locale,
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
```

## Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://example.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
```

## Каноникализация

```tsx
// Важно: canonical URL должен быть без дубликатов

// ✅ Правильно: один canonical для каждой страницы
alternates: {
  canonical: `https://example.com/${locale}/products/${id}`,
  languages: {
    'ru': 'https://example.com/ru/products/123',
    'en': 'https://example.com/en/products/123',
    'x-default': 'https://example.com/products/123'
  }
}

// ❌ Неправильно: разные URL указывают на один контент без hreflang
```

## Локализованные URL (slug)

```typescript
// Модель для локализованных slug
model Product {
  id            String   @id
  slug          String   @unique // Дефолтный slug (ru)
  translations  ProductTranslation[]
}

model ProductTranslation {
  id          String  @id
  productId   String
  product     Product @relation(...)
  locale      String
  name        String
  description String
  slug        String  // Локализованный slug

  @@unique([productId, locale])
  @@unique([locale, slug])
}
```

```tsx
// app/[locale]/products/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params

  // Найти продукт по локализованному slug
  const translation = await db.productTranslation.findUnique({
    where: { locale_slug: { locale, slug } },
    include: { product: true },
  })

  // ...
}
```

## Правила SEO для мультиязычности

- **MUST** добавлять hreflang для всех языковых версий
- **MUST** включать `x-default` для дефолтной версии
- **MUST** использовать абсолютные URL в hreflang
- **SHOULD** локализовать meta description и keywords
- **SHOULD** использовать локализованные slug для URL
- **NEVER** использовать автоматический перевод для SEO контента
- **NEVER** дублировать контент без hreflang связей
