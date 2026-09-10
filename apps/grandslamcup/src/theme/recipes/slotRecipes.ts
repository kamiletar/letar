import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

// ⚠️ `slots` здесь ОБЯЗАН перечислять слоты в том же порядке, что и настоящая anatomy
// компонента (`menuAnatomy`/`tabsAnatomy`/... в `@chakra-ui/react/dist/esm/anatomy.js`), а не
// только те, что реально переопределяются. `createSystem(defaultConfig, appConfig)` мержит
// конфиги через `mergeWith`, а её `merge()` для двух массивов проходит только `source.length`
// элементов и перезаписывает `target[i] = source[i]` по ИНДЕКСУ — не по значению. Короткий или
// переставленный массив молча заменяет элементы настоящей anatomy на свои имена по позиции,
// теряя реальные слоты (например `positioner` у `menu`) и создавая дубликаты. Разбор и образец —
// `apps/domwellbes/src/theme/recipes/controls.ts`.
const menuAnatomyOrder = [
  'arrow',
  'arrowTip',
  'content',
  'contextTrigger',
  'indicator',
  'item',
  'itemGroup',
  'itemGroupLabel',
  'itemIndicator',
  'itemText',
  'positioner',
  'separator',
  'trigger',
  'triggerItem',
  'itemCommand',
] as const

const tabsAnatomyOrder = ['root', 'trigger', 'list', 'content', 'contentGroup', 'indicator'] as const

const sliderAnatomyOrder = [
  'root',
  'label',
  'thumb',
  'valueText',
  'track',
  'range',
  'control',
  'markerGroup',
  'marker',
  'draggingIndicator',
  'markerIndicator',
  'markerLabel',
] as const

/**
 * Card slot recipe с transition для интерактивных вариантов
 */
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

/**
 * Menu slot recipe с тактильной обратной связью
 */
export const menuRecipe = defineSlotRecipe({
  slots: [...menuAnatomyOrder],
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

/**
 * Tabs slot recipe с тактильной обратной связью
 */
export const tabsRecipe = defineSlotRecipe({
  slots: [...tabsAnatomyOrder],
  base: {
    trigger: {
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.95)',
      },
    },
  },
})

/**
 * Accordion slot recipe с тактильной обратной связью
 */
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

/**
 * SegmentGroup slot recipe
 */
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

/**
 * Switch recipe
 */
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

/**
 * Checkbox recipe
 */
export const checkboxRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'indicator', 'group'],
  base: {
    root: {
      colorPalette: 'brand',
      cursor: 'pointer',
    },
    label: {
      cursor: 'pointer',
    },
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.9)',
      },
    },
  },
})

/**
 * Radio recipe
 */
export const radioRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'indicator', 'group'],
  base: {
    root: {
      colorPalette: 'brand',
      cursor: 'pointer',
    },
    label: {
      cursor: 'pointer',
    },
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.9)',
      },
    },
  },
})

/**
 * Slider recipe с увеличением thumb при :active
 */
export const sliderRecipe = defineSlotRecipe({
  slots: [...sliderAnatomyOrder],
  base: {
    root: {
      colorPalette: 'brand',
    },
    thumb: {
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(1.1)',
      },
    },
  },
})

/**
 * Tag recipe с тактильной обратной связью
 */
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

/**
 * IconButton recipe.
 *
 * Глубина нажатия НЕ переведена на общую `pressScale` (@letar/ui) намеренно: иконка —
 * визуально мелкая поверхность, для неё нужно проседание заметнее, чем даёт общая шкала
 * (0.8…0.92 против 0.94…0.98 у pressScale в том же диапазоне размеров). Осознанное
 * расхождение, не забытая миграция.
 */
export const iconButtonRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.85)',
    },
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
