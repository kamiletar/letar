# Optimization

Оптимизация производительности Next.js 16 приложений.

---

## Обзор оптимизаций

| Область        | Инструмент                             |
| -------------- | -------------------------------------- |
| Изображения    | `next/image`                           |
| Шрифты         | `next/font`                            |
| Scripts        | `next/script`                          |
| Code Splitting | `dynamic()`, `lazy()`                  |
| Bundle Size    | Tree shaking, `optimizePackageImports` |

---

## next/image

### Базовое использование

```typescript
import Image from 'next/image'

// Локальное изображение
import productImage from '@/images/product.jpg'

export function ProductCard() {
  return (
    <Image
      src={productImage}
      alt="Название товара"
      placeholder="blur" // Автоматический blur placeholder
    />
  )
}

// Внешнее изображение
export function ExternalImage() {
  return (
    <Image
      src="https://example.com/image.jpg"
      alt="Description"
      width={800}
      height={600}
    />
  )
}
```

### fill + sizes (адаптивные)

```typescript
export function ResponsiveImage() {
  return (
    <Box position="relative" aspectRatio="16/9">
      <Image
        src={imageUrl}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        style={{ objectFit: 'cover' }}
      />
    </Box>
  )
}
```

### priority (LCP)

```typescript
// Для изображений выше fold (LCP)
<Image
  src={heroImage}
  alt="Hero"
  priority // Загружается сразу, без lazy loading
/>
```

### Конфигурация

```javascript
// next.config.js
const nextConfig = {
  images: {
    // Качество по умолчанию
    qualities: [25, 50, 75, 90],

    // Внешние домены
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.example.com',
      },
    ],

    // Кастомные размеры
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Форматы
    formats: ['image/avif', 'image/webp'],
  },
}
```

---

## next/font

### Google Fonts

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### Использование в CSS

```css
/* Через CSS variable */
body {
  font-family: var(--font-inter);
}

code {
  font-family: var(--font-roboto-mono);
}
```

### Локальные шрифты

```typescript
import localFont from 'next/font/local'

const myFont = localFont({
  src: [
    {
      path: './fonts/MyFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/MyFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-my-font',
})
```

---

## next/script

### Стратегии загрузки

```typescript
import Script from 'next/script'

// afterInteractive (по умолчанию) — после hydration
<Script src="https://analytics.example.com/script.js" />

// beforeInteractive — до hydration (critical)
<Script
  src="https://polyfill.io/v3/polyfill.min.js"
  strategy="beforeInteractive"
/>

// lazyOnload — после load события
<Script
  src="https://chat-widget.example.com/widget.js"
  strategy="lazyOnload"
/>

// worker — в Web Worker (experimental)
<Script
  src="https://analytics.example.com/script.js"
  strategy="worker"
/>
```

### Inline Script

```typescript
<Script id="analytics-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  `}
</Script>
```

### onLoad callback

```typescript
<Script
  src="https://maps.googleapis.com/maps/api/js"
  onLoad={() => {
    console.log('Google Maps loaded')
  }}
/>
```

---

## Code Splitting

### Dynamic Import

```typescript
import dynamic from 'next/dynamic'

// Компонент загружается только когда нужен
const DynamicChart = dynamic(() => import('@/components/chart'), {
  loading: () => <Skeleton height="300px" />,
})

export function Dashboard() {
  return (
    <Box>
      <Stats />
      <DynamicChart /> {/* Загружается отдельным chunk'ом */}
    </Box>
  )
}
```

### Отключение SSR

```typescript
// Для компонентов которые не работают на сервере
const NoSSRComponent = dynamic(() => import('@/components/browser-only'), { ssr: false })
```

### React.lazy + Suspense

```typescript
import { lazy, Suspense } from 'react'

const LightboxViewer = lazy(() =>
  import('./lightbox-viewer').then((mod) => ({
    default: mod.LightboxViewer,
  }))
)

export function Gallery({ images }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <ImageGrid images={images} onOpen={() => setIsOpen(true)} />

      {isOpen && (
        <Suspense fallback={<Spinner />}>
          <LightboxViewer images={images} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
```

---

## Bundle Optimization

### optimizePackageImports

```javascript
// next.config.js
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@chakra-ui/react',
      'react-icons',
      'lucide-react',
      '@tanstack/react-query',
      'date-fns',
      'lodash',
    ],
  },
}
```

До: `import { Box } from '@chakra-ui/react'` → весь пакет
После: `import { Box } from '@chakra-ui/react'` → только Box

### Tree Shaking

```typescript
// ✅ Named imports (tree-shakeable)
import { format, parseISO } from 'date-fns'

// ❌ Default import (весь пакет)
import _ from 'lodash'

// ✅ Отдельные модули
import debounce from 'lodash/debounce'
```

### Bundle Analyzer

```bash
# Анализ bundle
ANALYZE=true nx build premium-rosstil
```

```javascript
// next.config.js
import withBundleAnalyzer from '@next/bundle-analyzer'

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withAnalyzer(nextConfig)
```

---

## Server Components

Основная оптимизация — максимум Server Components.

### Принципы

```typescript
// ✅ Server Component — 0 KB в client bundle
export default async function Page() {
  const data = await fetchData()
  return <View data={data} />
}

// ❌ Client Component — добавляет в bundle
'use client'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c + 1)}>{count}</button>
}
```

### Минимизация Client boundary

```typescript
// ❌ Вся страница Client
'use client'
export default function Page() {
  const [filter, setFilter] = useState('')
  // много кода...
}

// ✅ Только интерактивная часть
export default async function Page() {
  const data = await fetchData()
  return (
    <>
      <Header /> {/* Server */}
      <FilterControls /> {/* Client — маленький */}
      <ProductList data={data} /> {/* Server */}
    </>
  )
}
```

---

## Streaming

### loading.tsx

```typescript
// app/products/loading.tsx
export default function Loading() {
  return (
    <Grid columns={3} gap={4}>
      {[...Array(6)].map((_, i) => <Skeleton key={i} height="200px" borderRadius="md" />)}
    </Grid>
  )
}
```

### Suspense для частей

```typescript
export default function DashboardPage() {
  return (
    <Grid columns={2} gap={4}>
      {/* Быстрая часть */}
      <DashboardHeader />

      {/* Медленные части в Suspense */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </Grid>
  )
}
```

---

## Performance Checklist

### Build Time

- [ ] Server Components по умолчанию
- [ ] `'use client'` только для интерактивности
- [ ] `optimizePackageImports` для больших библиотек
- [ ] Dynamic imports для тяжёлых компонентов

### Images

- [ ] `next/image` для всех изображений
- [ ] `priority` для LCP изображений
- [ ] `sizes` для responsive изображений
- [ ] Правильные `remotePatterns`

### Fonts

- [ ] `next/font` для всех шрифтов
- [ ] `display: 'swap'`
- [ ] Только нужные subsets

### Scripts

- [ ] `strategy="lazyOnload"` для некритичных скриптов
- [ ] Analytics в `afterInteractive`

### Caching

- [ ] Static generation где возможно
- [ ] `generateStaticParams` для динамических страниц
- [ ] Правильный `revalidate`

### Bundle

- [ ] Проверить bundle size (`ANALYZE=true`)
- [ ] Удалить неиспользуемые зависимости
- [ ] Tree-shakeable импорты

---

## Метрики

### Core Web Vitals

| Метрика | Хорошо  | Что оптимизировать                     |
| ------- | ------- | -------------------------------------- |
| LCP     | < 2.5s  | `priority` изображения, streaming      |
| FID     | < 100ms | Меньше client JS, code splitting       |
| CLS     | < 0.1   | Placeholder для изображений, font swap |

### Измерение

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

---

## См. также

- [components.md](components.md) — Server vs Client Components
- [caching.md](caching.md) — Кэширование
- [configuration.md](configuration.md) — next.config.js
