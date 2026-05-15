/**
 * Кастомная тема Chakra UI для mobile-ui плеера
 *
 * Включает:
 * - Глобальные стили (dark theme, overscroll-behavior)
 * - Настройки для мобильных устройств
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  globalCss: {
    // Базовые стили
    '*': {
      boxSizing: 'border-box',
    },
    'html, body, #root': {
      height: '100dvh', // dynamic viewport height
      minHeight: '100vh', // fallback для старых браузеров
      margin: 0,
      padding: 0,
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    // Предотвращаем pull-to-refresh на мобильных
    body: {
      overscrollBehavior: 'none',
    },
  },
})

export const system = createSystem(defaultConfig, config)
