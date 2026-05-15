/**
 * Shared semantic tokens для видеоплеера
 *
 * Используются в Electron (animatrona) и Web (animatrona-web) приложениях.
 * Подключаются через spread в semanticTokens.colors каждой темы.
 *
 * В Electron используется {colors.brand.500} (= purple.500).
 * В Web тоже brand = purple, поэтому токены общие.
 */

export const playerSemanticTokens = {
  colors: {
    /* ===========================
       Player
       Специфичные токены для видеоплеера
    =========================== */
    player: {
      track: {
        value: { _light: '{colors.gray.300}', _dark: '{colors.whiteAlpha.300}' },
      },
      range: {
        value: '{colors.purple.500}',
      },
      thumb: {
        value: { _light: '{colors.purple.600}', _dark: 'white' },
      },
      control: {
        value: { _light: '{colors.gray.700}', _dark: 'white' },
      },
      chapter: {
        value: { _light: '{colors.yellow.500}', _dark: '{colors.yellow.400}' },
      },
      marker: {
        value: { _light: '{colors.yellow.500}', _dark: '{colors.yellow.400}' },
      },
    },

    // Маркеры глав при наведении (отдельная секция для вложенных токенов)
    'player.marker': {
      hover: {
        value: { _light: '{colors.yellow.400}', _dark: '{colors.yellow.300}' },
      },
    },

    /* ===========================
       UpNext Overlay
       Карточка "следующий контент" в плеере
    =========================== */
    upNext: {
      // Эпизод (синяя тема)
      'episode.badge': {
        value: { _light: '{colors.blue.500}', _dark: '{colors.blue.500}' },
      },
      'episode.button': {
        value: { _light: '{colors.blue.600}', _dark: '{colors.blue.500}' },
      },
      // Сиквел (фиолетовая тема)
      'sequel.badge': {
        value: { _light: '{colors.purple.500}', _dark: '{colors.purple.500}' },
      },
      'sequel.button': {
        value: { _light: '{colors.purple.600}', _dark: '{colors.purple.500}' },
      },
    },
  },
}
