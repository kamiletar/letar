'use client'

/**
 * Панель жюри: QR-код для регистрации + мониторинг подключённых судей
 *
 * Судьи отображаются с цветными бейджами.
 * Секция очереди показывает ожидающих (6+).
 */

import { JUDGE_COLORS, type JudgeColor } from '@/lib/judge-colors'
import { JUDGES_COUNT } from '@/lib/scoring'
import type { QueuedJudge, VotingPhase } from '@/lib/sse/match-state'
import { Badge, Box, Button, Circle, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { createJuryInviteAction } from '../_actions/scorer.action'

/** Таймаут судьи в секундах */
const JUDGE_TIMEOUT_SEC = 30

interface JudgeInfo {
  name: string
  judgeNumber: number
  /** Цвет судьи. null для ручных слотов (их оценки вводит счётовод, телефон не используется) */
  color: JudgeColor | null
  hasVoted: boolean
}

interface JuryPanelProps {
  matchId: string
  judges: JudgeInfo[]
  /** Очередь ожидающих судей */
  judgeQueue?: QueuedJudge[]
  currentHalf: number
  phase?: VotingPhase
  votingOpenedAt?: number | null
}

export function JuryPanel({ matchId, judges, judgeQueue = [], currentHalf, phase, votingOpenedAt }: JuryPanelProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [now, setNow] = useState(Date.now())

  const isVoting = phase === 'TEXT_VOTING' || phase === 'DELIVERY_VOTING'

  // Обновляем время для подсветки таймаута
  useEffect(() => {
    if (!isVoting) {
      return
    }
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isVoting])

  const isTimedOut = isVoting && votingOpenedAt ? (now - votingOpenedAt) / 1000 > JUDGE_TIMEOUT_SEC : false

  const generateQR = useCallback(async () => {
    setIsGenerating(true)
    const result = await createJuryInviteAction(matchId, currentHalf)
    if (result.success) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      setInviteUrl(`${baseUrl}/match/${matchId}/judge?half=${result.half}&invite=${result.inviteKey}`)
    }
    setIsGenerating(false)
  }, [matchId, currentHalf])

  const connectedCount = judges.length
  const isComplete = connectedCount >= JUDGES_COUNT

  return (
    <Box p={4} mb={4} borderRadius="xl" bg="bg.subtle" borderWidth={1} borderColor="border">
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md">Жюри тайм {currentHalf}</Heading>
        <Badge colorPalette={isComplete ? 'green' : 'yellow'} size="lg">
          {connectedCount}/{JUDGES_COUNT}
          {judgeQueue.length > 0 && ` (+${judgeQueue.length})`}
        </Badge>
      </Flex>

      {/* Список активных судей */}
      <VStack align="stretch" gap={2} mb={3}>
        {judges.map((judge) => {
          const judgeTimedOut = isTimedOut && !judge.hasVoted
          const colorConfig = judge.color ? JUDGE_COLORS[judge.color] : null
          const circleColor = colorConfig?.hex ?? '#9ca3af' // gray-400 для ручных
          const chakraPalette = colorConfig?.chakra ?? 'gray'
          return (
            <Flex
              key={judge.judgeNumber}
              align="center"
              gap={3}
              p={2}
              borderRadius="md"
              bg={judgeTimedOut ? 'red.subtle' : 'bg.panel'}
            >
              <Circle size="24px" bg={circleColor} flexShrink={0} />
              <Badge
                colorPalette={judge.hasVoted ? 'green' : judgeTimedOut ? 'red' : chakraPalette}
                variant="solid"
                borderRadius="full"
                minW={6}
                textAlign="center"
              >
                {judge.judgeNumber}
              </Badge>
              <Text flex={1}>{judge.name}</Text>
              {judge.hasVoted && (
                <Text color="green.500" fontSize="sm">
                  ✓
                </Text>
              )}
              {judgeTimedOut && (
                <Text color="red.500" fontSize="sm">
                  ⏰
                </Text>
              )}
            </Flex>
          )
        })}

        {/* Пустые слоты */}
        {Array.from({ length: Math.max(0, JUDGES_COUNT - connectedCount) }).map((_, i) => (
          <Flex key={`empty-${i}`} align="center" gap={3} p={2} borderRadius="md" bg="bg.panel" opacity={0.4}>
            <Circle size="24px" bg="gray.300" flexShrink={0} />
            <Badge colorPalette="gray" variant="outline" borderRadius="full" minW={6} textAlign="center">
              {connectedCount + i + 1}
            </Badge>
            <Text color="fg.muted">Ожидание...</Text>
          </Flex>
        ))}
      </VStack>

      {/* Секция очереди */}
      {judgeQueue.length > 0 && (
        <Box mb={3} p={3} borderRadius="md" bg="gray.subtle" borderWidth={1} borderColor="gray.muted">
          <HStack gap={2} mb={2}>
            <Text fontSize="sm" fontWeight="bold" color="fg.muted">
              Очередь
            </Text>
            <Badge colorPalette="gray" size="sm">
              {judgeQueue.length}
            </Badge>
          </HStack>
          <VStack align="stretch" gap={1}>
            {judgeQueue.map((q) => (
              <Flex key={q.sessionId} align="center" gap={2} p={1}>
                <Text fontSize="sm" color="fg.muted">
                  #{q.position}
                </Text>
                <Text fontSize="sm">{q.name}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}

      {/* QR-код */}
      {!isComplete && (
        <VStack gap={3}>
          <Button onClick={generateQR} loading={isGenerating} colorPalette="blue" width="full">
            {inviteUrl ? 'Новый QR-код' : 'Сгенерировать QR для жюри'}
          </Button>

          {inviteUrl && (
            <Box p={4} bg="white" borderRadius="lg" mx="auto">
              <QRCodeSVG value={inviteUrl} size={200} />
            </Box>
          )}
        </VStack>
      )}
    </Box>
  )
}
