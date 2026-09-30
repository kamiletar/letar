# Визуальная обратная связь

CSS-эффекты при взаимодействии с элементами — scale, opacity, transitions.

## Основной паттерн: transform: scale()

Уменьшение элемента при нажатии создаёт ощущение "нажатия кнопки".

### Рекомендуемые значения scale

| Размер элемента    | Scale при :active | Элементы                 |
| ------------------ | ----------------- | ------------------------ |
| xs/sm              | 0.8-0.9           | Маленькие кнопки, иконки |
| md                 | 0.95              | Стандартные кнопки       |
| lg/xl              | 0.97-0.98         | Большие кнопки           |
| Карточки           | 0.99              | Интерактивные карточки   |
| **Thumb (slider)** | **1.1**           | **Увеличение!**          |

---

## Button Recipe

```typescript
// apps/driving-school/src/theme/recipes/button.ts
import { defineRecipe } from '@chakra-ui/react'

export const buttonRecipe = defineRecipe({
  base: {
    // Плавный переход обязателен!
    transition: 'all 0.15s ease-out',

    // Визуальная обратная связь
    _active: {
      transform: 'scale(0.95)',
    },

    // Отключаем для disabled
    _disabled: {
      _active: { transform: 'none' },
    },
  },

  variants: {
    // Разный scale для разных размеров
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

---

## Link Recipe

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

---

## IconButton Recipe

```typescript
export const iconButtonRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: { transform: 'scale(0.85)' },
  },

  variants: {
    size: {
      xs: { _active: { transform: 'scale(0.8)' } },
      sm: { _active: { transform: 'scale(0.85)' } },
      md: { _active: { transform: 'scale(0.9)' } },
      lg: { _active: { transform: 'scale(0.92)' } },
    },
  },
})
```

---

## Slot Recipes

### Menu

```typescript
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

### Tabs

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

### Accordion

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

### Checkbox & Radio

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

### Slider (увеличение thumb!)

```typescript
export const sliderRecipe = defineSlotRecipe({
  slots: ['root', 'track', 'filledTrack', 'thumb', 'mark', 'valueText'],

  base: {
    thumb: {
      transition: 'all 0.1s ease-out',
      // Thumb УВЕЛИЧИВАЕТСЯ при активации!
      _active: {
        transform: 'scale(1.1)',
      },
    },
  },
})
```

### SegmentGroup

```typescript
export const segmentGroupRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'item', 'itemText', 'itemControl', 'indicator'],
  base: {
    item: {
      transition: 'all 0.1s ease-out',
      cursor: 'pointer',
      _active: {
        transform: 'scale(0.98)',
      },
    },
  },
})
```

### Switch

```typescript
export const switchRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'thumb', 'indicator'],
  base: {
    root: {
      colorPalette: 'brand',
    },
    control: {
      transition: 'all 0.15s ease-out',
    },
    thumb: {
      transition: 'all 0.15s ease-out',
    },
  },
})
```

### Card (transition для интерактивных вариантов)

```typescript
export const cardRecipe = defineSlotRecipe({
  slots: ['root', 'header', 'body', 'footer', 'title', 'description'],
  variants: {
    variant: {
      outline: {
        root: { transition: 'all 0.15s ease-out' },
      },
      elevated: {
        root: { transition: 'all 0.15s ease-out' },
      },
      subtle: {
        root: { transition: 'all 0.15s ease-out' },
      },
    },
  },
})
```

### Tag (close button)

```typescript
export const tagRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'closeTrigger', 'startElement', 'endElement'],

  base: {
    root: {
      transition: 'all 0.1s ease-out',
    },
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

---

## Layer Style для карточек

```typescript
// apps/driving-school/src/theme/styles/layerStyles.ts
export const layerStyles = {
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

  'card.selectable': {
    value: {
      bg: 'bg.surface',
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
}
```

Использование:

```tsx
<Box layerStyle="card.interactive" onClick={handleClick}>
  Кликабельная карточка
</Box>
```

---

## Важные рекомендации

### 1. Transition обязателен

```typescript
// ❌ Без transition — резкий эффект
_active: { transform: 'scale(0.95)' }

// ✅ С transition — плавный эффект
transition: 'all 0.15s ease-out',
_active: { transform: 'scale(0.95)' }
```

### 2. Оптимальная длительность

| Длительность | Использование                    |
| ------------ | -------------------------------- |
| 0.1s         | Быстрые интеракции (клики, табы) |
| 0.15s        | Кнопки, карточки                 |
| 0.2s         | Сложные переходы                 |

### 3. Easing функция

```typescript
// Рекомендуется
transition: 'all 0.15s ease-out'

// Альтернативы
transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
```

### 4. Отключай для disabled

```typescript
_disabled: {
  opacity: 0.5,
  cursor: 'not-allowed',
  _active: { transform: 'none' },  // Без эффекта!
}
```

### 5. Не переусердствуй

```typescript
// ❌ Слишком агрессивно
_active: {
  transform: 'scale(0.7)'
}

// ✅ Достаточно
_active: {
  transform: 'scale(0.95)'
}
```

### 6. Slider thumb — исключение

Для slider thumb используй **увеличение** (1.1), а не уменьшение:

```typescript
thumb: {
  _active: { transform: 'scale(1.1)' },  // Увеличение!
}
```

---

## Комбинированная обратная связь

```typescript
// Scale + фон + тень
button: defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: {
      transform: 'scale(0.95)',
      bg: 'colorPalette.solid/80',
      shadow: 'none',
    },
  },
})

// Scale + opacity
link: defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.9)',
      opacity: 0.7,
    },
  },
})
```

## См. также

- [recipes.md](recipes.md) — Recipes
- [slot-recipes.md](slot-recipes.md) — Slot Recipes
- [haptic-feedback.md](haptic-feedback.md) — Тактильная обратная связь
- [animations.md](animations.md) — Анимации
