import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { playerSemanticTokens } from '@letar/video-player-react'

/**
 * Тема приложения — дефолтный Chakra-конфиг + семантические токены плеера
 * (`player.control`, `player.track`, ... — используются `SharedPlayerControls`/
 * `SharedProgressBar` из `@letar/video-player-react` через CSS-переменные).
 */
const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: playerSemanticTokens.colors,
    },
  },
})

export const system = createSystem(defaultConfig, config)
