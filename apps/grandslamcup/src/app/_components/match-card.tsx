/**
 * Карточка матча — переиспользуется на главной, в расписании, в профиле команды
 *
 * Визуальное различие по статусам:
 * - LIVE: gradient top border + glow pulsing + brand score
 * - FINISHED: крупный счёт (3xl), победитель выделен + ▸ индикатор
 * - SCHEDULED: акцент на дате, мягкий стиль
 * - POSTPONED: приглушённый стиль
 */

import { formatDateTime } from '@/lib/format-date'
import { getDisplayStatus, STATUS_MAP } from '@/lib/match-status'
import { Badge, Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendarDays, LuMapPin } from 'react-icons/lu'

interface MatchCardProps {
  id: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  status: string
  scheduledAt: Date | null
  venueName: string | null
  /** Slug города для city-aware ссылок (опционально) */
  citySlug?: string
  /** Увеличенная карточка для featured матчей */
  featured?: boolean
  /** Тип матча (регулярный / товарищеский) */
  matchType?: string
}

export function MatchCard({
  id,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  status,
  scheduledAt,
  venueName,
  citySlug,
  featured = false,
  matchType,
}: MatchCardProps) {
  // Учитываем прошедшее время для отображения статуса (SCHEDULED + scheduledAt в прошлом → PAST_SCHEDULED)
  const displayStatus = getDisplayStatus({ status, scheduledAt })
  const statusInfo = STATUS_MAP[displayStatus] ?? { label: displayStatus, color: 'gray' }
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'
  const isPostponed = status === 'POSTPONED'

  /** Определяем победителя для подсветки */
  const homeWins = isFinished && homeScore !== null && awayScore !== null && homeScore > awayScore
  const awayWins = isFinished && homeScore !== null && awayScore !== null && awayScore > homeScore

  const padding = featured ? { base: 5, md: 6 } : { base: 4, md: 5 }
  const scoreFontSize = featured ? { base: '2xl', md: '4xl' } : { base: 'xl', md: '3xl' }
  const teamFontSize = featured ? { base: 'md', md: 'lg' } : { base: 'sm', md: 'md' }

  return (
    <Link href={citySlug ? `/${citySlug}/matches/${id}` : `/matches/${id}`}>
      <Box
        p={padding}
        borderRadius="xl"
        borderWidth="1px"
        borderColor={isLive ? 'brand.400' : 'border'}
        bg={isPostponed ? 'bg.subtle' : featured ? { base: 'bg.panel', _dark: 'gray.800' } : 'bg.panel'}
        opacity={isPostponed ? 0.7 : 1}
        position="relative"
        overflow="hidden"
        _hover={{
          shadow: 'lg',
          borderColor: isLive ? 'brand.solid' : 'border.emphasized',
          transform: 'translateY(-2px)',
        }}
        transition="all 0.2s ease"
        className={isLive ? 'glow-pulse' : undefined}
      >
        {/* LIVE: градиентная полоска сверху */}
        {isLive && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="3px"
            bgGradient="to-r"
            gradientFrom="brand.solid"
            gradientVia="brand.400"
            gradientTo="accent.solid"
          />
        )}

        <VStack gap={2} align="stretch">
          {/* Дата + статус */}
          <Flex justify="space-between" align="center">
            <HStack gap={1} color="fg.muted" fontSize="xs">
              <LuCalendarDays size={12} />
              <Text>{scheduledAt ? formatDateTime(scheduledAt) : 'Дата не назначена'}</Text>
            </HStack>
            <HStack gap={1}>
              {matchType === 'FRIENDLY' && (
                <Badge colorPalette="purple" size="sm" variant="subtle">
                  Товарищеский
                </Badge>
              )}
              <Badge
                colorPalette={statusInfo.color}
                size="sm"
                className={isLive ? 'live-pulse' : undefined}
                fontWeight={isLive ? 'bold' : undefined}
              >
                {isLive && '● '}
                {statusInfo.label}
              </Badge>
            </HStack>
          </Flex>

          {/* Команды и счёт */}
          <Flex justify="space-between" align="center" gap={3}>
            <Text
              fontWeight={homeWins ? 'bold' : 'semibold'}
              fontSize={teamFontSize}
              flex={1}
              lineClamp={1}
              color={homeWins ? 'fg' : isFinished ? 'fg.muted' : 'fg'}
            >
              {homeWins && (
                <Box asChild color="success.fg" mr={1} fontSize="xs">
                  <span>▸</span>
                </Box>
              )}
              {homeTeamName}
            </Text>
            {isFinished && homeScore !== null && awayScore !== null ? (
              <Text fontWeight="bold" fontSize={scoreFontSize} fontFamily="mono" flexShrink={0} letterSpacing="wider">
                {homeScore}
                <Box asChild color="fg.muted" mx={1} fontSize="md">
                  <span>:</span>
                </Box>
                {awayScore}
              </Text>
            ) : isLive ? (
              <Text
                fontWeight="bold"
                fontSize={scoreFontSize}
                fontFamily="mono"
                flexShrink={0}
                color="brand.solid"
                letterSpacing="wider"
              >
                {homeScore ?? 0}
                <Box asChild color="fg.muted" mx={1} fontSize="md">
                  <span>:</span>
                </Box>
                {awayScore ?? 0}
              </Text>
            ) : (
              <Text color="fg.subtle" fontSize="sm" flexShrink={0} fontWeight="medium">
                vs
              </Text>
            )}
            <Text
              fontWeight={awayWins ? 'bold' : 'semibold'}
              fontSize={teamFontSize}
              flex={1}
              textAlign="end"
              lineClamp={1}
              color={awayWins ? 'fg' : isFinished ? 'fg.muted' : 'fg'}
            >
              {awayTeamName}
              {awayWins && (
                <Box asChild color="success.fg" ml={1} fontSize="xs">
                  <span>◂</span>
                </Box>
              )}
            </Text>
          </Flex>

          {/* Стадион */}
          {venueName && (
            <HStack gap={1} color="fg.muted" fontSize="xs">
              <LuMapPin size={12} />
              <Text>{venueName}</Text>
            </HStack>
          )}
        </VStack>
      </Box>
    </Link>
  )
}
