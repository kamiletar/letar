'use client'

/**
 * Экран PERFORMING для ведущего.
 *
 * Крупный обратный отсчёт. Ведущий управляет таймером (Стоп/Продолжить/Сброс).
 * Кнопки «Выступление окончено» у ведущего НЕТ — это только у скорера.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import {
  Badge,
  Box,
  Button,
  CloseButton,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  HStack,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'

import { useCallback, useEffect, useRef, useState } from 'react'
import { endPerformanceAction } from '../../score/_actions/scorer.action'
import { resetTimerAction, startTimerAction, stopTimerAction } from '../_actions/presenter.action'

// === Константы ===

/** Предупреждение (жёлтый): 151 секунда */
const WARNING_SEC = 151
/** Лимит (красный): 181 секунда — конец 3:01 */
const LIMIT_SEC = 181

interface PresenterPerformingProps {
  match: { id: string }
  matchState: MatchSSEState | null
}

export function PresenterPerforming({ match, matchState }: PresenterPerformingProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const animFrameRef = useRef<number>(0)
  const vibratedWarningRef = useRef(false)
  const vibratedOvertimeRef = useRef(false)

  const timer = matchState?.timer ?? {
    isRunning: false,
    startedAt: null,
    accumulatedSec: 0,
    performanceId: null,
  }

  const currentPerf = matchState?.currentPerformances[matchState?.currentPerformerIndex ?? 0]

  // Ключ sessionStorage для резервного хранения времени старта
  const sessionKey = `timer:${match.id}:startedAt`

  // Сохраняем startedAt в sessionStorage — резерв на случай перезагрузки страницы
  useEffect(() => {
    if (timer.isRunning && timer.startedAt) {
      sessionStorage.setItem(sessionKey, String(timer.startedAt))
    } else if (!timer.isRunning) {
      sessionStorage.removeItem(sessionKey)
    }
  }, [timer.isRunning, timer.startedAt, sessionKey])

  // Обновление таймера
  useEffect(() => {
    // Если SSE ещё не пришёл (startedAt null), пробуем восстановить из sessionStorage
    const fallbackStartedAt = !timer.startedAt
      ? (() => {
          const saved = sessionStorage.getItem(sessionKey)
          return saved ? Number(saved) : null
        })()
      : null

    const effectiveStartedAt = timer.startedAt ?? fallbackStartedAt

    if (!timer.isRunning || !effectiveStartedAt) {
      setElapsed(timer.accumulatedSec)
      cancelAnimationFrame(animFrameRef.current)
      return
    }

    let running = true
    const tick = () => {
      if (!running) return
      const now = Date.now()
      const currentElapsed = timer.accumulatedSec + (now - effectiveStartedAt) / 1000
      setElapsed(currentElapsed)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [timer.isRunning, timer.startedAt, timer.accumulatedSec, sessionKey])

  // Вибрация
  useEffect(() => {
    if (!timer.isRunning) return
    if (elapsed >= WARNING_SEC && !vibratedWarningRef.current) {
      vibratedWarningRef.current = true
      navigator.vibrate?.(300)
    }
    if (elapsed >= LIMIT_SEC && !vibratedOvertimeRef.current) {
      vibratedOvertimeRef.current = true
      navigator.vibrate?.([500, 200, 500])
    }
  }, [elapsed, timer.isRunning])

  // Сброс вибрации
  useEffect(() => {
    if (timer.accumulatedSec === 0 && !timer.isRunning) {
      vibratedWarningRef.current = false
      vibratedOvertimeRef.current = false
    }
  }, [timer.accumulatedSec, timer.isRunning])

  // Обратный отсчёт от 3:01
  const remaining = LIMIT_SEC - elapsed
  const isOvertime = remaining < 0
  const absRemaining = Math.abs(remaining)
  const minutes = Math.floor(absRemaining / 60)
  const seconds = Math.floor(absRemaining % 60)
  const timeStr = `${isOvertime ? '-' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`

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

  const handleStop = useCallback(async () => {
    // Захватываем elapsed прямо в момент клика — до сетевой задержки
    const elapsedAtClick = elapsed
    setIsPending(true)
    await stopTimerAction(match.id, elapsedAtClick)
    setIsPending(false)
  }, [match.id, elapsed])

  const handleStart = useCallback(async () => {
    setIsPending(true)
    await startTimerAction(match.id)
    setIsPending(false)
  }, [match.id])

  const handleReset = useCallback(async () => {
    setShowResetDialog(false)
    setIsPending(true)
    await resetTimerAction(match.id)
    setIsPending(false)
  }, [match.id])

  const handleEndPerformance = useCallback(
    async (forceDurationSec?: number) => {
      setShowEndDialog(false)
      setIsPending(true)
      setError(null)
      const res = await endPerformanceAction(match.id, forceDurationSec)
      setIsPending(false)
      if (!res.success) {
        setError('Не удалось завершить выступление')
      }
    },
    [match.id]
  )

  const handleEndClick = useCallback(() => {
    // При овертайме — запрашиваем подтверждение (жёлтая карточка)
    if (isOvertime) {
      setShowEndDialog(true)
    } else {
      handleEndPerformance()
    }
  }, [isOvertime, handleEndPerformance])

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Поэт */}
      {currentPerf && (
        <Box textAlign="center">
          <Badge colorPalette="blue" size="lg" mb={2}>
            {currentPerf.teamName}
          </Badge>
          <Heading size="2xl">🎤 {currentPerf.playerName}</Heading>
        </Box>
      )}

      {/* Крупный таймер */}
      <Box bg={timerBg} borderRadius="2xl" px={6} py={8} textAlign="center" w="full" _dark={{ bg: `${timerColor}/10` }}>
        {isOvertime && (
          <Text color="red.500" fontSize="sm" fontWeight="bold" mb={2}>
            ПРЕВЫШЕНИЕ ЛИМИТА
          </Text>
        )}
        <Text color={timerColor} fontSize="9xl" fontWeight="bold" fontFamily="mono" lineHeight="1">
          {timeStr}
        </Text>
        <Text fontSize="xs" color="fg.muted" mt={2}>
          {isOvertime ? 'Жёлтая карточка' : 'Оставшееся время'}
        </Text>
      </Box>

      {/* Кнопки управления */}
      <HStack gap={2} w="full">
        {timer.isRunning ? (
          <Button
            onClick={handleStop}
            disabled={isPending}
            colorPalette="red"
            size="xl"
            flex={1}
            fontWeight="bold"
            py={7}
          >
            ⏹ Стоп
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isPending}
            colorPalette="green"
            size="xl"
            flex={1}
            fontWeight="bold"
            py={7}
          >
            ▶ Продолжить
          </Button>
        )}
        <Button
          onClick={() => setShowResetDialog(true)}
          disabled={isPending}
          variant="outline"
          size="xl"
          fontWeight="bold"
          py={7}
          title="Сбросить таймер"
        >
          ↺
        </Button>
      </HStack>

      {/* Кнопка «Выступление окончено» — только когда таймер остановлен */}
      {!timer.isRunning && (
        <>
          <Button
            size="2xl"
            colorPalette="green"
            onClick={handleEndClick}
            loading={isPending}
            py={8}
            fontSize="xl"
            w="full"
          >
            ✓ Выступление окончено
          </Button>
          <Text textAlign="center" fontSize="2xl" fontWeight="bold" fontFamily="mono" color="fg.muted">
            {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}
          </Text>
        </>
      )}

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      {/* Диалог подтверждения сброса */}
      <DialogRoot open={showResetDialog} onOpenChange={(d) => setShowResetDialog(d.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сброс таймера</DialogTitle>
            <CloseButton />
          </DialogHeader>
          <DialogBody>
            <Text>Вы уверены, что хотите сбросить таймер? Накопленное время будет потеряно.</Text>
          </DialogBody>
          <DialogFooter>
            <HStack gap={3}>
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                Отмена
              </Button>
              <Button colorPalette="red" onClick={handleReset}>
                Сбросить
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Диалог подтверждения завершения при овертайме */}
      <DialogRoot open={showEndDialog} onOpenChange={(d) => setShowEndDialog(d.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🟡 Жёлтая карточка</DialogTitle>
            <CloseButton />
          </DialogHeader>
          <DialogBody>
            <Text fontWeight="bold" color="red.fg" mb={2}>
              Поэт превысил лимит времени 3:01
            </Text>
            <Text>Завершение выступления зафиксирует жёлтую карточку. Подтвердите завершение.</Text>
          </DialogBody>
          <DialogFooter>
            <HStack gap={3} wrap="wrap">
              <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                Отмена
              </Button>
              <Button
                colorPalette="gray"
                variant="outline"
                onClick={() => handleEndPerformance(LIMIT_SEC)}
                loading={isPending}
              >
                Без карточки (3:01)
              </Button>
              <Button colorPalette="yellow" onClick={() => handleEndPerformance()} loading={isPending}>
                🟡 С жёлтой карточкой
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </VStack>
  )
}
