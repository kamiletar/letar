# UI Performance Audit Reference

## Render Performance

### React DevTools Profiler

```bash
# Установка
# Chrome: React Developer Tools extension

# Использование
1. Открой React DevTools → Profiler
2. Нажми Record
3. Выполни действие
4. Нажми Stop
5. Анализируй flame graph
```

### Признаки проблем

| Проблема           | Симптом                                   | Решение                 |
| ------------------ | ----------------------------------------- | ----------------------- |
| Лишние ререндеры   | Компонент рендерится при каждом изменении | `React.memo`, `useMemo` |
| Тяжёлые вычисления | Долгий render (>16ms)                     | `useMemo`, web workers  |
| Cascading updates  | Много компонентов перерисовывается        | Оптимизация state       |

### Оптимизация ререндеров

```tsx
// ✅ Мемоизация компонента
const MemoizedItem = React.memo(function Item({ data }) {
  return <Box>{data.name}</Box>
})

// ✅ Мемоизация тяжёлых вычислений
const expensiveResult = useMemo(() => {
  return heavyComputation(data)
}, [data])

// ✅ Стабильные callbacks
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])

// ❌ Inline objects создают новые ссылки каждый render
<Component style={{ color: 'red' }} />  // Новый объект каждый раз

// ✅ Вынести статические стили
const styles = { color: 'red' }
<Component style={styles} />
```

---

## Animation Performance

### 60 FPS Target

```tsx
// ✅ CSS transforms и opacity (GPU-accelerated)
<Box
  transition="transform 0.2s, opacity 0.2s"
  _hover={{ transform: 'scale(1.05)', opacity: 0.9 }}
>

// ❌ Анимация layout properties (triggers reflow)
<Box
  transition="width 0.2s, height 0.2s"  // Триггерит layout
  _hover={{ width: '200px', height: '200px' }}
>
```

### will-change

```tsx
// ✅ Подсказка браузеру об анимации
<Box
  willChange="transform"
  transition="transform 0.2s"
  _hover={{ transform: 'translateY(-4px)' }}
>

// ⚠️ Не злоупотреблять — каждый элемент с will-change потребляет память
```

### Framer Motion Best Practices

```tsx
import { motion } from 'framer-motion'

// ✅ Анимация transform properties
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>

// ✅ Layout animations через layoutId
<motion.div layoutId="shared-element">

// ✅ Reduced motion support
const prefersReducedMotion = useReducedMotion()
<motion.div
  animate={prefersReducedMotion ? {} : { scale: 1.1 }}
>
```

---

## Layout Shifts (CLS)

### Причины CLS

| Причина                  | Решение                               |
| ------------------------ | ------------------------------------- |
| Изображения без размеров | `width` и `height` или `aspect-ratio` |
| Динамический контент     | Skeleton, reserved space              |
| Веб-шрифты               | `font-display: swap`, preload         |
| Ads/embeds               | Зарезервированное пространство        |

### Предотвращение CLS

```tsx
// ✅ Изображения с размерами
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
/>

// ✅ Aspect ratio container
<Box aspectRatio="16/9" position="relative">
  <Image fill src="/photo.jpg" alt="Photo" />
</Box>

// ✅ Skeleton для загрузки
{isLoading ? (
  <Skeleton height="200px" />
) : (
  <Card>{content}</Card>
)}

// ✅ Fixed height для динамического контента
<Box minH="400px">
  {dynamicContent}
</Box>
```

---

## Image Optimization

### Next.js Image

```tsx
import Image from 'next/image'

// ✅ Automatic optimization
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority  // для above-the-fold
/>

// ✅ Lazy loading (default)
<Image
  src="/photo.jpg"
  alt="Photo"
  width={400}
  height={300}
  loading="lazy"  // default
/>

// ✅ Responsive sizes
<Image
  src="/hero.jpg"
  alt="Hero"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Форматы изображений

| Формат | Использование                                    |
| ------ | ------------------------------------------------ |
| WebP   | Основной формат (автоматически через next/image) |
| AVIF   | Лучше сжатие (поддержка ~75% браузеров)          |
| SVG    | Иконки, логотипы                                 |
| PNG    | Изображения с прозрачностью                      |
| JPEG   | Фотографии без прозрачности                      |

---

## Lazy Loading

### Components

```tsx
import dynamic from 'next/dynamic'

// ✅ Динамический импорт тяжёлых компонентов
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton height="400px" />,
  ssr: false, // Отключить SSR если не нужен
})

// ✅ Условный lazy loading
const MobileMenu = dynamic(() => import('./MobileMenu'), {
  ssr: false,
})

function Header() {
  const isMobile = useBreakpointValue({ base: true, md: false })
  return isMobile ? <MobileMenu /> : <DesktopNav />
}
```

### Data

```tsx
// ✅ Intersection Observer для lazy loading
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

function LazySection() {
  const { ref, isIntersecting } = useIntersectionObserver()

  return <Box ref={ref}>{isIntersecting && <ExpensiveComponent />}</Box>
}
```

---

## Bundle Size

### Analysis

```bash
# Next.js bundle analyzer
ANALYZE=true nx build <app>

# Webpack bundle analyzer откроется автоматически
```

### Optimization

```tsx
// ✅ Named imports для tree-shaking
import { Box, Button } from '@chakra-ui/react'

// ❌ Default imports могут включить весь пакет
import Chakra from '@chakra-ui/react'

// ✅ Условный import
const PDFViewer = dynamic(() => import('react-pdf'), { ssr: false })

// ✅ Разделение vendor chunks
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'framer-motion'],
  },
}
```

---

## Core Web Vitals

### Метрики

| Метрика | Цель    | Описание                  |
| ------- | ------- | ------------------------- |
| LCP     | < 2.5s  | Largest Contentful Paint  |
| FID     | < 100ms | First Input Delay         |
| CLS     | < 0.1   | Cumulative Layout Shift   |
| INP     | < 200ms | Interaction to Next Paint |
| TTFB    | < 800ms | Time to First Byte        |

### Измерение

```bash
# Lighthouse CLI
npx lighthouse https://localhost:3000 --view

# Chrome DevTools
DevTools → Lighthouse → Generate report

# Real User Monitoring
# Используй web-vitals library или Vercel Analytics
```

---

## Чеклист Performance Аудита

### Критичные (MUST)

- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Нет блокирующих ресурсов
- [ ] Изображения оптимизированы

### Важные (SHOULD)

- [ ] Lazy loading для below-the-fold контента
- [ ] React.memo для списков
- [ ] Анимации на transform/opacity
- [ ] Bundle size проанализирован

### Рекомендуемые (COULD)

- [ ] Preload критичных ресурсов
- [ ] Service Worker для кэширования
- [ ] Reduced motion support
- [ ] Real User Monitoring настроен
