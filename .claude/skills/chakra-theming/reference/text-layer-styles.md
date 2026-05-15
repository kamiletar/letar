# Text Styles и Layer Styles

Переиспользуемые наборы стилей для типографики и визуальных элементов.

## Text Styles

### Встроенные text styles

| Токен | Font Size | Line Height | Letter Spacing |
| ----- | --------- | ----------- | -------------- |
| `xs`  | 0.75rem   | 1rem        | —              |
| `sm`  | 0.875rem  | 1.25rem     | —              |
| `md`  | 1rem      | 1.5rem      | —              |
| `lg`  | 1.125rem  | 1.75rem     | —              |
| `xl`  | 1.25rem   | 1.75rem     | —              |
| `2xl` | 1.5rem    | 2rem        | —              |
| `3xl` | 1.875rem  | 2.25rem     | —              |
| `4xl` | 2.25rem   | 2.5rem      | —              |
| `5xl` | 3rem      | 1           | —              |
| `6xl` | 3.75rem   | 1           | —              |
| `7xl` | 4.5rem    | 1           | —              |

### Использование

```tsx
<Text textStyle="lg">Большой текст</Text>
<Text textStyle="sm">Маленький текст</Text>
<Heading textStyle="4xl">Заголовок</Heading>
```

### defineTextStyles

```typescript
import { defineTextStyles } from '@chakra-ui/react'

const textStyles = defineTextStyles({
  // Кастомный заголовок
  'heading.hero': {
    description: 'Hero заголовок',
    value: {
      fontSize: { base: '3xl', md: '5xl', lg: '6xl' },
      fontWeight: 'bold',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
  },

  // Подзаголовок
  'heading.section': {
    value: {
      fontSize: { base: 'xl', md: '2xl' },
      fontWeight: 'semibold',
      lineHeight: '1.3',
    },
  },

  // Основной текст
  'body.default': {
    value: {
      fontSize: 'md',
      lineHeight: '1.7',
      color: 'fg',
    },
  },

  // Мелкий текст
  'body.small': {
    value: {
      fontSize: 'sm',
      lineHeight: '1.5',
      color: 'fg.muted',
    },
  },

  // Подпись
  caption: {
    value: {
      fontSize: 'xs',
      lineHeight: '1.4',
      color: 'fg.subtle',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
  },

  // Цитата
  quote: {
    value: {
      fontSize: 'lg',
      fontStyle: 'italic',
      lineHeight: '1.6',
      color: 'fg.muted',
      borderLeftWidth: '4px',
      borderColor: 'colorPalette.500',
      paddingLeft: '4',
    },
  },
})

// В конфиге темы
const config = defineConfig({
  theme: {
    textStyles,
  },
})
```

### Использование кастомных text styles

```tsx
<Text textStyle="heading.hero">Hero Title</Text>
<Text textStyle="body.default">Основной текст параграфа...</Text>
<Text textStyle="caption">Подпись к изображению</Text>
```

---

## Layer Styles

Layer styles — наборы стилей для визуальных элементов (фон, границы, тени).

### Встроенные layer styles

#### Fill Styles

| Токен          | Описание         |
| -------------- | ---------------- |
| `fill.muted`   | Приглушённый фон |
| `fill.subtle`  | Слабый фон       |
| `fill.surface` | Поверхность      |
| `fill.solid`   | Сплошной фон     |

#### Outline Styles

| Токен            | Описание         |
| ---------------- | ---------------- |
| `outline.subtle` | Тонкая граница   |
| `outline.solid`  | Сплошная граница |

#### Indicator Styles

| Токен              | Описание                |
| ------------------ | ----------------------- |
| `indicator.top`    | Индикатор сверху        |
| `indicator.bottom` | Индикатор снизу         |
| `indicator.start`  | Индикатор слева (start) |
| `indicator.end`    | Индикатор справа (end)  |

### Использование

```tsx
<Box layerStyle="fill.subtle">
  Контент с мягким фоном
</Box>

<Box layerStyle="outline.solid">
  Контент с границей
</Box>
```

### defineLayerStyles

```typescript
import { defineLayerStyles } from '@chakra-ui/react'

const layerStyles = defineLayerStyles({
  // Карточка
  card: {
    description: 'Базовая карточка',
    value: {
      bg: 'bg.panel',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border',
      shadow: 'sm',
    },
  },

  // Интерактивная карточка
  'card.interactive': {
    value: {
      bg: 'bg.panel',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border',
      transition: 'all 0.15s ease-out',
      cursor: 'pointer',

      _hover: {
        shadow: 'md',
        borderColor: 'border.emphasized',
      },

      _active: {
        transform: 'scale(0.99)',
      },
    },
  },

  // Выбираемая карточка
  'card.selectable': {
    value: {
      bg: 'bg.panel',
      borderRadius: 'lg',
      borderWidth: '2px',
      borderColor: 'border',
      transition: 'all 0.1s ease-out',
      cursor: 'pointer',

      _hover: {
        borderColor: 'colorPalette.300',
      },

      _active: {
        transform: 'scale(0.98)',
      },

      '&[data-selected]': {
        borderColor: 'colorPalette.500',
        bg: 'colorPalette.subtle',
      },
    },
  },

  // Стеклянный эффект (glassmorphism)
  glass: {
    value: {
      bg: 'bg/80',
      backdropFilter: 'blur(10px)',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border/50',
    },
  },

  // Градиентный фон
  'gradient.brand': {
    value: {
      bgGradient: 'linear(to-r, colorPalette.500, colorPalette.600)',
      color: 'white',
    },
  },

  // Elevated (приподнятый)
  elevated: {
    value: {
      bg: 'bg.panel',
      shadow: 'lg',
      borderRadius: 'xl',
    },
  },

  // Инсет (вдавленный)
  inset: {
    value: {
      bg: 'bg.subtle',
      shadow: 'inset',
      borderRadius: 'md',
    },
  },

  // Разделитель секций
  section: {
    value: {
      py: 16,
      borderBottomWidth: '1px',
      borderColor: 'border.subtle',
    },
  },
})

// В конфиге темы
const config = defineConfig({
  theme: {
    layerStyles,
  },
})
```

### Использование кастомных layer styles

```tsx
<Box layerStyle="card">
  Базовая карточка
</Box>

<Box layerStyle="card.interactive" onClick={handleClick}>
  Кликабельная карточка
</Box>

<Box layerStyle="glass">
  Стеклянный эффект
</Box>

<Box layerStyle="gradient.brand">
  Градиентный фон
</Box>
```

---

## Комбинирование стилей

```tsx
<Box layerStyle="card" textStyle="body.default" p={6}>
  <Heading textStyle="heading.section" mb={4}>
    Заголовок
  </Heading>
  <Text>Содержимое карточки...</Text>
</Box>
```

---

## Пример из проекта Lena

```typescript
// apps/driving-school/src/theme/styles/layerStyles.ts
export const layerStyles = defineLayerStyles({
  'card.interactive': {
    value: {
      bg: 'bg.surface',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border',
      transition: 'all 0.15s ease-out',
      cursor: 'pointer',

      _hover: {
        shadow: 'sm',
        borderColor: 'border.emphasized',
      },

      _active: {
        transform: 'scale(0.99)',
      },
    },
  },
})
```

---

## Responsive Text Styles

```typescript
const textStyles = defineTextStyles({
  'heading.adaptive': {
    value: {
      fontSize: {
        base: 'xl', // mobile
        sm: '2xl', // 480px
        md: '3xl', // 768px
        lg: '4xl', // 1024px
        xl: '5xl', // 1280px
        '3xl': '6xl', // 1920px (кастомный)
      },
      fontWeight: 'bold',
      lineHeight: { base: '1.3', lg: '1.1' },
    },
  },
})
```

## См. также

- [tokens.md](tokens.md) — Typography токены
- [semantic-tokens.md](semantic-tokens.md) — Семантические токены
- [customization.md](customization.md) — Кастомизация
