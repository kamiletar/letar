'use client'

/**
 * Основной клиентский компонент экрана судьи
 *
 * Состояния: регистрация → ожидание (полноэкранный цвет) → голосование → результат
 * Судья в очереди видит серый экран с позицией.
 * Mobile-first: крупные кнопки, минимум текста.
 */

import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import type { JudgeColor } from '@/lib/judge-colors'
import { Box, VStack } from '@chakra-ui/react'
import { useState } from 'react'

import { RegisterForm } from './register-form'
import { VoteButtons } from './vote-buttons'
import { WaitingScreen } from './waiting-screen'

interface JudgeClientProps {
  matchId: string
  matchStatus: string
  half: number
  inviteKey: string | null
  existingSession: {
    name: string
    judgeNumber: number
    color?: JudgeColor | null
    isQueued?: boolean
    queuePosition?: number
  } | null
}

export function JudgeClient({ matchId, matchStatus, half, inviteKey, existingSession }: JudgeClientProps) {
  const [registered, setRegistered] = useState(!!existingSession)
  const [judgeName, setJudgeName] = useState(existingSession?.name ?? '')
  const [judgeNumber, setJudgeNumber] = useState(existingSession?.judgeNumber ?? 0)
  const [judgeColor, setJudgeColor] = useState<JudgeColor | null>(existingSession?.color ?? null)
  const [isQueued, setIsQueued] = useState(existingSession?.isQueued ?? false)
  const [queuePosition, setQueuePosition] = useState(existingSession?.queuePosition ?? 0)

  const { matchState, status } = useMatchSSE({
    matchId,
    role: 'judge',
    enabled: registered,
  })

  const phase = matchState?.phase ?? 'IDLE'
  const currentPerf = matchState?.currentPerformances?.[matchState?.currentPerformerIndex ?? 0]

  // Проверяем актуальные данные из SSE (автозамена может промоутить из очереди)
  const sseJudge = matchState?.judges?.find((j) => j.judgeNumber === judgeNumber)
  const actualColor = sseJudge?.color ?? judgeColor
  const actualIsQueued = isQueued && !sseJudge

  // Шаг 1: Регистрация
  if (!registered) {
    return (
      <JudgeLayout>
        <RegisterForm
          matchId={matchId}
          half={half}
          inviteKey={inviteKey ?? ''}
          onRegistered={(name, number, color, queued, qPos) => {
            setJudgeName(name)
            setJudgeNumber(number)
            setJudgeColor(color ?? null)
            setIsQueued(queued ?? false)
            setQueuePosition(qPos ?? 0)
            setRegistered(true)
          }}
        />
      </JudgeLayout>
    )
  }

  // Судья в очереди — не может голосовать, только ждать
  if (actualIsQueued) {
    return (
      <WaitingScreen
        judgeName={judgeName}
        judgeNumber={judgeNumber}
        judgeColor={null}
        isQueued
        queuePosition={queuePosition}
        phase={phase}
        matchStatus={matchStatus}
        connectionStatus={status}
      />
    )
  }

  // Шаг 2: Голосование TEXT
  if (phase === 'TEXT_VOTING' && currentPerf) {
    return (
      <JudgeLayout>
        <VoteButtons
          key={`text-${currentPerf.performanceId}-${matchState?.votingOpenedAt ?? 0}`}
          matchId={matchId}
          performanceId={currentPerf.performanceId}
          dimension="TEXT"
          playerName={currentPerf.playerName}
          judgeName={judgeName}
          judgeNumber={judgeNumber}
          judgeColor={actualColor}
          connectionStatus={status}
        />
      </JudgeLayout>
    )
  }

  // Шаг 3: Голосование DELIVERY
  if (phase === 'DELIVERY_VOTING' && currentPerf) {
    return (
      <JudgeLayout>
        <VoteButtons
          key={`delivery-${currentPerf.performanceId}-${matchState?.votingOpenedAt ?? 0}`}
          matchId={matchId}
          performanceId={currentPerf.performanceId}
          dimension="DELIVERY"
          playerName={currentPerf.playerName}
          judgeName={judgeName}
          judgeNumber={judgeNumber}
          judgeColor={actualColor}
          connectionStatus={status}
        />
      </JudgeLayout>
    )
  }

  // Шаг 4: Ожидание — полноэкранный цвет
  return (
    <WaitingScreen
      judgeName={judgeName}
      judgeNumber={judgeNumber}
      judgeColor={actualColor}
      isQueued={false}
      phase={phase}
      matchStatus={matchStatus}
      connectionStatus={status}
    />
  )
}

/** Обёртка с отступами для mobile-first */
function JudgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100dvh" p={4} display="flex" alignItems="center" justifyContent="center">
      <VStack gap={4} w="full" maxW="400px">
        {children}
      </VStack>
    </Box>
  )
}
