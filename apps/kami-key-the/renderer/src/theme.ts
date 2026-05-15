/**
 * Тёмная тема KamiKeyThe для Chakra UI v3
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        bg: { value: '#1a1a2e' },
        surface: { value: '#222244' },
        'surface.key': { value: '#2a2a4a' },
        accent: { value: '#6c7ae0' },
        'accent.hover': { value: '#7b89f0' },
        'text.primary': { value: '#e0e0e0' },
        'text.secondary': { value: '#888888' },
        'text.muted': { value: '#666666' },
        'border.subtle': { value: '#3a3a5a' },
        'border.accent': { value: '#4a5a8a' },
        success: { value: '#2a6a2a' },
        'success.hover': { value: '#3a8a3a' },
        danger: { value: '#3a1e1e' },
        'danger.text': { value: '#c66666' },
        'danger.hover': { value: '#5a2a2a' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
