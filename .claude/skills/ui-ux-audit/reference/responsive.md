# Responsive Design Audit Reference

## Breakpoints Chakra UI v3

| Breakpoint | px      | Описание            |
| ---------- | ------- | ------------------- |
| `base`     | 0px     | Мобильные (default) |
| `sm`       | ~480px  | Большие мобильные   |
| `md`       | ~768px  | Планшеты            |
| `lg`       | ~992px  | Ноутбуки            |
| `xl`       | ~1280px | Десктопы            |
| `2xl`      | ~1536px | Большие экраны      |

---

## Mobile-First Подход

### Правильный паттерн

```tsx
// ✅ Mobile-first — стили от маленького к большому
<Box
  p={{ base: 4, md: 6, lg: 8 }}       // 16px → 24px → 32px
  fontSize={{ base: 'sm', md: 'md' }} // 14px → 16px
  display={{ base: 'block', md: 'flex' }}
>

// ❌ Desktop-first — антипаттерн
<Box p={8} sx={{ '@media (max-width: 768px)': { p: 4 } }}>
```

### Object vs Array Syntax

```tsx
// Object syntax (рекомендуется)
<Box p={{ base: 4, md: 6 }} />

// Array syntax (устаревший)
<Box p={[4, null, 6]} />  // [base, sm, md]
```

---

## Responsive Props

### Hide/Show

```tsx
// Скрыть на mobile
<Box hideBelow="md">Только desktop</Box>

// Скрыть на desktop
<Box hideFrom="md">Только mobile</Box>

// Range targeting (v3)
<Box display={{ mdToXl: 'flex' }} />   // между md и xl
<Box display={{ lgOnly: 'none' }} />    // только lg
<Box display={{ smDown: 'block' }} />   // до sm включительно
```

### useBreakpointValue

```tsx
import { useBreakpointValue } from '@chakra-ui/react'

function ResponsiveComponent() {
  const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 })
  const isMobile = useBreakpointValue({ base: true, md: false })
  const size = useBreakpointValue({ base: 'sm', md: 'md' })

  return (
    <SimpleGrid columns={columns}>
      <Button size={size}>{isMobile ? 'Короткий текст' : 'Длинный текст для десктопа'}</Button>
    </SimpleGrid>
  )
}
```

---

## Touch-Friendly UI

### Touch Targets

```tsx
// ✅ Минимум 44×44px для touch
<Button size={{ base: 'lg', md: 'md' }}>Кнопка</Button>
<IconButton minH="44px" minW="44px" aria-label="Действие" />

// ❌ Слишком маленький target
<IconButton size="xs" aria-label="Действие" />  // 24×24px
```

### Thumb Zone

```tsx
// ✅ Важные действия в нижней части экрана
<Box position="fixed" bottom={0} left={0} right={0} p={4}>
  <Button width="full" size="lg">
    Главное действие
  </Button>
</Box>

// Навигация внизу для мобильных
<Box
  display={{ base: 'flex', md: 'none' }}
  position="fixed"
  bottom={0}
  left={0}
  right={0}
>
  <BottomNav />
</Box>
```

---

## Viewport Units

### Dynamic Viewport Height

```tsx
// ✅ dvh учитывает мобильную клавиатуру и адресную строку
<Box minH="100dvh">Полноэкранный контент</Box>

// svh — small viewport (минимальный размер)
// lvh — large viewport (максимальный размер)
// dvh — dynamic (текущий размер)
```

### Safe Area (Notch)

```tsx
// Учёт выреза на iPhone
<Box pb="env(safe-area-inset-bottom)" pt="env(safe-area-inset-top)">
  Контент
</Box>
```

---

## Responsive Images

### Next.js Image

```tsx
import Image from 'next/image'

// ✅ Responsive image с srcset
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  priority // для above-the-fold
/>

// ✅ Fill container
<Box position="relative" aspectRatio="16/9">
  <Image
    src="/image.jpg"
    alt="Image"
    fill
    style={{ objectFit: 'cover' }}
  />
</Box>
```

### Art Direction

```tsx
// Разные изображения для разных breakpoints
<picture>
  <source media="(max-width: 768px)" srcSet="/mobile.jpg" />
  <source media="(min-width: 769px)" srcSet="/desktop.jpg" />
  <img src="/desktop.jpg" alt="Responsive image" />
</picture>
```

---

## Layout Patterns

### Container

```tsx
// ✅ Адаптивный контейнер
<Container maxW={{ base: 'full', md: 'container.md', lg: 'container.lg' }}>Контент</Container>
```

### Grid

```tsx
// ✅ Адаптивная сетка
<SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
  {items.map(item => <Card key={item.id} {...item} />)}
</SimpleGrid>

// ✅ CSS Grid с minmax
<Grid
  templateColumns={{ base: '1fr', md: 'repeat(auto-fill, minmax(250px, 1fr))' }}
  gap={4}
>
  {items.map(item => <Card key={item.id} {...item} />)}
</Grid>
```

### Flex

```tsx
// ✅ Stack → Row на desktop
<Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ base: 'stretch', md: 'center' }}>
  <Box>Левая колонка</Box>
  <Box>Правая колонка</Box>
</Flex>
```

---

## Чеклист Responsive Аудита

### Критичные (MUST)

- [ ] Работает на всех breakpoints (base, sm, md, lg, xl)
- [ ] Mobile-first подход (стили от base)
- [ ] Touch targets ≥ 44×44px на mobile
- [ ] Текст читаем на всех размерах экрана
- [ ] Нет горизонтального скролла

### Важные (SHOULD)

- [ ] Используется object syntax для responsive props
- [ ] Изображения оптимизированы через next/image
- [ ] Навигация адаптирована (drawer на mobile)
- [ ] Формы удобны на mobile (большие inputs)

### Рекомендуемые (COULD)

- [ ] Thumb zone для важных действий
- [ ] Safe area для устройств с notch
- [ ] Art direction для hero изображений
- [ ] Reduced motion для пользователей с настройкой
