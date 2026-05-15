/**
 * Semantic color tokens для Animatrona
 *
 * Полная поддержка светлой и тёмной тем с _light/_dark вариантами.
 * Используй семантические токены вместо hardcoded цветов:
 *
 * @example
 * // Вместо:
 * bg="gray.900" color="gray.400" borderColor="gray.700"
 *
 * // Используй:
 * bg="bg.subtle" color="fg.muted" borderColor="border"
 */
export const semanticColors = {
  /* ===========================
     Backgrounds
     Цвета фона для различных уровней
  =========================== */
  bg: {
    DEFAULT: {
      value: { _light: 'white', _dark: '{colors.gray.950}' },
    },
    canvas: {
      value: { _light: '{colors.gray.50}', _dark: '{colors.gray.950}' },
    },
    subtle: {
      value: { _light: '{colors.gray.100}', _dark: '{colors.gray.900}' },
    },
    muted: {
      value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' },
    },
    emphasized: {
      value: { _light: '{colors.gray.300}', _dark: '{colors.gray.700}' },
    },
    panel: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    // Для навигации с blur эффектом
    nav: {
      value: { _light: 'rgba(255, 255, 255, 0.9)', _dark: 'rgba(0, 0, 0, 0.8)' },
    },
  },

  /* ===========================
     Foreground
     Цвета текста
  =========================== */
  fg: {
    DEFAULT: {
      value: { _light: '{colors.gray.900}', _dark: '{colors.gray.50}' },
    },
    muted: {
      value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' },
    },
    subtle: {
      value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' },
    },
    inverted: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
  },

  /* ===========================
     Borders
     Цвета границ
  =========================== */
  border: {
    DEFAULT: {
      value: { _light: '{colors.gray.300}', _dark: '{colors.gray.700}' },
    },
    subtle: {
      value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' },
    },
    muted: {
      value: { _light: '{colors.gray.400}', _dark: '{colors.gray.600}' },
    },
    emphasized: {
      value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' },
    },
  },

  /* ===========================
     Primary (Brand = Purple)
     Основной фирменный цвет
  =========================== */
  primary: {
    solid: {
      value: { _light: '{colors.brand.600}', _dark: '{colors.brand.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' },
    },
    muted: {
      value: { _light: '{colors.brand.100}', _dark: '{colors.brand.800}' },
    },
    subtle: {
      value: { _light: '{colors.brand.50}', _dark: '{colors.brand.900}' },
    },
    emphasized: {
      value: { _light: '{colors.brand.800}', _dark: '{colors.brand.700}' },
    },
  },

  /* ===========================
     Accent (Cyan)
     Для медиа-элементов, плеера
  =========================== */
  accent: {
    solid: {
      value: { _light: '{colors.accent.600}', _dark: '{colors.accent.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.accent.700}', _dark: '{colors.accent.300}' },
    },
    muted: {
      value: { _light: '{colors.accent.100}', _dark: '{colors.accent.800}' },
    },
    subtle: {
      value: { _light: '{colors.accent.50}', _dark: '{colors.accent.900}' },
    },
  },

  /* ===========================
     Success (Green)
     Для успешных операций
  =========================== */
  success: {
    solid: {
      value: { _light: '{colors.success.600}', _dark: '{colors.success.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.success.700}', _dark: '{colors.success.300}' },
    },
    muted: {
      value: { _light: '{colors.success.100}', _dark: '{colors.success.800}' },
    },
    subtle: {
      value: { _light: '{colors.success.50}', _dark: '{colors.success.900}' },
    },
  },

  /* ===========================
     Warning (Orange)
     Для предупреждений
  =========================== */
  warning: {
    solid: {
      value: { _light: '{colors.warning.600}', _dark: '{colors.warning.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.warning.700}', _dark: '{colors.warning.300}' },
    },
    muted: {
      value: { _light: '{colors.warning.100}', _dark: '{colors.warning.800}' },
    },
    subtle: {
      value: { _light: '{colors.warning.50}', _dark: '{colors.warning.900}' },
    },
  },

  /* ===========================
     Error (Red)
     Для ошибок
  =========================== */
  error: {
    solid: {
      value: { _light: '{colors.error.600}', _dark: '{colors.error.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.error.700}', _dark: '{colors.error.300}' },
    },
    muted: {
      value: { _light: '{colors.error.100}', _dark: '{colors.error.800}' },
    },
    subtle: {
      value: { _light: '{colors.error.50}', _dark: '{colors.error.900}' },
    },
  },

  /* ===========================
     Info (Blue)
     Для информационных сообщений
  =========================== */
  info: {
    solid: {
      value: { _light: '{colors.info.600}', _dark: '{colors.info.500}' },
    },
    contrast: { value: 'white' },
    fg: {
      value: { _light: '{colors.info.700}', _dark: '{colors.info.300}' },
    },
    muted: {
      value: { _light: '{colors.info.100}', _dark: '{colors.info.800}' },
    },
    subtle: {
      value: { _light: '{colors.info.50}', _dark: '{colors.info.900}' },
    },
  },

  /* ===========================
     Overlay
     Для модалок, backdrop, градиентов
  =========================== */
  overlay: {
    backdrop: {
      value: { _light: 'rgba(0, 0, 0, 0.4)', _dark: 'rgba(0, 0, 0, 0.7)' },
    },
    heavy: {
      value: { _light: 'rgba(0, 0, 0, 0.6)', _dark: 'rgba(0, 0, 0, 0.8)' },
    },
    light: {
      value: { _light: 'rgba(0, 0, 0, 0.2)', _dark: 'rgba(0, 0, 0, 0.5)' },
    },
  },

  /* ===========================
     State
     Интерактивные состояния
  =========================== */
  state: {
    hover: {
      value: { _light: '{colors.blackAlpha.100}', _dark: '{colors.whiteAlpha.100}' },
    },
    active: {
      value: { _light: '{colors.blackAlpha.200}', _dark: '{colors.whiteAlpha.200}' },
    },
  },

  // Выбранное состояние (для активных пунктов меню)
  'state.selected': {
    bg: {
      value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' },
    },
    border: {
      value: { _light: '{colors.brand.500}', _dark: '{colors.brand.500}' },
    },
    fg: {
      value: { _light: '{colors.brand.800}', _dark: '{colors.brand.200}' },
    },
  },

  /* ===========================
     Player
     Специфичные токены для видеоплеера
  =========================== */
  player: {
    track: {
      value: { _light: '{colors.gray.300}', _dark: '{colors.whiteAlpha.300}' },
    },
    range: {
      value: '{colors.brand.500}',
    },
    thumb: {
      value: { _light: '{colors.brand.600}', _dark: 'white' },
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
     Status
     Индикаторы состояния (для статистики, прогресса)
  =========================== */
  status: {
    success: {
      value: { _light: '{colors.success.600}', _dark: '{colors.success.400}' },
    },
    warning: {
      value: { _light: '{colors.warning.600}', _dark: '{colors.warning.400}' },
    },
    error: {
      value: { _light: '{colors.error.600}', _dark: '{colors.error.400}' },
    },
    info: {
      value: { _light: '{colors.info.600}', _dark: '{colors.info.400}' },
    },
    neutral: {
      value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' },
    },
  },

  /* ===========================
     Callout
     Информационные блоки (info/warning/error boxes)
  =========================== */
  callout: {
    // Brand (фиолетовый)
    'brand.bg': {
      value: { _light: '{colors.brand.50}', _dark: '{colors.brand.950}' },
    },
    'brand.border': {
      value: { _light: '{colors.brand.200}', _dark: '{colors.brand.800}' },
    },
    'brand.fg': {
      value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' },
    },

    // Success (зелёный)
    'success.bg': {
      value: { _light: '{colors.success.50}', _dark: '{colors.success.950}' },
    },
    'success.border': {
      value: { _light: '{colors.success.200}', _dark: '{colors.success.700}' },
    },
    'success.fg': {
      value: { _light: '{colors.success.700}', _dark: '{colors.success.300}' },
    },

    // Warning (жёлтый/оранжевый)
    'warning.bg': {
      value: { _light: '{colors.warning.50}', _dark: '{colors.warning.950}' },
    },
    'warning.border': {
      value: { _light: '{colors.warning.200}', _dark: '{colors.warning.700}' },
    },
    'warning.fg': {
      value: { _light: '{colors.warning.700}', _dark: '{colors.warning.300}' },
    },

    // Error (красный)
    'error.bg': {
      value: { _light: '{colors.error.50}', _dark: '{colors.error.950}' },
    },
    'error.border': {
      value: { _light: '{colors.error.200}', _dark: '{colors.error.700}' },
    },
    'error.fg': {
      value: { _light: '{colors.error.700}', _dark: '{colors.error.300}' },
    },

    // Info (синий)
    'info.bg': {
      value: { _light: '{colors.info.50}', _dark: '{colors.info.950}' },
    },
    'info.border': {
      value: { _light: '{colors.info.200}', _dark: '{colors.info.800}' },
    },
    'info.fg': {
      value: { _light: '{colors.info.700}', _dark: '{colors.info.200}' },
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
}
