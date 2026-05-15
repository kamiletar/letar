import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

/**
 * Card slot recipe с тактильной обратной связью для интерактивных карточек
 *
 * Примечание: :active стили для карточек-ссылок применяются через CSS в global.css
 * или через прямые пропсы _active на компонентах
 */
export const cardRecipe = defineSlotRecipe({
  slots: ['root', 'header', 'body', 'footer', 'title', 'description'],
  variants: {
    variant: {
      outline: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
      elevated: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
      subtle: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
    },
  },
})

/**
 * Menu slot recipe с тактильной обратной связью для пунктов меню
 */
export const menuRecipe = defineSlotRecipe({
  slots: [
    'root',
    'trigger',
    'content',
    'item',
    'itemText',
    'itemCommand',
    'separator',
    'group',
    'groupLabel',
    'indicator',
    'itemIndicator',
  ],
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
 * Steps slot recipe
 */
export const stepsRecipe = defineSlotRecipe({
  slots: [
    'root',
    'list',
    'item',
    'trigger',
    'indicator',
    'separator',
    'content',
    'title',
    'description',
    'nextTrigger',
    'prevTrigger',
    'progress',
  ],
  base: {
    indicator: {
      // Цвет текста на текущем шаге устанавливается через CSS или пропсы
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
 * Tabs slot recipe с тактильной обратной связью
 */
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
 * Switch recipe с анимацией
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
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
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
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
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
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
 * Progress recipe
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
 */
export const progressRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'track', 'range', 'valueText', 'view', 'circle', 'circleTrack', 'circleRange'],
  base: {
    root: {
      colorPalette: 'brand',
    },
  },
})

/**
 * Slider recipe
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
 */
export const sliderRecipe = defineSlotRecipe({
  slots: [
    'root',
    'control',
    'track',
    'range',
    'thumb',
    'label',
    'valueText',
    'marker',
    'markerIndicator',
    'markerGroup',
  ],
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
 * PinInput recipe
 * colorPalette устанавливается в base.root для переопределения дефолтного gray
 */
export const pinInputRecipe = defineSlotRecipe({
  slots: ['root', 'control', 'input', 'label'],
  base: {
    root: {
      colorPalette: 'brand',
    },
  },
})

/**
 * Tag recipe с тактильной обратной связью для интерактивных тегов
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
 * Avatar recipe
 */
export const avatarRecipe = defineSlotRecipe({
  slots: ['root', 'image', 'fallback', 'group'],
  base: {
    root: {
      transition: 'all 0.1s ease-out',
    },
  },
})

/**
 * IconButton-like behavior для иконок в интерактивных контейнерах
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
      xs: {
        _active: { transform: 'scale(0.8)' },
      },
      sm: {
        _active: { transform: 'scale(0.85)' },
      },
      md: {
        _active: { transform: 'scale(0.9)' },
      },
      lg: {
        _active: { transform: 'scale(0.92)' },
      },
    },
  },
})
