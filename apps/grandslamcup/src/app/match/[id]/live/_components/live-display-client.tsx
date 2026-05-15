'use client'

/**
 * Полноэкранный дисплей для проектора
 *
 * Тёмный фон, авто-скрытие курсора, fullscreen по клику.
 * SSE подключение как role=public.
 * Экран перерыва: счёт + QR донатов + информация.
 */

import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { LiveCurrentRound } from './live-current-round'
import { LiveScoreboard } from './live-scoreboard'

interface LiveMatchData {
  id: string
  status: string
  homeScore: number | null
  awayScore: number | null
  homeTeamName: string
  awayTeamName: string
  venue: string | null
  season: string
  tour: string
}

interface DonateLink {
  name: string
  url: string
  description: string | null
}

interface LiveDisplayClientProps {
  match: LiveMatchData
  donateLinks?: DonateLink[]
}

export function LiveDisplayClient({ match, donateLinks = [] }: LiveDisplayClientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [homeScore, setHomeScore] = useState(match.homeScore)
  const [awayScore, setAwayScore] = useState(match.awayScore)
  const [matchStatus, setMatchStatus] = useState(match.status)
  const [scoreFlash, setScoreFlash] = useState(false)
  const [audienceStats, setAudienceStats] = useState<{
    count: number
    avgText: number
    avgDelivery: number
  } | null>(null)

  // SSE подключение (public, без токена)
  const { matchState, status: sseStatus } = useMatchSSE({
    matchId: match.id,
    role: 'public',
    enabled: true,
    onEvent: useCallback((event) => {
      if (event.type === 'score:calculated') {
        const payload = event.payload as { homeScore: number; awayScore: number }
        setHomeScore(payload.homeScore)
        setAwayScore(payload.awayScore)
        // Flash-эффект при обновлении счёта
        setScoreFlash(true)
      }
      if (event.type === 'match:started') {
        setMatchStatus('LIVE')
      }
      if (event.type === 'match:finished') {
        setMatchStatus('FINISHED')
      }
      if (event.type === 'audience:voted') {
        const payload = event.payload as { count: number; avgText: number; avgDelivery: number }
        setAudienceStats(payload)
      }
    }, []),
  })

  // Сброс flash-эффекта
  useEffect(() => {
    if (!scoreFlash) {
      return
    }
    const timer = setTimeout(() => setScoreFlash(false), 1500)
    return () => clearTimeout(timer)
  }, [scoreFlash])

  // Fullscreen по клику (с поддержкой webkit-префикса для Safari)
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return
    }
    type FullscreenDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
    const doc = document as FullscreenDoc
    const isFs = doc.fullscreenElement ?? doc.webkitFullscreenElement
    if (isFs) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {})
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    } else {
      const el = containerRef.current as FullscreenEl
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch?.(() => {})
    }
  }, [])

  // Определяем: показывать ли экран перерыва
  const phase = matchState?.phase
  const isIntermission =
    matchStatus === 'LIVE' &&
    (phase === 'IDLE' || phase === 'ROUND_COMPLETE') &&
    !matchState?.currentPerformances[matchState?.currentPerformerIndex ?? 0]

  return (
    <Box
      ref={containerRef}
      bg="black"
      minH="100vh"
      color="white"
      cursor="none"
      onClick={toggleFullscreen}
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      px={8}
      py={6}
      position="relative"
    >
      {/* Основной контент */}
      <VStack gap={8} w="full" maxW="1200px">
        {/* Счёт (flash при обновлении) */}
        <Box
          transition="transform 0.3s ease, filter 0.3s ease"
          transform={scoreFlash ? 'scale(1.05)' : 'scale(1)'}
          filter={scoreFlash ? 'brightness(1.3)' : 'brightness(1)'}
        >
          <LiveScoreboard
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeScore={homeScore}
            awayScore={awayScore}
            status={matchStatus}
            currentHalf={matchState?.currentHalf ?? 1}
            currentRound={matchState?.currentRound ?? 1}
          />
        </Box>

        {/* Текущий раунд */}
        {matchState && !isIntermission && (
          <Box transition="opacity 0.5s ease">
            <LiveCurrentRound
              phase={matchState.phase}
              currentPerformances={matchState.currentPerformances}
              currentPerformerIndex={matchState.currentPerformerIndex}
            />
          </Box>
        )}

        {/* Мнение зала (audience) */}
        {audienceStats && audienceStats.count > 0 && matchStatus === 'LIVE' && (
          <Box bg="whiteAlpha.50" borderRadius="xl" px={6} py={3} textAlign="center" transition="opacity 0.5s ease">
            <Text fontSize="sm" color="gray.500" mb={1}>
              Мнение зала ({audienceStats.count} голосов)
            </Text>
            <Text fontSize="lg" color="yellow.400" fontWeight="bold">
              Текст: {audienceStats.avgText} · Подача: {audienceStats.avgDelivery}
            </Text>
          </Box>
        )}

        {/* Экран перерыва */}
        {isIntermission && (
          <VStack gap={6} textAlign="center">
            <Heading size="2xl" color="gray.300">
              Перерыв
            </Heading>

            {/* QR/ссылки для донатов */}
            {donateLinks.length > 0 && (
              <VStack gap={3}>
                <Text fontSize="lg" color="gray.400">
                  Поддержать турнир
                </Text>
                {donateLinks.map((link) => (
                  <VStack key={link.url} gap={1}>
                    <Text fontSize="xl" fontWeight="bold" color="yellow.400">
                      {link.name}
                    </Text>
                    <Text fontSize="md" color="gray.500" wordBreak="break-all">
                      {link.url}
                    </Text>
                    {link.description && (
                      <Text fontSize="sm" color="gray.600">
                        {link.description}
                      </Text>
                    )}
                  </VStack>
                ))}
              </VStack>
            )}

            <Text fontSize="md" color="gray.600" mt={4}>
              Можно оставить подарок на баре
            </Text>
          </VStack>
        )}

        {/* Матч завершён */}
        {matchStatus === 'FINISHED' && (
          <Heading size="xl" color="gray.400" textAlign="center">
            Матч завершён
          </Heading>
        )}
      </VStack>

      {/* Нижняя панель — инфо */}
      <Flex position="absolute" bottom={4} left={8} right={8} justify="space-between" align="center">
        <Text fontSize="sm" color="gray.600">
          {match.season} · {match.tour}
          {match.venue && ` · ${match.venue}`}
        </Text>
        <Flex gap={2} align="center">
          {sseStatus === 'connected' && <Box w={2} h={2} borderRadius="full" bg="green.500" />}
          {sseStatus !== 'connected' && <Box w={2} h={2} borderRadius="full" bg="red.500" />}
          <Text fontSize="xs" color="gray.700">
            Нажмите для полноэкранного режима
          </Text>
        </Flex>
      </Flex>
    </Box>
  )
}
