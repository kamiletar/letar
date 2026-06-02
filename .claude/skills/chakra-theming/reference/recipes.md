# Recipes

Recipes — стилизация компонентов через variants. Используются для однослотовых компонентов (Button, Badge, Heading).

## API defineRecipe

```typescript
import { defineRecipe } from '@chakra-ui/react'

const buttonRecipe = defineRecipe({
  // CSS класс (опционально)
  className: 'button',

  // Базовые стили (применяются всегда)
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'medium',
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    _disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },

  // Варианты стилей
  variants: {
    // Вариант size
    size: {
      xs: { h: 6, px: 2, fontSize: 'xs' },
      sm: { h: 8, px: 3, fontSize: 'sm' },
      md: { h: 10, px: 4, fontSize: 'md' },
      lg: { h: 12, px: 6, fontSize: 'lg' },
      xl: { h: 14, px: 8, fontSize: 'xl' },
    },

    // Вариант visual
    variant: {
      solid: {
        bg: 'colorPalette.solid',
        color: 'colorPalette.contrast',
        _hover: { bg: 'colorPalette.solid/90' },
      },
      outline: {
        borderWidth: '1px',
        borderColor: 'colorPalette.500',
        color: 'colorPalette.fg',
        _hover: { bg: 'colorPalette.subtle' },
      },
      ghost: {
        color: 'colorPalette.fg',
        _hover: { bg: 'colorPalette.subtle' },
      },
      plain: {
        color: 'colorPalette.fg',
      },
    },
  },

  // Комбинированные варианты
  compoundVariants: [
    {
      variant: 'solid',
      size: 'lg',
      css: {
        fontWeight: 'bold',
      },
    },
    {
      variant: ['outline', 'ghost'],
      css: {
        borderRadius: 'md',
      },
    },
  ],

  // Дефолтные значения
  defaultVariants: {
    size: 'md',
    variant: 'solid',
  },
})
```

---

## Использование recipes

### В theme config

```typescript
const config = defineConfig({
  theme: {
    recipes: {
      button: buttonRecipe,
      heading: headingRecipe,
      badge: badgeRecipe,
    },
  },
})
```

### useRecipe хук

```tsx
import { useRecipe } from '@chakra-ui/react'

function CustomButton({ size, variant, ...props }) {
  const recipe = useRecipe({ key: 'button' })
  const styles = recipe({ size, variant })

  return <button className={styles} {...props} />
}
```

### chakra() factory

```tsx
import { chakra } from '@chakra-ui/react'

// Создаёт компонент с recipe
const Button = chakra('button', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  variants: {
    size: {
      sm: { h: 8 },
      md: { h: 10 },
    },
  },
})

// Использование
<Button size="sm">Click</Button>
```

---

## Пример из проекта Letar

### Button Recipe (driving-school)

```typescript
// apps/driving-school/src/theme/recipes/button.ts
import { defineRecipe } from '@chakra-ui/react'

export const buttonRecipe = defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: {
      transform: 'scale(0.95)',
    },
    _disabled: {
      _active: { transform: 'none' },
    },
  },

  variants: {
    size: {
      xs: { _active: { transform: 'scale(0.9)' } },
      sm: { _active: { transform: 'scale(0.9)' } },
      md: { _active: { transform: 'scale(0.95)' } },
      lg: { _active: { transform: 'scale(0.97)' } },
      xl: { _active: { transform: 'scale(0.98)' } },
    },

    variant: {
      solid: {
        _active: {
          bg: 'colorPalette.solid/80',
          '&:hover': { bg: 'colorPalette.solid/50' },
        },
      },
      subtle: {
        _active: {
          bg: 'colorPalette.muted',
          '&:hover': { bg: 'colorPalette.subtle/50' },
        },
      },
      surface: {
        _active: {
          bg: 'colorPalette.muted',
          '&:hover': { bg: 'bg.subtle' },
        },
      },
      outline: {
        _active: {
          bg: 'colorPalette.muted',
          '&:hover': { bg: 'colorPalette.subtle/50' },
        },
      },
      ghost: {
        _active: {
          bg: 'bg.muted',
          '&:hover': { bg: 'colorPalette.subtle/50' },
        },
      },
      plain: {
        _active: { opacity: 0.8 },
      },
    },
  },
})
```

### Link Recipe

```typescript
// apps/driving-school/src/theme/recipes/link.ts
import { defineRecipe } from '@chakra-ui/react'

export const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.9)',
    },
  },

  variants: {
    variant: {
      underline: {
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      },
      plain: {
        _active: {
          opacity: 0.7,
          '&:hover': {
            bg: 'currentColor/10',
          },
        },
      },
    },
  },
})
```

### Heading Recipe

```typescript
import { defineRecipe } from '@chakra-ui/react'

export const headingRecipe = defineRecipe({
  base: {
    fontWeight: 'bold',
    lineHeight: 'shorter',
  },
  variants: {
    size: {
      xs: { fontSize: 'xs' },
      sm: { fontSize: 'sm' },
      md: { fontSize: 'md' },
      lg: { fontSize: 'lg' },
      xl: { fontSize: 'xl' },
      '2xl': { fontSize: '2xl' },
      '3xl': { fontSize: '3xl' },
      '4xl': { fontSize: '4xl' },
    },
    textTransform: {
      uppercase: { textTransform: 'uppercase', letterSpacing: 'wide' },
      capitalize: { textTransform: 'capitalize' },
      none: { textTransform: 'none' },
    },
  },
  defaultVariants: {
    size: 'xl',
  },
})
```

---

## Compound Variants

Стили для комбинации нескольких вариантов:

```typescript
const buttonRecipe = defineRecipe({
  variants: {
    size: { sm: {}, md: {}, lg: {} },
    variant: { solid: {}, outline: {} },
  },

  compoundVariants: [
    // size=lg + variant=solid
    {
      size: 'lg',
      variant: 'solid',
      css: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
      },
    },

    // Массив значений — любое из
    {
      variant: ['outline', 'ghost'],
      css: {
        borderWidth: '2px',
      },
    },
  ],
})
```

---

## Расширение существующих recipes

```typescript
import { defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    recipes: {
      // Расширяем button из defaultConfig
      button: {
        // Добавляем новый variant
        variants: {
          variant: {
            brand: {
              bg: 'brand.500',
              color: 'white',
              _hover: { bg: 'brand.600' },
            },
          },
          // Добавляем новый size
          size: {
            '2xl': { h: 16, px: 10, fontSize: '2xl' },
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
```

---

## Статический vs Динамический CSS

### Статический (рекомендуется)

```typescript
// Все варианты генерируются в CSS
const recipe = defineRecipe({
  variants: {
    size: {
      sm: { h: 8 },
      md: { h: 10 },
    },
  },
})
```

### Динамический (избегать)

```typescript
// НЕ делай так — CSS не генерируется статически
const recipe = defineRecipe({
  base: ({ size }) => ({
    h: size === 'sm' ? 8 : 10,
  }),
})
```

## См. также

- [slot-recipes.md](slot-recipes.md) — Slot Recipes для сложных компонентов
- [visual-feedback.md](visual-feedback.md) — Визуальная обратная связь в recipes
- [overview.md](overview.md) — Обзор системы темизации
