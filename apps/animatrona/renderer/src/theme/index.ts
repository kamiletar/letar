import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import { buttonRecipe, linkRecipe } from './recipes'
import { semanticColors } from './semanticTokens'
import { cardRecipe, checkboxRecipe, menuRecipe, progressRecipe, switchRecipe } from './slotRecipes'
import { colors } from './tokens'

/**
 * Конфигурация темы для Animatrona
 *
 * Включает:
 * - Кастомные цветовые палитры (brand = purple, accent = cyan)
 * - Семантические токены для dark-only режима
 * - Recipes с визуальной обратной связью (_active стили)
 * - Slot recipes для checkbox, switch, progress, menu, card
 */
const animatronaConfig = defineConfig({
  theme: {
    // Base tokens
    tokens: {
      colors,
      fonts: {
        body: { value: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        heading: { value: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
      },
    },

    // Semantic tokens (dark-only)
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
      checkbox: checkboxRecipe,
      menu: menuRecipe,
      progress: progressRecipe,
      switch: switchRecipe,
    },
  },
})

/**
 * Система стилей Chakra UI для Animatrona
 *
 * Объединяет defaultConfig с кастомной конфигурацией
 */
export const system = createSystem(defaultConfig, animatronaConfig)

// Re-export конфигурации для возможного использования
export { animatronaConfig }
