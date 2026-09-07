'use client'

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSlotRecipe,
} from '@chakra-ui/react'
import { ColorModeProvider, type ColorModeProviderProps } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import { pressableConfig, pressScale } from '@letar/ui'
import { useEffect } from 'react'

// ─── Recipes с :active тактильной обратной связью ──────────────────────
// Глубина нажатия — общая шкала pressScale (@letar/ui), см. её JSDoc за логикой шагов
// и двумя классами легитимных исключений (мелкие поверхности, рост вместо проседания).

/** Кнопки: scale при нажатии, адаптация по размеру */
const buttonRecipe = defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: { transform: pressScale.md },
    _disabled: { _active: { transform: 'none' } },
  },
  variants: {
    size: {
      // xs/sm — мелкая поверхность (компактная кнопка), вне диапазона шкалы, как
      // iconButtonRecipe/checkboxRecipe в driving-school — см. allowedMatches ниже по файлу.
      xs: { _active: { transform: 'scale(0.9)' } },
      sm: { _active: { transform: 'scale(0.9)' } },
      md: { _active: { transform: pressScale.md } },
      lg: { _active: { transform: pressScale.lg } },
      xl: { _active: { transform: pressScale.xl } },
    },
    variant: {
      solid: { _active: { bg: 'colorPalette.solid/80' } },
      outline: { _active: { bg: 'colorPalette.muted' } },
      ghost: { _active: { bg: 'bg.muted' } },
      subtle: { _active: { bg: 'colorPalette.emphasized' } },
      surface: { _active: { bg: 'bg.muted' } },
      plain: { _active: { opacity: 0.8 } },
    },
  },
})

/** Ссылки: scale + opacity при нажатии */
const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: { transform: pressScale.xs, opacity: 0.7 },
  },
})

/** Табы: scale при нажатии */
const tabsRecipe = defineSlotRecipe({
  slots: ['root', 'list', 'trigger', 'content', 'indicator'],
  base: {
    trigger: {
      transition: 'all 0.1s ease-out',
      _active: { transform: pressScale.xs },
    },
  },
})

/** Меню: scale + bg при нажатии на пункт */
const menuRecipe = defineSlotRecipe({
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
          _active: { bg: 'bg.muted', transform: pressScale.lg },
        },
      },
    },
  },
})

/** Аккордеон: лёгкий scale при нажатии */
const accordionRecipe = defineSlotRecipe({
  slots: ['root', 'item', 'itemTrigger', 'itemContent', 'itemIndicator', 'itemBody'],
  base: {
    itemTrigger: {
      transition: 'all 0.1s ease-out',
      _active: { bg: 'bg.subtle', transform: pressScale['2xl'] },
    },
  },
})

/** Чекбокс: scale при нажатии + brand palette */
const checkboxRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'indicator', 'group'],
  base: {
    root: { colorPalette: 'brand', cursor: 'pointer' },
    label: { cursor: 'pointer' },
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      // Мелкая поверхность (control чекбокса) — вне диапазона pressScale, см. её JSDoc.
      _active: { transform: 'scale(0.9)' },
    },
  },
})

/** Радио: scale при нажатии + brand palette */
const radioRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'indicator', 'group'],
  base: {
    root: { colorPalette: 'brand', cursor: 'pointer' },
    label: { cursor: 'pointer' },
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      // Мелкая поверхность (control радио) — вне диапазона pressScale, см. её JSDoc.
      _active: { transform: 'scale(0.9)' },
    },
  },
})

/** Свитч: brand palette + плавные переходы */
const switchRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'thumb', 'indicator'],
  base: {
    root: { colorPalette: 'brand' },
    control: { transition: 'all 0.15s ease-out' },
    thumb: { transition: 'all 0.15s ease-out' },
  },
})

/** Тег: scale для closeTrigger */
const tagRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'closeTrigger', 'startElement', 'endElement'],
  base: {
    root: { transition: 'all 0.1s ease-out' },
    closeTrigger: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      // Мелкая поверхность (close-триггер тега) — вне диапазона pressScale, см. её JSDoc.
      _active: { transform: 'scale(0.85)' },
    },
  },
})

/** Слайдер: увеличение thumb при нажатии */
const sliderRecipe = defineSlotRecipe({
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
    root: { colorPalette: 'brand' },
    thumb: {
      transition: 'all 0.1s ease-out',
      // Рост при захвате, не проседание — другая механика, pressScale не подходит по семантике.
      _active: { transform: 'scale(1.1)' },
    },
  },
})

/** Прогресс: brand palette */
const progressRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'track', 'range', 'valueText', 'view', 'circle', 'circleTrack', 'circleRange'],
  base: {
    root: { colorPalette: 'brand' },
  },
})

// ─── Конфигурация темы ─────────────────────────────────────────────

const animatronaConfig = defineConfig({
  globalCss: {
    ...pressableConfig.globalCss,
  },
  theme: {
    keyframes: {
      ...pressableConfig.keyframes,
    },
    tokens: {
      colors: {
        // Основная палитра — индиго/фиолетовый
        brand: {
          50: { value: '#EEF2FF' },
          100: { value: '#E0E7FF' },
          200: { value: '#C7D2FE' },
          300: { value: '#A5B4FC' },
          400: { value: '#818CF8' },
          500: { value: '#6366F1' },
          600: { value: '#4F46E5' },
          700: { value: '#4338CA' },
          800: { value: '#3730A3' },
          900: { value: '#312E81' },
        },
        // Акцентный цвет — циан для контраста
        accent: {
          50: { value: '#ECFEFF' },
          100: { value: '#CFFAFE' },
          200: { value: '#A5F3FC' },
          300: { value: '#67E8F9' },
          400: { value: '#22D3EE' },
          500: { value: '#06B6D4' },
          600: { value: '#0891B2' },
          700: { value: '#0E7490' },
          800: { value: '#155E75' },
          900: { value: '#164E63' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'colorPalette.solid': { value: '{colors.brand.500}' },
        'colorPalette.contrast': { value: 'white' },
        'colorPalette.fg': { value: '{colors.brand.700}' },
        'colorPalette.muted': { value: '{colors.brand.100}' },
        'colorPalette.subtle': { value: '{colors.brand.50}' },
        'colorPalette.emphasized': { value: '{colors.brand.200}' },
        'colorPalette.focusRing': { value: '{colors.brand.500}' },
      },
    },
    recipes: {
      button: buttonRecipe,
      link: linkRecipe,
    },
    slotRecipes: {
      tabs: tabsRecipe,
      menu: menuRecipe,
      accordion: accordionRecipe,
      checkbox: checkboxRecipe,
      radio: radioRecipe,
      switch: switchRecipe,
      tag: tagRecipe,
      slider: sliderRecipe,
      progress: progressRecipe,
    },
  },
})

const system = createSystem(defaultConfig, animatronaConfig)

export function Provider(props: ColorModeProviderProps) {
  // iOS-фикс: без touchstart-листенера :active не срабатывает
  useEffect(() => {
    document.addEventListener('touchstart', () => undefined, { passive: true })
  }, [])

  return (
    <ChakraProvider value={system}>
      <FormI18nProvider locale="ru">
        <ColorModeProvider {...props} />
      </FormI18nProvider>
    </ChakraProvider>
  )
}
