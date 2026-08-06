'use client'

/**
 * Полноэкранный таймер для ведущего.
 *
 * Занимает весь viewport, огромные «резиновые» цифры через clamp(),
 * показывает обратный отсчёт от 3:00 → 0:00.
 * Видно из зала на максимально большом расстоянии.
 *
 * Кнопки старт/стоп/сброс крупные. Переиспользует существующие
 * presenter server actions для синхронизации таймера по SSE.
 */

import type { TimerState } from '@/lib/sse/match-state'
import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPause, LuPlay, LuRotateCcw, LuX } from 'react-icons/lu'

import { resetTimerAction, startTimerAction, stopTimerAction } from '../_actions/presenter.action'

/** Лимит выступления (3 минуты) */
const LIMIT_SEC = 180
/** Жёлтая зона (30 сек до конца) */
const WARNING_SEC = 150

interface FullscreenTimerProps {
  matchId: string
  timer: TimerState
  onClose: () => void
  /** Имя текущего поэта — показывается сверху крупными буквами */
  performerName?: string
}

export function FullscreenTimer({ matchId, timer, onClose, performerName }: FullscreenTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const animFrameRef = useRef<number>(0)
  const vibratedWarningRef = useRef(false)
  const vibratedLimitRef = useRef(false)

  // Обновление отображения таймера (animation frame)
  useEffect(() => {
    if (!timer.isRunning || !timer.startedAt) {
      setElapsed(timer.accumulatedSec)
      cancelAnimationFrame(animFrameRef.current)
      return
    }

    let running = true
    const tick = () => {
      if (!running) return
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

  // Вибрация на предупреждении и лимите
  useEffect(() => {
    if (!timer.isRunning) return

    if (elapsed >= WARNING_SEC && !vibratedWarningRef.current) {
      vibratedWarningRef.current = true
      navigator.vibrate?.(200)
    }
    if (elapsed >= LIMIT_SEC && !vibratedLimitRef.current) {
      vibratedLimitRef.current = true
      navigator.vibrate?.([500, 200, 500])
    }
  }, [elapsed, timer.isRunning])

  // Сброс вибрации при ресете
  useEffect(() => {
    if (timer.accumulatedSec === 0 && !timer.isRunning) {
      vibratedWarningRef.current = false
      vibratedLimitRef.current = false
    }
  }, [timer.accumulatedSec, timer.isRunning])

  // Выход по ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Запрет скролла body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Обратный отсчёт 3:00 → 0:00 → -0:01, -0:02...
  const remainingSec = LIMIT_SEC - elapsed
  const isOvertime = remainingSec < 0
  const displaySec = Math.abs(remainingSec)
  const minutes = Math.floor(displaySec / 60)
  const seconds = Math.floor(displaySec % 60)
  const timeStr = `${isOvertime ? '+' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`

  // Цвет: зелёный → жёлтый (30 сек до конца) → красный (превышение)
  let timerColor: string
  if (isOvertime) {
    timerColor = '#ef4444' // red-500
  } else if (elapsed >= WARNING_SEC) {
    timerColor = '#eab308' // yellow-500
  } else {
    timerColor = '#22c55e' // green-500
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
    <Box
      position="fixed"
      inset={0}
      bg="black"
      zIndex={9999}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={{ base: 4, md: 8 }}
      p={{ base: 4, md: 8 }}
    >
      {/* Кнопка закрытия — сверху справа */}
      <Button
        position="absolute"
        top={4}
        right={4}
        size="lg"
        variant="ghost"
        color="white"
        onClick={onClose}
        _hover={{ bg: 'whiteAlpha.200' }}
      >
        <LuX size={28} /> Выйти
      </Button>

      {/* Имя выступающего поэта */}
      {performerName && (
        <Text
          color="white"
          fontSize={{ base: '2xl', md: '4xl' }}
          fontWeight="bold"
          textAlign="center"
          textTransform="uppercase"
          letterSpacing="wider"
          opacity={0.8}
        >
          🎤 {performerName}
        </Text>
      )}

      {/* Огромные «резиновые» цифры таймера */}
      <Text
        color={timerColor}
        fontSize="clamp(6rem, 30vw, 40rem)"
        fontFamily="mono"
        fontWeight="black"
        lineHeight="0.85"
        textAlign="center"
        style={{
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 60px currentColor',
        }}
      >
        {timeStr}
      </Text>

      {isOvertime && (
        <Text color="red.300" fontSize={{ base: 'xl', md: '3xl' }} fontWeight="bold" textTransform="uppercase">
          ⚠ Превышение лимита
        </Text>
      )}

      {/* Кнопки управления — крупные */}
      <HStack gap={{ base: 3, md: 6 }}>
        {!timer.isRunning
          ? (
            <Button
              onClick={handleStart}
              disabled={isPending}
              colorPalette="green"
              size="2xl"
              fontWeight="bold"
              px={{ base: 6, md: 12 }}
              py={{ base: 6, md: 8 }}
              fontSize={{ base: 'lg', md: '2xl' }}
            >
              <LuPlay /> Старт
            </Button>
          )
          : (
            <Button
              onClick={handleStop}
              disabled={isPending}
              colorPalette="red"
              size="2xl"
              fontWeight="bold"
              px={{ base: 6, md: 12 }}
              py={{ base: 6, md: 8 }}
              fontSize={{ base: 'lg', md: '2xl' }}
            >
              <LuPause /> Стоп
            </Button>
          )}
        <Button
          onClick={handleReset}
          disabled={isPending || timer.isRunning}
          variant="outline"
          colorPalette="gray"
          size="2xl"
          color="white"
          borderColor="whiteAlpha.400"
          _hover={{ bg: 'whiteAlpha.200' }}
          px={{ base: 4, md: 8 }}
          py={{ base: 6, md: 8 }}
          fontSize={{ base: 'lg', md: '2xl' }}
        >
          <LuRotateCcw /> Сброс
        </Button>
      </HStack>
    </Box>
  )
}
