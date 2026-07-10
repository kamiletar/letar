'use client'

/**
 * Шаг PERFORMING: поэт на сцене.
 *
 * Счетовод видит имя поэта и нажимает «Выступление окончено».
 * Таймер — read-only, запускает и останавливает ведущий.
 * Если ведущего нет — время не фиксируется, это нормально.
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
import { endPerformanceAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

const WARNING_SEC = 151
const LIMIT_SEC = 181
const PENDING_TIMEOUT_MS = 8000

interface StepPerformingProps {
  match: MatchData & { firstHalfStartTeam: string | null }
  matchState: MatchSSEState | null
}

export function StepPerforming({ match, matchState }: StepPerformingProps) {
  const [elapsed, setElapsed] = useState(0)
  const [isPending, setIsPending] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const animFrameRef = useRef<number>(0)
  const vibratedOvertimeRef = useRef(false)

  const timer = matchState?.timer ?? {
    isRunning: false,
    startedAt: null,
    accumulatedSec: 0,
    performanceId: null,
  }

  const currentPerf = matchState?.currentPerformances[matchState?.currentPerformerIndex ?? 0]

  // Обновление отображения таймера (read-only)
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
      const currentElapsed = timer.accumulatedSec + (Date.now() - timer.startedAt!) / 1000
      setElapsed(currentElapsed)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [timer.isRunning, timer.startedAt, timer.accumulatedSec])

  // Вибрация при переходе через лимит
  useEffect(() => {
    if (!timer.isRunning) {
      return
    }
    if (elapsed >= LIMIT_SEC && !vibratedOvertimeRef.current) {
      vibratedOvertimeRef.current = true
      navigator.vibrate?.([500, 200, 500])
    }
  }, [elapsed, timer.isRunning])

  useEffect(() => {
    if (timer.accumulatedSec === 0 && !timer.isRunning) {
      vibratedOvertimeRef.current = false
    }
  }, [timer.accumulatedSec, timer.isRunning])

  // Авто-сброс isPending — защита от зависшего UI
  useEffect(() => {
    if (!isPending) {
      return
    }
    const t = setTimeout(() => {
      setIsPending(false)
      setError('Нет ответа от сервера. Попробуйте снова.')
    }, PENDING_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [isPending])

  const remaining = LIMIT_SEC - elapsed
  const isOvertime = remaining < 0
  const absRemaining = Math.abs(remaining)
  const minutes = Math.floor(absRemaining / 60)
  const seconds = Math.floor(absRemaining % 60)
  const timeStr = `${isOvertime ? '+' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`

  let timerColor = 'green.500'
  let timerBg = 'green.50'
  if (elapsed >= LIMIT_SEC) {
    timerColor = 'red.500'
    timerBg = 'red.50'
  } else if (elapsed >= WARNING_SEC) {
    timerColor = 'yellow.600'
    timerBg = 'yellow.50'
  }

  const handleEndPerformance = useCallback(
    async (withCard?: boolean) => {
      setShowEndDialog(false)
      setIsPending(true)
      setError(null)
      // withCard=false → передаём LIMIT_SEC (3:01 без штрафа), withCard=true → нет forceDuration (таймер решает)
      const forceDuration = withCard === false ? LIMIT_SEC : undefined
      const res = await endPerformanceAction(match.id, forceDuration)
      setIsPending(false)
      if (!res.success) {
        setError('Не удалось завершить выступление')
      }
    },
    [match.id]
  )

  const handleEndClick = useCallback(() => {
    if (isOvertime) {
      setShowEndDialog(true)
    } else {
      void handleEndPerformance()
    }
  }, [isOvertime, handleEndPerformance])

  // Показываем таймер только если ведущий его уже запустил
  const hasTimer = timer.isRunning || timer.accumulatedSec > 0

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Имя поэта */}
      {currentPerf ? (
        <Box textAlign="center">
          <Badge colorPalette="blue" size="lg" mb={2}>
            {currentPerf.teamName}
          </Badge>
          <Heading size="2xl" mb={1}>
            🎤 {currentPerf.playerName}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            Тайм {matchState?.currentHalf ?? 1} · Раунд {matchState?.currentRound ?? 1}
          </Text>
        </Box>
      ) : (
        <Box textAlign="center" py={4}>
          <Text color="fg.muted">Ожидание данных...</Text>
        </Box>
      )}

      {/* Таймер — read-only, только если ведущий его запустил */}
      {hasTimer && (
        <Box
          bg={timerBg}
          borderRadius="xl"
          px={6}
          py={5}
          textAlign="center"
          w="full"
          _dark={{ bg: `${timerColor}/10` }}
        >
          <Text fontSize="xs" color="fg.muted" mb={1}>
            {timer.isRunning ? (isOvertime ? 'ПРЕВЫШЕНИЕ ЛИМИТА' : 'Оставшееся время') : 'Время остановлено'}
          </Text>
          <Text color={timerColor} fontSize="7xl" fontWeight="bold" fontFamily="mono" lineHeight="1">
            {timeStr}
          </Text>
          {isOvertime && (
            <Text color="red.500" fontSize="sm" fontWeight="bold" mt={2}>
              🟡 Жёлтая карточка
            </Text>
          )}
        </Box>
      )}

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      {/* Главная кнопка счетовода */}
      <Button
        size="2xl"
        colorPalette={isOvertime ? 'orange' : 'green'}
        onClick={handleEndClick}
        loading={isPending}
        py={10}
        fontSize="xl"
        w="full"
      >
        ✓ Выступление окончено
      </Button>

      {/* Диалог при овертайме: жёлтая карточка? */}
      <DialogRoot open={showEndDialog} onOpenChange={(d) => setShowEndDialog(d.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🟡 Жёлтая карточка?</DialogTitle>
            <CloseButton />
          </DialogHeader>
          <DialogBody>
            <Text fontWeight="bold" color="red.fg" mb={1}>
              Поэт превысил лимит 3:01
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Выдать жёлтую карточку за превышение времени?
            </Text>
          </DialogBody>
          <DialogFooter>
            <HStack gap={3} wrap="wrap">
              <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                Отмена
              </Button>
              <Button
                colorPalette="gray"
                variant="outline"
                onClick={() => handleEndPerformance(false)}
                loading={isPending}
              >
                Без карточки
              </Button>
              <Button colorPalette="yellow" onClick={() => handleEndPerformance(true)} loading={isPending}>
                🟡 Выдать карточку
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </VStack>
  )
}
