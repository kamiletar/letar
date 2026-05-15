import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import {
  accordionRecipe,
  avatarRecipe,
  buttonRecipe,
  cardRecipe,
  checkboxRecipe,
  linkRecipe,
  menuRecipe,
  pinInputRecipe,
  progressRecipe,
  radioRecipe,
  segmentGroupRecipe,
  sliderRecipe,
  stepsRecipe,
  switchRecipe,
  tabsRecipe,
  tagRecipe,
} from './recipes'
import { semanticColors } from './semanticTokens'
import { animationStyles } from './styles/animationStyles'
import { focusGlobalCss, focusStyles } from './styles/focusStyles'
import { layerStyles } from './styles/layerStyles'
import { textStyles } from './styles/textStyles'
import {
  colors,
  durations,
  easings,
  fonts,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  radii,
  shadows,
} from './tokens'

/**
 * Конфигурация темы для driving-school приложения
 *
 * Включает:
 * - Кастомные цветовые палитры (brand, accent, success, warning, error, info)
 * - Полную поддержку Dark Mode через semantic tokens
 * - Typography с шрифтом Nunito
 * - Layer styles для панелей и карточек
 * - Text styles для консистентной типографики
 * - Animation styles для интерактивных элементов
 * - Расширенные :active стили для тактильной обратной связи
 */
const drivingSchoolConfig = defineConfig({
  theme: {
    // Кастомные breakpoints для больших экранов
    breakpoints: {
      '3xl': '1920px',
      '4xl': '2560px',
    },

    // Base tokens
    tokens: {
      colors,
      fonts,
      fontSizes,
      fontWeights,
      lineHeights,
      letterSpacings,
      radii,
      shadows,
      durations,
      easings,
    },

    // Semantic tokens (с поддержкой dark mode)
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
      steps: stepsRecipe,
      segmentGroup: segmentGroupRecipe,
      tabs: tabsRecipe,
      accordion: accordionRecipe,
      switch: switchRecipe,
      checkbox: checkboxRecipe,
      radio: radioRecipe,
      progress: progressRecipe,
      slider: sliderRecipe,
      pinInput: pinInputRecipe,
      tag: tagRecipe,
      avatar: avatarRecipe,
    },

    // Preset styles
    layerStyles: {
      ...layerStyles,
      ...focusStyles,
    },
    textStyles,
    animationStyles,
  },

  // Глобальные стили для focus-visible
  globalCss: focusGlobalCss,
})

/**
 * Система стилей Chakra UI для driving-school
 *
 * Объединяет defaultConfig с кастомной конфигурацией
 */
export const system = createSystem(defaultConfig, drivingSchoolConfig)

// Re-export конфигурации для возможного использования
export { drivingSchoolConfig }
