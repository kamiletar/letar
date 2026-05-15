/**
 * Цветовая карта судей
 *
 * 5 ярких цветов для визуальной идентификации судей на матче.
 * Судьи поднимают телефон — зрители видят цвет.
 * Тренеры отводят судей по цвету: "Отвести Красного!"
 *
 * @module judge-colors
 */

/** Цвет судьи (совпадает с enum JudgeColor в schema.zmodel) */
export type JudgeColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'PURPLE'

/** Конфигурация одного цвета */
export interface JudgeColorConfig {
  /** Hex-код для CSS/satori */
  hex: string
  /** Название на русском — именительный падеж (для UI) */
  name: string
  /** Родительный падеж ("Отвести Красного!") */
  nameGenitive: string
  /** Палитра Chakra UI v3 */
  chakra: string
  /** Эмодзи для текстового представления */
  emoji: string
}

/** Карта всех цветов судей */
export const JUDGE_COLORS: Record<JudgeColor, JudgeColorConfig> = {
  RED: { hex: '#E53E3E', name: 'Красный', nameGenitive: 'Красного', chakra: 'red', emoji: '🔴' },
  BLUE: { hex: '#3182CE', name: 'Синий', nameGenitive: 'Синего', chakra: 'blue', emoji: '🔵' },
  GREEN: { hex: '#38A169', name: 'Зелёный', nameGenitive: 'Зелёного', chakra: 'green', emoji: '🟢' },
  YELLOW: { hex: '#D69E2E', name: 'Жёлтый', nameGenitive: 'Жёлтого', chakra: 'yellow', emoji: '🟡' },
  PURPLE: { hex: '#805AD5', name: 'Фиолетовый', nameGenitive: 'Фиолетового', chakra: 'purple', emoji: '🟣' },
} as const

/** Порядок назначения цветов (первый зарегистрированный = RED и т.д.) */
export const COLOR_ORDER: JudgeColor[] = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']

/** Получить конфигурацию цвета по enum-значению */
export function getJudgeColor(color: JudgeColor): JudgeColorConfig {
  return JUDGE_COLORS[color]
}

/** Получить название цвета на русском */
export function getJudgeColorName(color: JudgeColor): string {
  return JUDGE_COLORS[color].name
}

/** Получить hex цвета */
export function getJudgeColorHex(color: JudgeColor): string {
  return JUDGE_COLORS[color].hex
}
