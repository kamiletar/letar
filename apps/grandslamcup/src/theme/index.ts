import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { pressableConfig } from '@letar/ui'

import {
  accordionRecipe,
  buttonRecipe,
  cardRecipe,
  checkboxRecipe,
  linkRecipe,
  menuRecipe,
  radioRecipe,
  segmentGroupRecipe,
  sliderRecipe,
  switchRecipe,
  tabsRecipe,
  tagRecipe,
} from './recipes'
import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Конфигурация темы для Grand Slam Cup
 *
 * Включает:
 * - Кастомные цветовые палитры (brand: красный #FF0000, accent: синий #0051FF)
 * - Полную поддержку Dark Mode через semantic tokens
 * - Расширенные :active стили для тактильной обратной связи
 */
const grandslamcupConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    semanticTokens: {
      colors: semanticColors,
    },

    // Component recipes
    recipes: {
      button: buttonRecipe,
      link: linkRecipe,
    },

    // Slot recipes
    slotRecipes: {
      card: cardRecipe,
      menu: menuRecipe,
      tabs: tabsRecipe,
      accordion: accordionRecipe,
      segmentGroup: segmentGroupRecipe,
      switch: switchRecipe,
      checkbox: checkboxRecipe,
      radio: radioRecipe,
      slider: sliderRecipe,
      tag: tagRecipe,
    },
    keyframes: {
      ...pressableConfig.keyframes,
      livePulse: {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.5' },
      },
      fadeInUp: {
        from: { opacity: '0', transform: 'translateY(20px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
      slideInLeft: {
        from: { opacity: '0', transform: 'translateX(-20px)' },
        to: { opacity: '1', transform: 'translateX(0)' },
      },
      scaleIn: {
        from: { opacity: '0', transform: 'scale(0.95)' },
        to: { opacity: '1', transform: 'scale(1)' },
      },
      shimmer: {
        from: { backgroundPosition: '-200% 0' },
        to: { backgroundPosition: '200% 0' },
      },
      glowPulse: {
        '0%, 100%': { boxShadow: '0 0 8px rgba(255,0,0,0.3)' },
        '50%': { boxShadow: '0 0 20px rgba(255,0,0,0.6)' },
      },
    },
  },
  globalCss: {
    ...pressableConfig.globalCss,
    '.live-pulse': {
      animation: 'livePulse 1.5s ease-in-out infinite',
    },
    '.fade-in-up': {
      animation: 'fadeInUp 0.6s ease-out both',
    },
    '.slide-in-left': {
      animation: 'slideInLeft 0.5s ease-out both',
    },
    '.scale-in': {
      animation: 'scaleIn 0.4s ease-out both',
    },
    '.glow-pulse': {
      animation: 'glowPulse 2s ease-in-out infinite',
    },
    /* Задержки для staggered анимаций */
    '.stagger-1': { animationDelay: '0.1s' },
    '.stagger-2': { animationDelay: '0.2s' },
    '.stagger-3': { animationDelay: '0.3s' },
    '.stagger-4': { animationDelay: '0.4s' },
    '.stagger-5': { animationDelay: '0.5s' },
  },
})

/**
 * Система стилей Chakra UI для Grand Slam Cup
 */
export const system = createSystem(defaultConfig, grandslamcupConfig)
