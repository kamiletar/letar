'use client'

/**
 * Таймер выступления (3 минуты)
 *
 * Клиентский отсчёт на основе startedAt + accumulatedSec из SSE.
 * Цвета: зелёный (0-2:29), жёлтый (2:30-2:59), красный (3:00+).
 * Вибрация: короткая на 2:30, длинная на 3:00.
 */

import type { TimerState } from '@/lib/sse/match-state'
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { resetTimerAction, startTimerAction, stopTimerAction } from '../_actions/presenter.action'

// === Константы ===

/** Предупреждение (жёлтый) */
const WARNING_SEC = 150 // 2:30
/** Лимит (красный) */
const LIMIT_SEC = 180 // 3:00

interface PerformanceTimerProps {
  matchId: string
  /** Состояние таймера из SSE */
  timer: TimerState
  /** Показывать кнопки управления (для ведущего) */
  showControls?: boolean
}

export function PerformanceTimer({ matchId, timer, showControls = false }: PerformanceTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const animFrameRef = useRef<number>(0)
  const vibratedWarningRef = useRef(false)
  const vibratedLimitRef = useRef(false)

  // Обновление отображения таймера
  useEffect(() => {
    if (!timer.isRunning || !timer.startedAt) {
      setElapsed(timer.accumulatedSec)
      cancelAnimationFrame(animFrameRef.current)
      return
    }

    let running = true
    const tick = () => {
      if (!running) {
        return
      }
      const now = Date.now()
      const currentElapsed = timer.accumulatedSec + (now - timer.startedAt!) / 1000
      setElapsed(currentElapsed)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [timer.isRunning, timer.startedAt, timer.accumulatedSec])

  // Вибрация (только для ведущего с кнопками)
  useEffect(() => {
    if (!showControls || !timer.isRunning) {
      return
    }

    if (elapsed >= WARNING_SEC && !vibratedWarningRef.current) {
      vibratedWarningRef.current = true
      navigator.vibrate?.(200)
    }
    if (elapsed >= LIMIT_SEC && !vibratedLimitRef.current) {
      vibratedLimitRef.current = true
      navigator.vibrate?.([500, 200, 500])
    }
  }, [elapsed, showControls, timer.isRunning])

  // Сброс вибрации при ресете
  useEffect(() => {
    if (timer.accumulatedSec === 0 && !timer.isRunning) {
      vibratedWarningRef.current = false
      vibratedLimitRef.current = false
    }
  }, [timer.accumulatedSec, timer.isRunning])

  // Форматирование времени
  const minutes = Math.floor(elapsed / 60)
  const seconds = Math.floor(elapsed % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Цвет
  let timerColor = 'green.500'
  let timerBg = 'green.50'
  if (elapsed >= LIMIT_SEC) {
    timerColor = 'red.500'
    timerBg = 'red.50'
  } else if (elapsed >= WARNING_SEC) {
    timerColor = 'yellow.600'
    timerBg = 'yellow.50'
  }

  const handleStart = useCallback(async () => {
    setIsPending(true)
    await startTimerAction(matchId)
    setIsPending(false)
  }, [matchId])

  const handleStop = useCallback(async () => {
    setIsPending(true)
    await stopTimerAction(matchId)
    setIsPending(false)
  }, [matchId])

  const handleReset = useCallback(async () => {
    setIsPending(true)
    await resetTimerAction(matchId)
    setIsPending(false)
  }, [matchId])

  return (
    <VStack gap={2} w="full">
      <Box bg={timerBg} borderRadius="xl" px={6} py={4} textAlign="center" w="full" _dark={{ bg: `${timerColor}/10` }}>
        <Text color={timerColor} fontSize="5xl" fontWeight="bold" fontFamily="mono" lineHeight="1">
          {timeStr}
        </Text>
        {elapsed >= LIMIT_SEC && (
          <Text color="red.500" fontSize="sm" fontWeight="bold" mt={1}>
            ПРЕВЫШЕНИЕ ЛИМИТА
          </Text>
        )}
      </Box>

      {showControls && (
        <HStack gap={2} w="full">
          {!timer.isRunning ? (
            <Button
              onClick={handleStart}
              disabled={isPending}
              colorPalette="green"
              size="lg"
              flex={1}
              fontWeight="bold"
            >
              ▶ Старт
            </Button>
          ) : (
            <Button onClick={handleStop} disabled={isPending} colorPalette="red" size="lg" flex={1} fontWeight="bold">
              ⏹ Стоп
            </Button>
          )}
          <Button
            onClick={handleReset}
            disabled={isPending || timer.isRunning}
            variant="outline"
            size="lg"
            fontWeight="bold"
          >
            ↺
          </Button>
        </HStack>
      )}
    </VStack>
  )
}
