/**
 * Утилита для celebration эффекта confetti
 *
 * Используется при успешных действиях (бронирование, завершение и т.д.)
 *
 * @module confetti
 */

import confetti from 'canvas-confetti'

/**
 * Запускает celebration эффект с конфетти
 *
 * @param options - настройки эффекта
 */
export function fireCelebration(options?: {
  /** Количество частиц (по умолчанию 100) */
  particleCount?: number
  /** Угол разброса (по умолчанию 60) */
  spread?: number
  /** Начальная позиция Y (по умолчанию 0.6) */
  origin?: { x?: number; y?: number }
}) {
  const { particleCount = 100, spread = 60, origin = { y: 0.6 } } = options ?? {}

  // Запускаем два залпа с разных сторон для более красивого эффекта
  void confetti({
    particleCount: Math.floor(particleCount / 2),
    spread,
    origin: { x: 0.3, y: origin.y },
    colors: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'], // brand colors
  })

  void confetti({
    particleCount: Math.floor(particleCount / 2),
    spread,
    origin: { x: 0.7, y: origin.y },
    colors: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'],
  })
}

/**
 * Запускает более сдержанный эффект конфетти (для небольших успехов)
 */
export function fireSmallCelebration() {
  fireCelebration({ particleCount: 50, spread: 45 })
}

/**
 * Запускает большой эффект конфетти (для значимых достижений)
 */
export function fireBigCelebration() {
  // Серия залпов для эпичного эффекта
  const duration = 1500
  const end = Date.now() + duration

  const frame = () => {
    void confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'],
    })
    void confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899'],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}
