# Responsive Syntax

Синтаксис адаптивных props в Chakra UI v3.

## Object синтаксис (рекомендуется)

```tsx
<Text fontWeight={{ base: "medium", lg: "bold" }}>Text</Text>
<Box p={{ base: 4, md: 6 }} />
<Grid templateColumns={{ base: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }} />

// Не обязательно указывать все breakpoints
<Box p={{ base: 4, lg: 8 }} />  // md унаследует от base
```

---

## Array синтаксис

Значения в порядке: `[base, sm, md, lg, xl, 2xl]`

```tsx
// Используй undefined для пропуска
<Text fontWeight={["medium", undefined, undefined, "bold"]}>Text</Text>
// base: medium, lg: bold

<Box p={[4, 4, 6, 8]} />
// base: 4, sm: 4, md: 6, lg: 8
```

> **Рекомендация:** Object синтаксис читабельнее, особенно для сложных значений.

---

## Range targeting (Chakra v3)

### Между breakpoints

```tsx
// Применить стили от md до xl (не включая 2xl)
<Text fontWeight={{ mdToXl: "bold" }}>Text</Text>

// Другие комбинации
<Box display={{ smToLg: 'flex' }} />
<Box p={{ mdTo2xl: 8 }} />
```

### Только один breakpoint

```tsx
// Стиль применяется ТОЛЬКО на lg (не на xl и выше)
<Text fontWeight={{ lgOnly: "bold" }}>Text</Text>

<Box display={{ mdOnly: 'none' }} />  // Скрыть только на планшетах
```

### До breakpoint (включительно)

```tsx
// От base до sm включительно
<Text fontWeight={{ smDown: "bold" }}>Text</Text>

<Box display={{ mdDown: 'block' }} />  // block на mobile и tablet
```

---

## Hide/Show элементы

### hideFrom / hideBelow props

```tsx
// Скрыть от md и выше (показать только на mobile)
<Box hideFrom="md">Только мобильные</Box>

// Скрыть до md (показать только на desktop)
<Box hideBelow="md">Только desktop</Box>
```

### Через display prop

```tsx
// Эквивалент hideFrom="md"
<Box display={{ base: 'block', md: 'none' }}>Мобильный</Box>

// Эквивалент hideBelow="md"
<Box display={{ base: 'none', md: 'block' }}>Desktop</Box>

// Более сложная логика
<Box display={{ base: 'none', md: 'flex', xl: 'none' }}>
  Только tablet и laptop
</Box>
```

---

## useBreakpointValue хук

Для условной логики в JavaScript:

```tsx
import { useBreakpointValue } from '@chakra-ui/react'

function MyComponent() {
  // Простое значение
  const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 })

  // Boolean для условий
  const isMobile = useBreakpointValue({ base: true, md: false })

  // Строки для вариантов
  const variant = useBreakpointValue({ base: 'mobile', md: 'desktop' })

  return (
    <SimpleGrid columns={columns}>
      {isMobile && <MobileHeader />}
      <Card variant={variant} />
    </SimpleGrid>
  )
}
```

### SSR fallback

```tsx
// Укажи fallback для SSR (когда window недоступен)
const isMobile = useBreakpointValue(
  { base: true, md: false },
  { fallback: 'md' } // На сервере считаем desktop
)
```

---

## useMediaQuery хук

Для кастомных media queries:

```tsx
import { useMediaQuery } from '@chakra-ui/react'

// Один query
const [isLargerThanMd] = useMediaQuery('(min-width: 48em)')

// Несколько queries
const [isTouch, prefersReducedMotion] = useMediaQuery(['(pointer: coarse)', '(prefers-reduced-motion: reduce)'])

// С fallback для SSR
const [isLargerThanMd] = useMediaQuery('(min-width: 48em)', { fallback: true })
```

---

## Best Practices

### 1. Явные breakpoints для component variants

```tsx
// ❌ Может привести к style leaking
<Button variant={{ base: "solid", md: "outline" }} />

// ✅ Используй явные границы
<Button variant={{ smDown: "solid", md: "outline" }} />
```

### 2. Не переусложняй

```tsx
// ❌ Слишком много breakpoints
<Box p={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6, '2xl': 7 }} />

// ✅ Достаточно 2-3 значений
<Box p={{ base: 4, md: 6, xl: 8 }} />
```

### 3. Группируй responsive props

```tsx
// ✅ Читаемо — все responsive значения видны
<Card p={{ base: 4, md: 6 }} direction={{ base: 'column', md: 'row' }} gap={{ base: 2, md: 4 }} />
```

---

## См. также

- [breakpoints.md](breakpoints.md) — Значения брейкпоинтов
- [layouts.md](layouts.md) — Адаптивные layout паттерны
