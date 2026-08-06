'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface BreathingOverlayProps {
  /** Включена ли анимация дыхания */
  enabled: boolean
  /** Длительность одного цикла вдох-выдох в секундах */
  cycleDuration?: number
  /** Показывать подсказки дыхания */
  showHints?: boolean
}

/**
 * Анимация дыхания — пульсация с подсказками вдох/выдох.
 * Создаёт медитативный эффект синхронизации с дыханием.
 */
export function BreathingOverlay({ enabled, cycleDuration = 8, showHints = true }: BreathingOverlayProps) {
  const [phase, setPhase] = useState<'inhale' | 'hold-in' | 'exhale' | 'hold-out'>('inhale')

  // Цикл дыхания: вдох (4с) → задержка (1с) → выдох (4с) → задержка (1с)
  // Общий цикл примерно 10 секунд, но можно масштабировать
  useEffect(() => {
    if (!enabled) {
      setPhase('inhale') // Сброс при отключении
      return
    }

    const scale = cycleDuration / 10 // Масштаб относительно 10-секундного цикла
    const inhaleTime = 4000 * scale
    const holdInTime = 1000 * scale
    const exhaleTime = 4000 * scale
    const holdOutTime = 1000 * scale

    // Массив для хранения всех таймаутов — очищаем все при unmount
    const timeouts: NodeJS.Timeout[] = []

    const runCycle = () => {
      setPhase('inhale')
      timeouts.push(
        setTimeout(() => {
          setPhase('hold-in')
          timeouts.push(
            setTimeout(() => {
              setPhase('exhale')
              timeouts.push(
                setTimeout(() => {
                  setPhase('hold-out')
                  timeouts.push(setTimeout(runCycle, holdOutTime))
                }, exhaleTime),
              )
            }, holdInTime),
          )
        }, inhaleTime),
      )
    }

    runCycle()

    return () => {
      // Очищаем ВСЕ таймауты, не только последний
      timeouts.forEach(clearTimeout)
    }
  }, [enabled, cycleDuration])

  if (!enabled) {
    return null
  }

  const phaseLabels: Record<typeof phase, string> = {
    inhale: 'Вдох...',
    'hold-in': 'Задержка',
    exhale: 'Выдох...',
    'hold-out': 'Пауза',
  }

  const isExpanding = phase === 'inhale'
  const animationDuration = `${cycleDuration / 2}s`

  return (
    <>
      {/* CSS анимация пульсации */}
      <style>
        {`
          @keyframes breathe-in {
            from { transform: scale(1); }
            to { transform: scale(1.05); }
          }
          @keyframes breathe-out {
            from { transform: scale(1.05); }
            to { transform: scale(1); }
          }
        `}
      </style>

      {/* Оверлей с пульсацией */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        animation={isExpanding
          ? `breathe-in ${animationDuration} ease-in-out`
          : `breathe-out ${animationDuration} ease-in-out`}
        style={{ transformOrigin: 'center center' }}
      />

      {/* Подсказки дыхания */}
      {showHints && (
        <VStack
          position="absolute"
          bottom={20}
          left="50%"
          transform="translateX(-50%)"
          zIndex={10002}
          gap={2}
          pointerEvents="none"
        >
          <Box bg="blackAlpha.600" backdropFilter="blur(4px)" borderRadius="full" px={6} py={2}>
            <Text color="white" fontSize="lg" fontWeight="medium" opacity={0.9}>
              {phaseLabels[phase]}
            </Text>
          </Box>

          {/* Индикатор прогресса */}
          <Box w={16} h={1} bg="whiteAlpha.300" borderRadius="full" overflow="hidden">
            <Box
              h="100%"
              bg="white"
              borderRadius="full"
              animation={`${phase === 'inhale' || phase === 'exhale' ? 'progress' : 'none'} ${
                cycleDuration / 4
              }s linear`}
              opacity={0.8}
            />
          </Box>
        </VStack>
      )}
    </>
  )
}
