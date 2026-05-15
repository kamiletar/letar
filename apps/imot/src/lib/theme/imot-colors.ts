/**
 * Цветовая схема ИМОТ для разных уровней диагностики
 *
 * Каждый уровень имеет свой уникальный цвет, который используется
 * во всех компонентах для визуальной идентификации и консистентности
 */

/**
 * Типы уровней диагностики ИМОТ
 */
export type ImotLevel = 'numerology' | 'neuroPsych' | 'energy' | 'body' | 'style' | 'integration'

/**
 * Конфигурация цветов для уровня
 */
export interface LevelColorConfig {
  /**
   * Основной цвет уровня (hex)
   */
  primary: string

  /**
   * Фон с прозрачностью (rgba)
   */
  bg: string

  /**
   * Цвет границы
   */
  border: string

  /**
   * Цвет текста
   */
  text: string

  /**
   * Название уровня на русском
   */
  name: string

  /**
   * Короткое название
   */
  shortName: string
}

/**
 * Цветовая схема ИМОТ
 *
 * 🔴 Нумерология - Коралловый (#FF6B6B)
 * 🔵 Нейропсихология - Бирюзовый (#4ECDC4)
 * 🟡 Энергетика - Золотисто-желтый (#FFE66D)
 * 🟢 Тело - Мятный (#95E1D3)
 * 🟠 Стиль - Персиковый (#F38181)
 * 🟣 Интеграция - Фиолетовый (#667eea)
 */
export const imotColors: Record<ImotLevel, LevelColorConfig> = {
  numerology: {
    primary: '#FF6B6B',
    bg: 'rgba(255, 107, 107, 0.08)',
    border: '#FF6B6B',
    text: '#FF6B6B',
    name: 'Нумерология',
    shortName: 'Нумерология',
  },
  neuroPsych: {
    primary: '#4ECDC4',
    bg: 'rgba(78, 205, 196, 0.08)',
    border: '#4ECDC4',
    text: '#4ECDC4',
    name: 'Нейропсихология',
    shortName: 'Нейропсихология',
  },
  energy: {
    primary: '#FFE66D',
    bg: 'rgba(255, 230, 109, 0.08)',
    border: '#FFE66D',
    text: '#D4BC3A', // Темнее для лучшей читаемости
    name: 'Энергетика',
    shortName: 'Энергетика',
  },
  body: {
    primary: '#95E1D3',
    bg: 'rgba(149, 225, 211, 0.08)',
    border: '#95E1D3',
    text: '#5FBFAD', // Темнее для лучшей читаемости
    name: 'Тело',
    shortName: 'Тело',
  },
  style: {
    primary: '#F38181',
    bg: 'rgba(243, 129, 129, 0.08)',
    border: '#F38181',
    text: '#F38181',
    name: 'Стиль',
    shortName: 'Стиль',
  },
  integration: {
    primary: '#667eea',
    bg: 'rgba(102, 126, 234, 0.08)',
    border: '#667eea',
    text: '#667eea',
    name: 'Интеграция',
    shortName: 'Интеграция',
  },
}

/**
 * Получить цветовую конфигурацию для уровня
 */
export function getLevelColor(level: ImotLevel): LevelColorConfig {
  return imotColors[level]
}

/**
 * Статусные цвета (для сессий, практик и т.д.)
 */
export const statusColors = {
  success: '#48BB78',
  warning: '#ED8936',
  error: '#E53E3E',
  info: '#4299E1',
  neutral: '#A8A8A8',
} as const

/**
 * Цвета чакр
 */
export const chakraColors = {
  ROOT: '#E53E3E', // Красный
  SACRAL: '#ED8936', // Оранжевый
  SOLAR_PLEXUS: '#ECC94B', // Желтый
  HEART: '#48BB78', // Зеленый
  THROAT: '#4299E1', // Голубой
  THIRD_EYE: '#805AD5', // Фиолетовый
  CROWN: '#D53F8C', // Пурпурный
} as const

/**
 * Цвета для этапов трансформации
 */
export const transformationStageColors = {
  DIAGNOSTICS: imotColors.numerology.primary,
  INTEGRATION: imotColors.integration.primary,
  STRATEGY: imotColors.neuroPsych.primary,
  PRACTICE: imotColors.energy.primary,
  RESULT: imotColors.style.primary,
} as const

/**
 * Градиенты
 */
export const imotGradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  warm: 'linear-gradient(135deg, #F38181 0%, #FFE66D 100%)',
  cool: 'linear-gradient(135deg, #4ECDC4 0%, #95E1D3 100%)',
  rainbow: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 20%, #FFE66D 40%, #95E1D3 60%, #F38181 80%, #667eea 100%)',
} as const
