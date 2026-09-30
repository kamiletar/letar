# Анимации

Keyframes и анимации в Chakra UI v3.

## Встроенные keyframes

### Basic

| Keyframe | Описание                        |
| -------- | ------------------------------- |
| `spin`   | Вращение 360°                   |
| `pulse`  | Пульсация opacity (1 → 0.5 → 1) |
| `ping`   | Расширение и исчезновение       |
| `bounce` | Отскок вверх-вниз               |

### Fade

| Keyframe   | Описание                     |
| ---------- | ---------------------------- |
| `fade-in`  | Появление (opacity 0 → 1)    |
| `fade-out` | Исчезновение (opacity 1 → 0) |

### Slide

| Keyframe            | Описание     |
| ------------------- | ------------ |
| `slide-from-left`   | Въезд слева  |
| `slide-from-right`  | Въезд справа |
| `slide-from-top`    | Въезд сверху |
| `slide-from-bottom` | Въезд снизу  |
| `slide-to-left`     | Выезд влево  |
| `slide-to-right`    | Выезд вправо |
| `slide-to-top`      | Выезд вверх  |
| `slide-to-bottom`   | Выезд вниз   |

### Scale

| Keyframe    | Описание              |
| ----------- | --------------------- |
| `scale-in`  | Увеличение (0.95 → 1) |
| `scale-out` | Уменьшение (1 → 0.95) |

### Advanced

| Keyframe            | Описание                 |
| ------------------- | ------------------------ |
| `collapse-height`   | Сворачивание по высоте   |
| `expand-height`     | Разворачивание по высоте |
| `circular-progress` | Круговой прогресс        |

---

## Использование

### animation prop

```tsx
// Бесконечное вращение
<Box animation="spin 1s linear infinite" />

// Пульсация
<Box animation="pulse 2s ease-in-out infinite" />

// Отскок
<Box animation="bounce 1s infinite" />
```

### animationName + animationDuration

```tsx
<Box
  animationName="spin"
  animationDuration="moderate"
  animationIterationCount="infinite"
/>

<Box
  animationName="fade-in"
  animationDuration="fast"
/>
```

### Комбинированные анимации

```tsx
<Box animation="fade-in 0.3s ease-out, slide-from-bottom 0.3s ease-out" />
```

---

## Duration токены

| Токен     | Значение |
| --------- | -------- |
| `fastest` | 50ms     |
| `faster`  | 100ms    |
| `fast`    | 150ms    |
| `normal`  | 200ms    |
| `slow`    | 300ms    |
| `slower`  | 400ms    |
| `slowest` | 500ms    |

```tsx
<Box transitionDuration="fast" animationDuration="slow" />
```

---

## Кастомные keyframes

```typescript
const config = defineConfig({
  theme: {
    keyframes: {
      // Кастомная пульсация
      customPulse: {
        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
        '50%': { opacity: 0.8, transform: 'scale(0.98)' },
      },

      // Качание
      wiggle: {
        '0%, 100%': { transform: 'rotate(-3deg)' },
        '50%': { transform: 'rotate(3deg)' },
      },

      // Вспышка
      flash: {
        '0%, 50%, 100%': { opacity: 1 },
        '25%, 75%': { opacity: 0 },
      },

      // Тряска
      shake: {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
      },

      // Плавающий
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },

      // Градиент (для skeleton)
      shimmer: {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
    },
  },
})
```

### Использование кастомных keyframes

```tsx
<Box animation="wiggle 0.5s ease-in-out infinite" />
<Box animation="float 3s ease-in-out infinite" />
<Box animation="shake 0.5s ease-in-out" />
```

---

## animationStyles

Предустановленные комбинации анимаций:

```typescript
const config = defineConfig({
  theme: {
    animationStyles: {
      'spin-slow': {
        value: {
          animationName: 'spin',
          animationDuration: '3s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        },
      },

      'fade-in-up': {
        value: {
          animationName: 'fade-in, slide-from-bottom',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-out',
        },
      },

      'fade-in-down': {
        value: {
          animationName: 'fade-in, slide-from-top',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-out',
        },
      },

      'scale-fade-in': {
        value: {
          animationName: 'fade-in, scale-in',
          animationDuration: '0.2s',
          animationTimingFunction: 'ease-out',
        },
      },

      'pulse-soft': {
        value: {
          animationName: 'pulse',
          animationDuration: '2s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        },
      },
    },
  },
})
```

### Использование animationStyles

```tsx
<Box animationStyle="fade-in-up">Анимированный блок</Box>
<Spinner animationStyle="spin-slow" />
```

---

## Transitions

### Стандартные transitions

```tsx
<Box
  transition="all 0.2s ease-out"
  _hover={{ transform: 'scale(1.05)' }}
/>

<Box
  transitionProperty="background, transform"
  transitionDuration="fast"
  transitionTimingFunction="ease-out"
/>
```

### Transition токены

```typescript
// В globalCss или recipes
transition: 'all',              // transition-property
transitionDuration: 'fast',     // 150ms
transitionTimingFunction: 'ease-out',
```

---

## Примеры использования

### Loading Spinner

```tsx
function LoadingSpinner() {
  return (
    <Box
      w={8}
      h={8}
      borderWidth={2}
      borderColor="colorPalette.200"
      borderTopColor="colorPalette.500"
      borderRadius="full"
      animation="spin 0.8s linear infinite"
    />
  )
}
```

### Skeleton

```tsx
function Skeleton({ ...props }) {
  return (
    <Box
      bg="bg.muted"
      borderRadius="md"
      backgroundImage="linear-gradient(90deg, transparent, bg.subtle, transparent)"
      backgroundSize="200% 100%"
      animation="shimmer 1.5s infinite"
      {...props}
    />
  )
}
```

### Notification Badge

```tsx
function NotificationBadge() {
  return (
    <Box
      position="absolute"
      top={-1}
      right={-1}
      w={3}
      h={3}
      bg="red.500"
      borderRadius="full"
      animation="ping 1s cubic-bezier(0, 0, 0.2, 1) infinite"
    />
  )
}
```

### Hover Animation

```tsx
<Box
  transition="all 0.2s ease-out"
  _hover={{
    transform: 'translateY(-4px)',
    shadow: 'lg',
  }}
>
  Карточка
</Box>
```

### Focus Animation

```tsx
<Input
  transition="all 0.2s"
  _focus={{
    borderColor: 'blue.500',
    boxShadow: '0 0 0 3px var(--chakra-colors-blue-200)',
  }}
/>
```

---

## CSS Motion (prefers-reduced-motion)

```typescript
// Учёт настроек пользователя
const config = defineConfig({
  globalCss: {
    '@media (prefers-reduced-motion: reduce)': {
      '*': {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
      },
    },
  },
})
```

Или через условие:

```typescript
conditions: {
  motionReduce: '@media (prefers-reduced-motion: reduce)',
}
```

```tsx
<Box animation="bounce 1s infinite" _motionReduce={{ animation: 'none' }} />
```

## См. также

- [visual-feedback.md](visual-feedback.md) — Визуальная обратная связь
- [tokens.md](tokens.md) — Duration токены
- [customization.md](customization.md) — Кастомизация
