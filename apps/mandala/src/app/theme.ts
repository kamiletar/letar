import { createSystem, defaultConfig, defineConfig, defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

/**
 * Кастомные рецепты для компонентов
 */
const heading = defineRecipe({
  base: {
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
})

const button = defineRecipe({
  base: {
    _active: {
      transform: 'scale(.95)',
    },
  },
  variants: {
    size: {
      sm: {
        _active: {
          transform: 'scale(.8)',
        },
      },
    },
    variant: {
      solid: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.solid/50',
          },
        },
      },
      outline: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
        },
      },
      ghost: {
        _active: {
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
          color: 'fg',
          _hover: {
            bg: 'bg.muted',
          },
        },
      },
    },
  },
})

const menu = defineSlotRecipe({
  slots: [],
  variants: {
    variant: {
      subtle: {
        item: {
          _active: {
            bg: 'fg.muted',
            transform: 'scale(0.95)',
          },
        },
      },
    },
  },
})

const card = defineSlotRecipe({
  slots: [],
  variants: {
    variant: {
      outline: {
        root: {
          _active: {
            'a&:hover': {
              bg: 'fg.muted',
              transform: 'scale(0.95) !important',
            },
          },
        },
      },
    },
  },
})

const link = defineRecipe({
  base: {
    transition: 'all 0.1s',
    _active: {
      transform: 'scale(.9)',
    },
  },
  variants: {
    variant: {
      plain: {
        color: 'fg',
        _active: {
          '&:hover': {
            bg: 'currentColor/50',
          },
        },
      },
      underline: {
        _active: {
          '&:hover': {
            bg: 'currentColor/50',
          },
        },
      },
    },
  },
})

const toast = defineSlotRecipe({
  base: {
    root: {
      '&[data-type=error]': {
        bg: 'pink.500',
        color: 'pink.50',
      },
      '&[data-type=success]': {
        bg: 'fg.500',
        color: 'fg.50',
      },
    },
  },
  slots: ['root'],
})

/**
 * Конфигурация темы для mandala приложения
 *
 * Включает:
 * - Фирменный фиолетовый цвет (fg)
 * - Тёмный фон для галереи
 * - Кастомные рецепты для компонентов
 */
const mandalaConfig = defineConfig({
  theme: {
    slotRecipes: {
      toast,
      card,
      menu,
    },
    recipes: {
      heading,
      link,
      button,
    },
    tokens: {
      colors: {
        // Фирменный фиолетовый цвет (полная палитра)
        fg: {
          '50': { value: '#EDEDF8' },
          '100': { value: '#D9D8F0' },
          '200': { value: '#B3B0E0' },
          '300': { value: '#8C86D0' },
          '400': { value: '#6660C0' },
          '500': { value: '#201380' }, // Основной цвет
          '600': { value: '#1A0F66' },
          '700': { value: '#140C4D' },
          '800': { value: '#0E0833' },
          '900': { value: '#08051A' },
          '950': { value: '#04020D' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Брендовый фиолетовый — для акцентов (используй fg.brand для логотипа)
        fg: {
          DEFAULT: {
            value: {
              _light: '{colors.gray.900}', // Тёмный текст на светлом фоне
              _dark: '{colors.gray.50}', // Светлый текст на тёмном фоне
            },
          },
          // Брендовый цвет для акцентов (логотип, заголовки)
          brand: {
            value: {
              _light: '{colors.fg.600}', // Более тёмный для контраста на светлом
              _dark: '{colors.fg.300}', // Более светлый для контраста на тёмном
            },
          },
          solid: {
            value: {
              _light: '{colors.fg.500}',
              _dark: '{colors.fg.500}',
            },
          },
          contrast: {
            value: {
              _light: 'white',
              _dark: 'white',
            },
          },
          fg: {
            value: {
              _light: '{colors.fg.500}',
              _dark: '{colors.fg.500}',
            },
          },
          muted: {
            value: {
              _light: '{colors.gray.600}',
              _dark: '{colors.gray.400}',
            },
          },
          subtle: {
            value: {
              _light: '{colors.fg.300}',
              _dark: '{colors.fg.100}',
            },
          },
          emphasized: {
            value: {
              _light: '{colors.fg.700}',
              _dark: '{colors.fg.700}',
            },
          },
        },
        // Фон приложения
        'bg.canvas': {
          value: {
            _light: '{colors.gray.50}',
            _dark: '#111111',
          },
        },
        // Фон навигации с blur
        'bg.nav': {
          value: {
            _light: 'rgba(255, 255, 255, 0.9)',
            _dark: 'rgba(0, 0, 0, 0.8)',
          },
        },
        // Фон панелей (drawer, sidebar)
        'bg.panel': {
          value: {
            _light: 'white',
            _dark: '{colors.gray.900}',
          },
        },
        // Фон при наведении
        'bg.hover': {
          value: {
            _light: '{colors.blackAlpha.100}',
            _dark: '{colors.whiteAlpha.100}',
          },
        },
        // Тонкая граница
        'border.subtle': {
          value: {
            _light: '{colors.blackAlpha.200}',
            _dark: '{colors.whiteAlpha.200}',
          },
        },
      },
    },
  },
  // globalCss удалён для предотвращения hydration mismatch с next-themes
  // Глобальные стили body заданы в global.css через .dark/.light классы
})

/**
 * Система стилей Chakra UI для mandala
 *
 * Объединяет defaultConfig с кастомной конфигурацией
 */
export const system = createSystem(defaultConfig, mandalaConfig)

// Re-export конфигурации для возможного использования
export { mandalaConfig }
