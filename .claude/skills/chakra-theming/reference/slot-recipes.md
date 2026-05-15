# Slot Recipes

Slot Recipes — стилизация многокомпонентных элементов (Card, Menu, Tabs, Dialog). Каждый "slot" — отдельная часть компонента.

## API defineSlotRecipe

```typescript
import { defineSlotRecipe } from '@chakra-ui/react'

const cardRecipe = defineSlotRecipe({
  // CSS класс
  className: 'card',

  // Определение slots
  slots: ['root', 'header', 'body', 'footer', 'title', 'description'],

  // Базовые стили для каждого slot
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      bg: 'bg.panel',
      borderRadius: 'lg',
      overflow: 'hidden',
    },
    header: {
      p: 4,
      borderBottomWidth: '1px',
      borderColor: 'border',
    },
    body: {
      p: 4,
      flex: 1,
    },
    footer: {
      p: 4,
      borderTopWidth: '1px',
      borderColor: 'border',
    },
    title: {
      fontWeight: 'semibold',
      fontSize: 'lg',
    },
    description: {
      color: 'fg.muted',
      fontSize: 'sm',
    },
  },

  // Варианты для всех slots
  variants: {
    size: {
      sm: {
        root: { borderRadius: 'md' },
        header: { p: 3 },
        body: { p: 3 },
        footer: { p: 3 },
        title: { fontSize: 'md' },
      },
      md: {
        // ...используются base стили
      },
      lg: {
        header: { p: 6 },
        body: { p: 6 },
        footer: { p: 6 },
        title: { fontSize: 'xl' },
      },
    },

    variant: {
      elevated: {
        root: {
          shadow: 'md',
          borderWidth: '0',
        },
      },
      outline: {
        root: {
          borderWidth: '1px',
          borderColor: 'border',
        },
      },
      subtle: {
        root: {
          bg: 'bg.subtle',
        },
      },
    },
  },

  defaultVariants: {
    size: 'md',
    variant: 'outline',
  },
})
```

---

## Расширение анатомии компонента

```typescript
import { cardAnatomy } from '@chakra-ui/react/anatomy'

// Встроенные slots компонента
const slots = cardAnatomy.keys()
// ['root', 'header', 'body', 'footer', 'title', 'description']

// Расширение
const extendedSlots = [...cardAnatomy.keys(), 'badge', 'action']
```

---

## Примеры из проекта Lena

### Menu Slot Recipe

```typescript
// apps/driving-school/src/theme/recipes/slotRecipes.ts

export const menuRecipe = defineSlotRecipe({
  slots: ['content', 'item', 'itemText', 'itemCommand', 'separator', 'trigger'],

  variants: {
    variant: {
      subtle: {
        item: {
          transition: 'all 0.1s ease-out',
          _active: {
            bg: 'bg.muted',
            transform: 'scale(0.98)',
          },
        },
      },
    },
  },
})
```

### Tabs Slot Recipe

```typescript
export const tabsRecipe = defineSlotRecipe({
  slots: ['root', 'list', 'trigger', 'content', 'indicator'],

  base: {
    trigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.95)',
      },
    },
  },
})
```

### Accordion Slot Recipe

```typescript
export const accordionRecipe = defineSlotRecipe({
  slots: ['root', 'item', 'itemTrigger', 'itemContent', 'itemIndicator', 'itemBody'],

  base: {
    itemTrigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        bg: 'bg.subtle',
        transform: 'scale(0.99)',
      },
    },
  },
})
```

### Checkbox Slot Recipe

```typescript
export const checkboxRecipe = defineSlotRecipe({
  slots: ['root', 'control', 'label'],

  base: {
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.9)',
      },
    },
  },
})
```

### Radio Slot Recipe

```typescript
export const radioRecipe = defineSlotRecipe({
  slots: ['root', 'control', 'label'],

  base: {
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.9)',
      },
    },
  },
})
```

### Slider Slot Recipe

```typescript
export const sliderRecipe = defineSlotRecipe({
  slots: ['root', 'track', 'filledTrack', 'thumb', 'mark', 'valueText'],

  base: {
    thumb: {
      transition: 'all 0.1s ease-out',
      // Thumb УВЕЛИЧИВАЕТСЯ при активации (не уменьшается!)
      _active: {
        transform: 'scale(1.1)',
      },
    },
  },
})
```

### Tag Slot Recipe

```typescript
export const tagRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'closeTrigger'],

  base: {
    closeTrigger: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.85)',
      },
    },
  },
})
```

### Toast Slot Recipe

```typescript
export const toastRecipe = defineSlotRecipe({
  slots: ['root', 'title', 'description', 'closeTrigger', 'actionTrigger'],

  base: {
    root: {
      // Стилизация по data-type атрибуту
      '&[data-type=error]': {
        bg: 'pink.500',
        color: 'pink.50',
      },
      '&[data-type=success]': {
        bg: 'fg.500',
        color: 'fg.50',
      },
      '&[data-type=info]': {
        bg: 'blue.500',
        color: 'blue.50',
      },
      '&[data-type=warning]': {
        bg: 'orange.500',
        color: 'orange.50',
      },
    },
  },
})
```

---

## Использование Slot Recipes

### В theme config

```typescript
const config = defineConfig({
  theme: {
    slotRecipes: {
      card: cardRecipe,
      menu: menuRecipe,
      tabs: tabsRecipe,
      accordion: accordionRecipe,
      checkbox: checkboxRecipe,
      radio: radioRecipe,
      slider: sliderRecipe,
      tag: tagRecipe,
      toast: toastRecipe,
    },
  },
})
```

### useSlotRecipe хук

```tsx
import { useSlotRecipe } from '@chakra-ui/react'

function CustomCard({ size, variant, ...props }) {
  const recipe = useSlotRecipe({ key: 'card' })
  const styles = recipe({ size, variant })

  return (
    <div className={styles.root}>
      <div className={styles.header}>...</div>
      <div className={styles.body}>...</div>
    </div>
  )
}
```

---

## Compound Variants в Slot Recipes

```typescript
const dialogRecipe = defineSlotRecipe({
  slots: ['overlay', 'positioner', 'content', 'header', 'body', 'footer'],

  variants: {
    size: { sm: {}, md: {}, lg: {}, full: {} },
    scrollBehavior: { inside: {}, outside: {} },
  },

  compoundVariants: [
    // size=full + scrollBehavior=inside
    {
      size: 'full',
      scrollBehavior: 'inside',
      css: {
        content: {
          h: 'full',
          maxH: 'full',
        },
        body: {
          overflow: 'auto',
        },
      },
    },
  ],
})
```

---

## Встроенные анатомии

Chakra UI предоставляет анатомии для всех сложных компонентов:

```typescript
import {
  accordionAnatomy,
  alertAnatomy,
  avatarAnatomy,
  breadcrumbAnatomy,
  cardAnatomy,
  checkboxAnatomy,
  dialogAnatomy,
  drawerAnatomy,
  editableAnatomy,
  menuAnatomy,
  numberInputAnatomy,
  pinInputAnatomy,
  popoverAnatomy,
  progressAnatomy,
  radioAnatomy,
  selectAnatomy,
  sliderAnatomy,
  statAnatomy,
  switchAnatomy,
  tableAnatomy,
  tabsAnatomy,
  tagAnatomy,
  toastAnatomy,
} from '@chakra-ui/react/anatomy'

// Получение slots
const slots = menuAnatomy.keys()
// ['content', 'item', 'itemText', 'itemCommand', 'separator', 'trigger', ...]
```

## См. также

- [recipes.md](recipes.md) — Recipes для простых компонентов
- [visual-feedback.md](visual-feedback.md) — Визуальная обратная связь
- [overview.md](overview.md) — Обзор системы темизации
