'use client'

/**
 * Confetti — компонент для celebration анимаций
 *
 * Используется для:
 * - Завершения онбординга
 * - Успешного бронирования занятия
 * - Достижений и наград
 *
 * @module confetti
 */

import { Box, Portal } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { useCallback, useEffect, useState } from 'react'

// Анимация падения конфетти
const fallAnimation = keyframes({
  '0%': {
    transform: 'translateY(-100vh) rotate(0deg)',
    opacity: 1,
  },
  '100%': {
    transform: 'translateY(100vh) rotate(720deg)',
    opacity: 0,
  },
})

// Анимация горизонтального движения
const swayAnimation = keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '50%': { transform: 'translateX(20px)' },
})

// Цвета конфетти
const CONFETTI_COLORS = [
  '#FF6B6B', // красный
  '#4ECDC4', // бирюзовый
  '#45B7D1', // голубой
  '#96CEB4', // зелёный
  '#FFEAA7', // жёлтый
  '#DDA0DD', // сиреневый
  '#F39C12', // оранжевый
  '#9B59B6', // фиолетовый
]

interface ConfettiPiece {
  id: number
  left: number
  color: string
  size: number
  delay: number
  duration: number
}

interface ConfettiProps {
  /** Активировать анимацию */
  active: boolean
  /** Количество частиц (по умолчанию 50) */
  count?: number
  /** Длительность анимации в секундах (по умолчанию 3) */
  duration?: number
  /** Callback при завершении анимации */
  onComplete?: () => void
}

/**
 * Компонент Confetti для celebration анимаций
 *
 * @example
 * ```tsx
 * const [showConfetti, setShowConfetti] = useState(false)
 *
 * <Confetti
 *   active={showConfetti}
 *   onComplete={() => setShowConfetti(false)}
 * />
 *
 * // Активация
 * setShowConfetti(true)
 * ```
 */
export function Confetti({ active, count = 50, duration = 3, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  // Генерация частиц конфетти
  const generatePieces = useCallback(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 10 + 5,
      delay: Math.random() * 0.5,
      duration: duration + Math.random(),
    }))
  }, [count, duration])

  useEffect(() => {
    if (active) {
      setPieces(generatePieces())

      // Очистка после анимации
      const timeout = setTimeout(
        () => {
          setPieces([])
          onComplete?.()
        },
        (duration + 1) * 1000
      )

      return () => clearTimeout(timeout)
    }

    setPieces([])
    return undefined
  }, [active, duration, generatePieces, onComplete])

  if (pieces.length === 0) {
    return null
  }

  return (
    <Portal>
      <Box position="fixed" inset={0} pointerEvents="none" zIndex={9999} overflow="hidden" aria-hidden="true">
        {pieces.map((piece) => (
          <Box
            key={piece.id}
            position="absolute"
            left={`${piece.left}%`}
            top={0}
            width={`${piece.size}px`}
            height={`${piece.size}px`}
            bg={piece.color}
            borderRadius={Math.random() > 0.5 ? 'full' : 'sm'}
            animation={`${fallAnimation} ${piece.duration}s ease-out ${piece.delay}s forwards, ${swayAnimation} 1s ease-in-out ${piece.delay}s infinite`}
          />
        ))}
      </Box>
    </Portal>
  )
}

/**
 * Хук для управления confetti анимацией
 *
 * @example
 * ```tsx
 * const { showConfetti, triggerConfetti, ConfettiComponent } = useConfetti()
 *
 * // В JSX
 * <ConfettiComponent />
 *
 * // Активация
 * triggerConfetti()
 * ```
 */
export function useConfetti(options?: Omit<ConfettiProps, 'active'>) {
  const [showConfetti, setShowConfetti] = useState(false)

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true)
  }, [])

  const ConfettiComponent = useCallback(
    () => <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} {...options} />,
    [showConfetti, options]
  )

  return {
    showConfetti,
    triggerConfetti,
    ConfettiComponent,
  }
}
