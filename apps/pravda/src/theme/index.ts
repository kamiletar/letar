import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import {
  accordionRecipe,
  buttonRecipe,
  iconButtonRecipe,
  linkRecipe,
  menuRecipe,
  tabsRecipe,
  tagRecipe,
} from './recipes'
import { semanticColors } from './semanticTokens'
import { animationStyles } from './styles'
import { colors } from './tokens'

/**
 * Конфигурация темы для pravda приложения
 *
 * Включает:
 * - Кастомные цветовые палитры (brand: красный, accent: оранжевый)
 * - Полную поддержку Dark Mode через semantic tokens
 * - Recipes с тактильной обратной связью (:active стили)
 * - Animation styles для модальных окон и переходов
 */
const pravdaConfig = defineConfig({
  theme: {
    // Base tokens
    tokens: {
      colors,
    },

    // Semantic tokens (с поддержкой dark mode)
    semanticTokens: {
      colors: semanticColors,
    },

    // Component recipes с тактильной обратной связью
    recipes: {
      button: buttonRecipe,
      iconButton: iconButtonRecipe,
      link: linkRecipe,
    },

    // Slot recipes
    slotRecipes: {
      accordion: accordionRecipe,
      menu: menuRecipe,
      tabs: tabsRecipe,
      tag: tagRecipe,
    },

    // Animation styles
    animationStyles,
  },
})

/**
 * Система стилей Chakra UI для pravda
 *
 * Объединяет defaultConfig с кастомной конфигурацией
 */
export const system = createSystem(defaultConfig, pravdaConfig)

// Re-export конфигурации
export { pravdaConfig }
