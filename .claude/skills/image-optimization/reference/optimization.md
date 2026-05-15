# Image Optimization

## Рекомендуемые размеры

| Контекст       | Размер    | Формат |
| -------------- | --------- | ------ |
| Thumbnail      | 400x300   | WebP   |
| Product card   | 600x800   | WebP   |
| Product detail | 1200x1600 | WebP   |
| Hero banner    | 1920x600  | WebP   |
| Avatar         | 200x200   | WebP   |
| OG Image       | 1200x630  | JPEG   |

## Качество по типу

```typescript
const QUALITY_PRESETS = {
  thumbnail: 75,
  product: 85,
  hero: 90,
  avatar: 80,
}
```

## Lazy loading стратегия

```tsx
// Первые 4 товара — eager
// Остальные — lazy
{
  products.map((product, index) => (
    <Image
      key={product.id}
      src={`/api/images/${product.imageId}`}
      alt={product.name}
      width={400}
      height={300}
      loading={index < 4 ? 'eager' : 'lazy'}
      priority={index < 2}
    />
  ))
}
```

## Srcset для responsive

```tsx
// next/image делает это автоматически
<Image
  src={`/api/images/${imageId}`}
  alt="Product"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

## Предзагрузка critical images

```tsx
// app/layout.tsx
import { preload } from 'react-dom'

export default function Layout({ children }) {
  preload('/api/images/hero-banner', { as: 'image' })
  return <>{children}</>
}
```

## Оптимизация bundle

```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

## Метрики производительности

| Метрика                        | Цель                           |
| ------------------------------ | ------------------------------ |
| LCP (Largest Contentful Paint) | < 2.5s                         |
| CLS (Cumulative Layout Shift)  | < 0.1                          |
| Image weight                   | < 200KB (hero), < 50KB (cards) |

## Чеклист оптимизации

- [ ] WebP формат для всех изображений
- [ ] Указаны width/height для предотвращения CLS
- [ ] lazy loading для below-the-fold
- [ ] priority для LCP изображений
- [ ] Blur placeholder для UX
- [ ] sizes атрибут для responsive
- [ ] CDN кэширование включено
