'use client'

import { AbsoluteCenter, Box, HStack, IconButton, ProgressCircle, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPause, LuPlay, LuRotateCcw, LuX } from 'react-icons/lu'

interface MeditationTimerProps {
  /** Включён ли режим медитации */
  enabled: boolean
  /** Длительность медитации в минутах */
  duration: number
  /** Callback при завершении */
  onComplete?: () => void
  /** Callback при отмене */
  onCancel?: () => void
  /** Видимость (синхронизация с интерфейсом) */
  visible?: boolean
}

/**
 * Таймер медитации с визуальным прогрессом.
 * Показывает оставшееся время и круговой прогресс-бар.
 */
export function MeditationTimer({ enabled, duration, onComplete, onCancel, visible = true }: MeditationTimerProps) {
  const t = useTranslations('viewer.aria')
  const [isPaused, setIsPaused] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Стабильные ref'ы для колбэков — избегаем рестарта интервала при смене функций
  const onCompleteRef = useRef(onComplete)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  // Сброс таймера при изменении длительности
  useEffect(() => {
    setRemainingSeconds(duration * 60)
    setIsPaused(false)
  }, [duration])

  // Запуск/остановка таймера
  useEffect(() => {
    if (!enabled || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          // Вызов через ref — избегаем рестарта интервала при смене колбэка
          onCompleteRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, isPaused]) // onComplete убран из deps — используем ref

  const handleReset = useCallback(() => {
    setRemainingSeconds(duration * 60)
    setIsPaused(false)
  }, [duration])

  // Обёртка для onCancel — используем ref для стабильности
  const handleCancel = useCallback(() => {
    onCancelRef.current?.()
  }, [])

  if (!enabled) {
    return null
  }

  const totalSeconds = duration * 60
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return (
    <Box
      position="absolute"
      top={4}
      right={4}
      zIndex={10002}
      bg="blackAlpha.700"
      backdropFilter="blur(10px)"
      borderRadius="xl"
      p={3}
      opacity={visible ? 1 : 0}
      pointerEvents={visible ? 'auto' : 'none'}
      transition="opacity 0.3s"
    >
      <VStack gap={2}>
        {/* Заголовок */}
        <HStack justify="space-between" w="100%">
          <Text color="white" fontSize="xs" fontWeight="medium">
            Медитация
          </Text>
          <IconButton
            aria-label={t('close')}
            size="xs"
            variant="ghost"
            colorPalette="whiteAlpha"
            onClick={handleCancel}
          >
            <LuX />
          </IconButton>
        </HStack>

        {/* Круговой прогресс с временем */}
        <ProgressCircle.Root value={progress} size="md" colorPalette="purple">
          <ProgressCircle.Circle css={{ '& circle': { strokeWidth: 4 } }}>
            <ProgressCircle.Track />
            <ProgressCircle.Range strokeLinecap="round" />
          </ProgressCircle.Circle>
          <AbsoluteCenter>
            <Text color="white" fontSize="sm" fontWeight="bold" fontFamily="mono">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </AbsoluteCenter>
        </ProgressCircle.Root>

        {/* Кнопки управления */}
        <HStack gap={1}>
          <IconButton
            aria-label={isPaused ? t('continue') : t('pause')}
            size="xs"
            variant="solid"
            colorPalette={isPaused ? 'green' : 'gray'}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <LuPlay /> : <LuPause />}
          </IconButton>
          <IconButton
            aria-label={t('restart')}
            size="xs"
            variant="ghost"
            colorPalette="whiteAlpha"
            onClick={handleReset}
          >
            <LuRotateCcw />
          </IconButton>
        </HStack>

        {/* Статус */}
        {remainingSeconds === 0 && (
          <Text color="green.400" fontSize="xs">
            Медитация завершена
          </Text>
        )}
      </VStack>
    </Box>
  )
}
