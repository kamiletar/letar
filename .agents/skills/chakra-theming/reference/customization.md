# Кастомизация

Продвинутая кастомизация: conditions, CSS variables, global CSS, utilities.

## Conditions

### Встроенные conditions

#### Pseudo-classes

| Condition       | CSS                             |
| --------------- | ------------------------------- |
| `_hover`        | `&:hover`                       |
| `_active`       | `&:active`                      |
| `_focus`        | `&:focus`                       |
| `_focusVisible` | `&:focus-visible`               |
| `_focusWithin`  | `&:focus-within`                |
| `_disabled`     | `&:disabled, &[disabled]`       |
| `_visited`      | `&:visited`                     |
| `_checked`      | `&:checked, &[data-checked]`    |
| `_invalid`      | `&:invalid, &[data-invalid]`    |
| `_required`     | `&:required, &[data-required]`  |
| `_readOnly`     | `&:read-only, &[data-readonly]` |
| `_expanded`     | `&[aria-expanded=true]`         |
| `_selected`     | `&[aria-selected=true]`         |

#### Pseudo-elements

| Condition      | CSS              |
| -------------- | ---------------- |
| `_before`      | `&::before`      |
| `_after`       | `&::after`       |
| `_placeholder` | `&::placeholder` |
| `_selection`   | `&::selection`   |
| `_first`       | `&:first-child`  |
| `_last`        | `&:last-child`   |
| `_even`        | `&:even`         |
| `_odd`         | `&:odd`          |

#### Theme

| Condition | CSS                              |
| --------- | -------------------------------- |
| `_dark`   | `.dark &, [data-theme=dark] &`   |
| `_light`  | `.light &, [data-theme=light] &` |

#### Media queries

| Condition       | CSS                                              |
| --------------- | ------------------------------------------------ |
| `_motionReduce` | `@media (prefers-reduced-motion: reduce)`        |
| `_motionSafe`   | `@media (prefers-reduced-motion: no-preference)` |
| `_print`        | `@media print`                                   |
| `_portrait`     | `@media (orientation: portrait)`                 |
| `_landscape`    | `@media (orientation: landscape)`                |

### Кастомные conditions

```typescript
const config = defineConfig({
  conditions: {
    // Data attributes
    off: '&:is([data-state=off])',
    on: '&:is([data-state=on])',
    open: '&:is([data-state=open])',
    closed: '&:is([data-state=closed])',

    // ARIA
    pressed: '&[aria-pressed=true]',
    grabbed: '&[aria-grabbed=true]',

    // Parent state
    groupHover: '.group:hover &',
    groupActive: '.group:active &',
    groupDisabled: '.group:disabled &',
    groupFocus: '.group:focus &',

    // Peer state
    peerHover: '.peer:hover ~ &',
    peerFocus: '.peer:focus ~ &',
    peerInvalid: '.peer:invalid ~ &',

    // Media
    contrastMore: '@media (prefers-contrast: more)',
    contrastLess: '@media (prefers-contrast: less)',

    // Container queries
    containerSm: '@container (min-width: 24rem)',
    containerMd: '@container (min-width: 28rem)',
    containerLg: '@container (min-width: 32rem)',

    // Supports
    supportsBackdrop: '@supports (backdrop-filter: blur(1px))',
  },
})
```

### Использование conditions

```tsx
<Box
  bg="gray.100"
  _hover={{ bg: 'gray.200' }}
  _dark={{ bg: 'gray.800' }}
  _motionReduce={{ transition: 'none' }}
  _contrastMore={{ borderWidth: '2px' }}
/>

<Box data-state="open">
  <Text _open={{ color: 'green.500' }}>Открыто</Text>
</Box>
```

---

## CSS Variables

### cssVarsRoot

Куда добавлять CSS переменные:

```typescript
const config = defineConfig({
  cssVarsRoot: ':where(html)', // По умолчанию
  // или
  cssVarsRoot: ':root',
  // или
  cssVarsRoot: 'body',
})
```

### cssVarsPrefix

Префикс для CSS переменных:

```typescript
const config = defineConfig({
  cssVarsPrefix: 'chakra', // По умолчанию
  // Результат: --chakra-colors-gray-100
})
```

### Именование переменных

```css
/* Токен colors.gray.100 */
--chakra-colors-gray-100

/* Токен spacing.4 */
--chakra-spacing-4

/* Семантический токен bg.subtle */
--chakra-colors-bg-subtle

/* Доступ в CSS */
var(--chakra-colors-gray-100)
var(--chakra-spacing-4)
```

### Использование переменных

```tsx
// В inline styles
<div style={{ background: 'var(--chakra-colors-blue-500)' }} />

// В CSS файлах
.custom-class {
  background: var(--chakra-colors-bg-subtle);
  padding: var(--chakra-spacing-4);
}
```

---

## Global CSS

```typescript
const config = defineConfig({
  globalCss: {
    // HTML элементы
    html: {
      scrollBehavior: 'smooth',
      fontSize: '16px',
    },

    body: {
      fontFamily: 'body',
      bg: 'bg',
      color: 'fg',
      minHeight: '100vh',
    },

    // Селекторы
    '*::placeholder': {
      opacity: 1,
      color: 'fg.placeholder',
    },

    '*::selection': {
      bg: 'blue.200',
      color: 'blue.900',
    },

    // Focus visible
    '*:focus-visible': {
      outline: '2px solid',
      outlineColor: 'blue.500',
      outlineOffset: '2px',
    },

    // Скроллбар
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: 'bg.subtle',
    },
    '::-webkit-scrollbar-thumb': {
      bg: 'border',
      borderRadius: 'full',
      '&:hover': {
        bg: 'border.emphasized',
      },
    },

    // Ссылки
    a: {
      color: 'blue.500',
      _hover: { textDecoration: 'underline' },
    },

    // Код
    code: {
      fontFamily: 'mono',
      fontSize: '0.9em',
      bg: 'bg.subtle',
      px: 1,
      py: 0.5,
      borderRadius: 'sm',
    },

    // Reduced motion
    '@media (prefers-reduced-motion: reduce)': {
      '*': {
        animationDuration: '0.01ms !important',
        transitionDuration: '0.01ms !important',
      },
    },

    // Print
    '@media print': {
      '*': {
        background: 'transparent !important',
        color: 'black !important',
      },
    },
  },
})
```

---

## Utilities

Кастомные CSS-утилиты (shorthand свойства):

```typescript
const config = defineConfig({
  utilities: {
    // Кастомный border-radius
    br: {
      values: 'radii',
      transform(value) {
        return { borderRadius: value }
      },
    },

    // Размер (width + height)
    boxSize: {
      values: 'sizes',
      transform(value) {
        return { width: value, height: value }
      },
    },

    // Padding X/Y
    px: {
      values: 'spacing',
      transform(value) {
        return { paddingLeft: value, paddingRight: value }
      },
    },
    py: {
      values: 'spacing',
      transform(value) {
        return { paddingTop: value, paddingBottom: value }
      },
    },

    // Truncate
    truncate: {
      values: { type: 'boolean' },
      transform(value) {
        if (!value) { return {} }
        return {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }
      },
    },

    // Line clamp
    lineClamp: {
      values: { type: 'number' },
      transform(value) {
        return {
          display: '-webkit-box',
          WebkitLineClamp: value,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }
      },
    },

    // Aspect ratio
    aspectRatio: {
      values: 'aspectRatios',
      transform(value) {
        return { aspectRatio: value }
      },
    },

    // Z-index shorthand
    z: {
      values: 'zIndex',
      transform(value) {
        return { zIndex: value }
      },
    },

    // Transition shorthand
    t: {
      values: { type: 'string' },
      transform(value) {
        return { transition: value }
      },
    },

    // Shadow shorthand
    sh: {
      values: 'shadows',
      transform(value) {
        return { boxShadow: value }
      },
    },
  },
})
```

### Использование утилит

```tsx
<Box br="lg" boxSize={10} />
<Text truncate>Очень длинный текст...</Text>
<Text lineClamp={3}>Многострочный текст с ограничением...</Text>
<Box z="modal" />
```

---

## StrictTokens

Запрет произвольных значений:

```typescript
const config = defineConfig({
  strictTokens: true,  // Только токены из темы
})

// С strictTokens: true
<Box color="gray.500" />     // ✅ Токен
<Box color="#ff0000" />      // ❌ Ошибка
<Box color="red" />          // ❌ Ошибка
```

---

## Пример полной конфигурации

```typescript
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  // CSS переменные
  cssVarsRoot: ':where(html)',
  cssVarsPrefix: 'app',

  // Строгие токены (dev only)
  strictTokens: process.env.NODE_ENV === 'development',

  // Глобальные стили
  globalCss: {
    html: { scrollBehavior: 'smooth' },
    body: { fontFamily: 'body', bg: 'bg', color: 'fg' },
    '*::selection': { bg: 'blue.200' },
  },

  // Кастомные conditions
  conditions: {
    off: '&:is([data-state=off])',
    on: '&:is([data-state=on])',
    groupHover: '.group:hover &',
    contrastMore: '@media (prefers-contrast: more)',
  },

  // Утилиты
  utilities: {
    br: {
      values: 'radii',
      transform: (value) => ({ borderRadius: value }),
    },
    truncate: {
      values: { type: 'boolean' },
      transform: (value) => (value ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
    },
  },

  // Тема
  theme: {
    tokens: {/* ... */},
    semanticTokens: {/* ... */},
    recipes: {/* ... */},
    slotRecipes: {/* ... */},
    textStyles: {/* ... */},
    layerStyles: {/* ... */},
    keyframes: {/* ... */},
  },
})

export const system = createSystem(defaultConfig, config)
```

## См. также

- [overview.md](overview.md) — Обзор системы темизации
- [tokens.md](tokens.md) — Design токены
- [semantic-tokens.md](semantic-tokens.md) — Семантические токены
