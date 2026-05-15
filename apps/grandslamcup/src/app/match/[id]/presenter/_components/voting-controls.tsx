'use client'

/**
 * Кнопки управления голосованием для ведущего
 *
 * Пошаговый процесс:
 * IDLE → "▶ Голосуем за ТЕКСТ"
 * TEXT_COMPLETE → "▶ Голосуем за ПОДАЧУ"
 * DELIVERY_COMPLETE → "→ Следующий поэт" / "→ Следующая пара"
 * TEXT_VOTING / DELIVERY_VOTING → "✕ Отменить голосование"
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import {
  nextRoundAction,
  startDeliveryVotingAction,
  startTextVotingAction,
} from '@/app/match/[id]/score/_actions/scorer.action'
import { Button, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { cancelVotingAction } from '../_actions/presenter.action'

interface VotingControlsProps {
  matchId: string
  matchState: MatchSSEState | null
}

export function VotingControls({ matchId, matchState }: VotingControlsProps) {
  const [isPending, setIsPending] = useState(false)

  const phase = matchState?.phase ?? 'IDLE'
  const currentPerf = matchState?.currentPerformances[matchState?.currentPerformerIndex ?? 0]

  const handleAction = useCallback(async (action: () => Promise<unknown>) => {
    setIsPending(true)
    await action()
    setIsPending(false)
  }, [])

  // Метка текущей фазы
  const phaseLabel =
    (
      {
        IDLE: 'Ожидание',
        PERFORMING: 'Выступление',
        TEXT_VOTING: 'Голосование за ТЕКСТ',
        TEXT_COMPLETE: 'Текст подсчитан',
        DELIVERY_VOTING: 'Голосование за ПОДАЧУ',
        DELIVERY_COMPLETE: 'Подача подсчитана',
        ROUND_COMPLETE: 'Раунд завершён',
        POET_RESULT: 'Результат поэта',
        HALF_SUMMARY: 'Итоги тайма',
        INTERMISSION: 'Перерыв',
      } as Record<string, string>
    )[phase] ?? phase

  return (
    <VStack gap={3} w="full">
      {/* Текущая фаза */}
      <Text fontSize="sm" color="fg.muted" textAlign="center">
        {phaseLabel}
        {currentPerf && ` — ${currentPerf.playerName}`}
      </Text>

      {/* Кнопка начала голосования за текст */}
      {(phase === 'IDLE' || phase === 'ROUND_COMPLETE') && currentPerf && (
        <ActionButton
          onClick={() => handleAction(() => startTextVotingAction(matchId))}
          disabled={isPending}
          colorPalette="blue"
        >
          ▶ Голосуем за ТЕКСТ
        </ActionButton>
      )}

      {/* Кнопка начала голосования за подачу */}
      {phase === 'TEXT_COMPLETE' && (
        <ActionButton
          onClick={() => handleAction(() => startDeliveryVotingAction(matchId))}
          disabled={isPending}
          colorPalette="purple"
        >
          ▶ Голосуем за ПОДАЧУ
        </ActionButton>
      )}

      {/* Переход к следующему поэту / раунду */}
      {phase === 'DELIVERY_COMPLETE' && (
        <ActionButton
          onClick={() => handleAction(() => nextRoundAction(matchId))}
          disabled={isPending}
          colorPalette="orange"
        >
          {(matchState?.currentPerformerIndex ?? 0) < 1 ? '→ Следующий поэт' : '→ Следующая пара'}
        </ActionButton>
      )}

      {/* Отмена голосования */}
      {(phase === 'TEXT_VOTING' || phase === 'DELIVERY_VOTING') && (
        <ActionButton
          onClick={() => handleAction(() => cancelVotingAction(matchId))}
          disabled={isPending}
          colorPalette="gray"
          size="sm"
        >
          ✕ Отменить голосование
        </ActionButton>
      )}
    </VStack>
  )
}

// === Кнопка действия ===

function ActionButton({
  children,
  onClick,
  disabled,
  colorPalette,
  size = 'lg',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  colorPalette: string
  size?: 'sm' | 'lg'
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      colorPalette={colorPalette}
      size={size === 'lg' ? 'xl' : 'md'}
      w="full"
      fontWeight="bold"
    >
      {children}
    </Button>
  )
}
