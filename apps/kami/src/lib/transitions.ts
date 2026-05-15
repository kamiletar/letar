/**
 * Стандартизированные transition значения для анимаций.
 * Используй эти константы вместо хардкод строк для консистентности.
 */
export const transitions = {
  /** Быстрый transition (0.15s) — для небольших элементов, hover эффектов */
  fast: 'all 0.15s ease-out',
  /** Стандартный transition (0.2s) — для большинства интерактивных элементов */
  normal: 'all 0.2s ease-out',
  /** Медленный transition (0.3s) — для крупных элементов, карточек */
  slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  /** Только цвет (0.2s) — для hover эффектов текста */
  color: 'color 0.2s ease',
  /** Только transform (0.3s) — для эффектов движения */
  transform: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export type TransitionKey = keyof typeof transitions
