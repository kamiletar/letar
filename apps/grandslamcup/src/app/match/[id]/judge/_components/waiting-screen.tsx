'use client'

/**
 * Экран ожидания для судьи — полноэкранный цвет.
 *
 * Активный судья видит ЯРКИЙ фон своего цвета на весь экран.
 * Судья поднимает телефон — зрители видят цвет.
 * Судья в очереди видит серый фон с позицией.
 */

import type { ConnectionStatus } from '@/app/_hooks/use-match-sse'
import { JUDGE_COLORS, type JudgeColor } from '@/lib/judge-colors'
import type { VotingPhase } from '@/lib/sse/match-state'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'

interface WaitingScreenProps {
  judgeName: string
  judgeNumber: number
  /** Цвет судьи (null для очереди) */
  judgeColor: JudgeColor | null
  /** В очереди ли судья */
  isQueued: boolean
  /** Позиция в очереди */
  queuePosition?: number
  phase: VotingPhase
  matchStatus: string
  connectionStatus: ConnectionStatus
}

const MESSAGES: Partial<Record<VotingPhase, string>> = {
  IDLE: 'Ожидание начала голосования...',
  TEXT_COMPLETE: 'Текст оценён. Ожидание голосования за подачу...',
  DELIVERY_COMPLETE: 'Подача оценена. Ожидание следующего поэта...',
  ROUND_COMPLETE: 'Раунд завершён. Ожидание следующей пары...',
}

export function WaitingScreen({
  judgeName,
  judgeNumber,
  judgeColor,
  isQueued,
  queuePosition,
  phase,
  matchStatus,
  connectionStatus,
}: WaitingScreenProps) {
  const message = matchStatus === 'FINISHED'
    ? 'Матч завершён. Спасибо за участие!'
    : matchStatus === 'SCHEDULED'
    ? 'Матч ещё не начался. Подождите...'
    : (MESSAGES[phase] ?? 'Ожидание...')

  // Судья в очереди — серый фон
  if (isQueued) {
    return (
      <Box
        position="fixed"
        inset={0}
        bg="gray.100"
        _dark={{ bg: 'gray.800' }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        <VStack gap={4}>
          <Text fontSize="6xl" fontWeight="bold" color="gray.400">
            ⏳
          </Text>
          <Heading size="2xl" textAlign="center" color="gray.600" _dark={{ color: 'gray.300' }}>
            Вы в очереди
          </Heading>
          <Text fontSize="3xl" fontWeight="bold" textAlign="center">
            Позиция {queuePosition}
          </Text>
          <Text fontSize="lg" textAlign="center" color="gray.500">
            {judgeName}
          </Text>
          <Text fontSize="md" textAlign="center" color="gray.400">
            Если одного из судей отведут — вы автоматически займёте его место
          </Text>
          <ConnectionIndicator status={connectionStatus} lightBg />
        </VStack>
      </Box>
    )
  }

  // Активный судья — полноэкранный ЯРКИЙ цвет
  const colorConfig = judgeColor ? JUDGE_COLORS[judgeColor] : null

  return (
    <Box
      position="fixed"
      inset={0}
      bg={colorConfig?.hex ?? 'gray.200'}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={6}
    >
      <VStack gap={4}>
        <Heading size="4xl" textAlign="center" color="white" textShadow="0 2px 8px rgba(0,0,0,0.3)">
          {colorConfig?.emoji}
        </Heading>
        <Heading size="2xl" textAlign="center" color="white" textShadow="0 2px 8px rgba(0,0,0,0.3)">
          Судья №{judgeNumber}
        </Heading>
        <Text fontSize="3xl" fontWeight="bold" textAlign="center" color="white" textShadow="0 1px 4px rgba(0,0,0,0.3)">
          {colorConfig?.name ?? ''}
        </Text>
        <Text fontSize="lg" textAlign="center" color="whiteAlpha.800">
          {judgeName}
        </Text>

        <Box mt={4} px={4} py={2} borderRadius="full" bg="blackAlpha.300">
          <Text fontSize="md" textAlign="center" color="whiteAlpha.900">
            {message}
          </Text>
        </Box>

        <ConnectionIndicator status={connectionStatus} />
      </VStack>
    </Box>
  )
}

/** Индикатор подключения */
function ConnectionIndicator({ status, lightBg }: { status: ConnectionStatus; lightBg?: boolean }) {
  const connected = status === 'connected'
  return (
    <Box
      p={2}
      borderRadius="full"
      bg={lightBg ? (connected ? 'green.subtle' : 'yellow.subtle') : connected ? 'blackAlpha.200' : 'blackAlpha.400'}
    >
      <Text fontSize="xs" color={lightBg ? (connected ? 'green.fg' : 'yellow.fg') : 'whiteAlpha.800'}>
        {connected ? '● Подключено' : '○ Подключение...'}
      </Text>
    </Box>
  )
}
