'use client'

/**
 * Зрительское голосование — основной клиентский компонент
 *
 * SSE подключение для получения обновлений. Показывает форму голосования
 * при появлении поэта на сцене. После голосования — "Мнение зала".
 */

import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { useTelegramWebApp } from '@/app/_hooks/use-telegram-webapp'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { submitAudienceVoteAction } from '../_actions/audience.action'
import { AudienceVoteForm } from './audience-vote-form'

interface AudienceMatchData {
  id: string
  status: string
  homeTeamName: string
  awayTeamName: string
}

interface AudienceClientProps {
  match: AudienceMatchData
}

export function AudienceClient({ match }: AudienceClientProps) {
  const { isTelegram, initData: telegramInitData } = useTelegramWebApp()
  const [currentPerformer, setCurrentPerformer] = useState<
    {
      performanceId: string
      playerName: string
      teamName: string
    } | null
  >(null)
  const [votedPerformances, setVotedPerformances] = useState<Set<string>>(new Set())
  const [matchStatus, setMatchStatus] = useState(match.status)

  // SSE подключение
  const { matchState, status: sseStatus } = useMatchSSE({
    matchId: match.id,
    role: 'public',
    enabled: true,
    onEvent: useCallback((event) => {
      if (event.type === 'player:sent') {
        const payload = event.payload as {
          performanceId: string
          playerName: string
          teamName: string
        }
        setCurrentPerformer(payload)
      }
      if (event.type === 'match:started') {
        setMatchStatus('LIVE')
      }
      if (event.type === 'match:finished') {
        setMatchStatus('FINISHED')
      }
    }, []),
  })

  // Также берём текущего из SSE state
  const ssePerformer = matchState?.currentPerformances?.[matchState.currentPerformerIndex]
  const performer = currentPerformer
    ?? (ssePerformer
      ? {
        performanceId: ssePerformer.performanceId,
        playerName: ssePerformer.playerName,
        teamName: ssePerformer.teamName,
      }
      : null)

  const hasVoted = performer ? votedPerformances.has(performer.performanceId) : false

  const handleVote = async (textScore: number, deliveryScore: number) => {
    if (!performer) {
      return
    }
    const result = await submitAudienceVoteAction({
      matchId: match.id,
      performanceId: performer.performanceId,
      textScore,
      deliveryScore,
      // Передаём initData для HMAC-валидации на сервере (защита от накрутки)
      telegramInitData: telegramInitData || undefined,
    })
    if ('success' in result && result.success) {
      setVotedPerformances((prev) => new Set([...prev, performer.performanceId]))
    }
  }

  return (
    <Container maxW="sm" py={isTelegram ? 2 : 6}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="lg">{isTelegram ? '🗳 Голосование' : 'Народное жюри'}</Heading>
          <Text fontSize="sm" color="fg.muted">
            {match.homeTeamName} vs {match.awayTeamName}
          </Text>
          {sseStatus === 'connected' && (
            <Text fontSize="xs" color="green.500">
              Подключено
            </Text>
          )}
          {sseStatus !== 'connected' && sseStatus !== 'disconnected' && (
            <Text fontSize="xs" color="yellow.500">
              Подключение...
            </Text>
          )}
        </Box>

        {/* Контент зависит от состояния */}
        {matchStatus === 'SCHEDULED' && (
          <Box textAlign="center" py={8}>
            <Text fontSize="xl" color="fg.muted">
              Матч ещё не начался
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={2}>
              Голосование откроется с началом матча
            </Text>
          </Box>
        )}

        {matchStatus === 'FINISHED' && (
          <Box textAlign="center" py={8}>
            <Text fontSize="xl" fontWeight="bold">
              Матч завершён!
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={2}>
              Спасибо за участие в голосовании
            </Text>
          </Box>
        )}

        {matchStatus === 'LIVE' && !performer && (
          <Box textAlign="center" py={8}>
            <Text fontSize="lg" color="fg.muted">
              Ожидание выступления...
            </Text>
          </Box>
        )}

        {matchStatus === 'LIVE' && performer && !hasVoted && (
          <AudienceVoteForm playerName={performer.playerName} teamName={performer.teamName} onVote={handleVote} />
        )}

        {matchStatus === 'LIVE' && performer && hasVoted && (
          <Box textAlign="center" py={6}>
            <Text fontSize="2xl" fontWeight="bold" color="green.500">
              Голос принят!
            </Text>
            <Text color="fg.muted" mt={2}>
              Ожидание следующего поэта...
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
