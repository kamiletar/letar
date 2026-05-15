# Metadata & SEO

SEO оптимизация и Metadata API в Next.js 16.

---

## Metadata API

### Static Metadata

```typescript
// app/products/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Каталог товаров',
  description: 'Широкий выбор качественных товаров по доступным ценам',
  keywords: ['товары', 'каталог', 'интернет-магазин'],
}

export default function ProductsPage() {
  return <ProductList />
}
```

### Dynamic Metadata

```typescript
// app/products/[id]/page.tsx
import { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Товар не найден',
    }
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.imageUrl],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  // ...
}
```

### Template

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: {
    template: '%s | Premium Rosstil',
    default: 'Premium Rosstil — Интернет-магазин',
  },
  description: 'Качественные товары по доступным ценам',
}

// app/products/page.tsx
export const metadata: Metadata = {
  title: 'Каталог', // → "Каталог | Premium Rosstil"
}
```

---

## Open Graph

### Базовая настройка

```typescript
export const metadata: Metadata = {
  title: 'Название страницы',
  description: 'Описание страницы',
  openGraph: {
    title: 'OG Title',
    description: 'OG Description',
    url: 'https://example.com/page',
    siteName: 'Premium Rosstil',
    locale: 'ru_RU',
    type: 'website',
    images: [
      {
        url: 'https://example.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Описание изображения',
      },
    ],
  },
}
```

### Для товаров (product)

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      type: 'website', // или 'product' для rich snippets
      images: product.images.map((img) => ({
        url: img.url,
        width: 1200,
        height: 630,
        alt: product.name,
      })),
    },
  }
}
```

### Twitter Cards

```typescript
export const metadata: Metadata = {
  twitter: {
    card: 'summary_large_image',
    title: 'Название',
    description: 'Описание',
    creator: '@username',
    images: ['https://example.com/twitter-image.jpg'],
  },
}
```

---

## OG Images (Dynamic)

### Route Handler

```typescript
// app/api/og/[id]/route.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const product = await getProduct(id)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: 50,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {product.name}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
```

### Использование в metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params

  return {
    openGraph: {
      images: [`/api/og/${id}`],
    },
  }
}
```

### opengraph-image.tsx

```typescript
// app/products/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Product Image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)

  return new ImageResponse(
    (
      <div style={{/* styles */}}>
        <h1>{product.name}</h1>
        <p>{product.price}</p>
      </div>
    ),
    { ...size },
  )
}
```

---

## Sitemap

### Статический sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://example.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://example.com/products',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}
```

### Динамический sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com'

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Динамические страницы
  const products = await db.product.findMany({
    select: { id: true, updatedAt: true },
    where: { isPublished: true },
  })

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...productPages]
}
```

### Множественные sitemaps

```typescript
// app/sitemap.ts
export async function generateSitemaps() {
  // Возвращаем массив id для больших сайтов
  return [{ id: 0 }, { id: 1 }, { id: 2 }]
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const start = id * 50000
  const end = start + 50000

  const products = await db.product.findMany({
    skip: start,
    take: 50000,
    select: { id: true, updatedAt: true },
  })

  return products.map((product) => ({
    url: `https://example.com/products/${product.id}`,
    lastModified: product.updatedAt,
  }))
}
```

---

## Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/private/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

---

## JSON-LD (Structured Data)

### Product Schema

```typescript
// app/products/[id]/page.tsx
export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((img) => img.url),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'RUB',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductView product={product} />
    </>
  )
}
```

### Organization Schema

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Premium Rosstil',
    url: 'https://premium-rosstil.ru',
    logo: 'https://premium-rosstil.ru/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+7-999-123-4567',
      contactType: 'customer service',
    },
  }

  return (
    <html>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
```

---

## generateStaticParams

Статическая генерация динамических страниц для SEO.

```typescript
// app/products/[id]/page.tsx

// Генерация всех статических путей
export async function generateStaticParams() {
  const products = await db.product.findMany({
    select: { id: true },
    where: { isPublished: true },
  })

  return products.map((product) => ({
    id: product.id,
  }))
}

// ISR для новых товаров
export const dynamicParams = true // Разрешить не сгенерированные пути
export const revalidate = 3600 // Revalidate каждый час

export default async function ProductPage({ params }) {
  // ...
}
```

---

## Canonical URLs

```typescript
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://example.com/products',
    languages: {
      'ru-RU': 'https://example.com/ru/products',
      'en-US': 'https://example.com/en/products',
    },
  },
}
```

---

## Icons

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
    ],
  },
}
```

Или файловые конвенции:

```
app/
├── favicon.ico
├── icon.png          # или icon.svg
├── apple-icon.png
└── opengraph-image.png
```

---

## SEO Checklist

### Metadata

- [ ] `title` и `description` на каждой странице
- [ ] Template для title в layout
- [ ] Dynamic metadata для динамических страниц

### Open Graph

- [ ] OG title, description, image
- [ ] Правильные размеры (1200x630)
- [ ] Twitter cards

### Structured Data

- [ ] JSON-LD для товаров
- [ ] Organization schema
- [ ] Breadcrumbs schema

### Technical

- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Canonical URLs
- [ ] hreflang для i18n
- [ ] generateStaticParams для SSG

---

## См. также

- [app-router.md](app-router.md) — Структура роутов
- [caching.md](caching.md) — Static generation
- [optimization.md](optimization.md) — Core Web Vitals
