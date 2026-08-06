/**
 * Hero-секция матча в админке — счёт, логотипы команд, статус, дата, площадка.
 * Серверный компонент, принимает данные матча через пропсы.
 */

import { formatDateTimeFull } from '@/lib/format-date'
import { getDisplayStatus, STATUS_MAP } from '@/lib/match-status'
import { Badge, Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { LuCalendarDays, LuCamera, LuMapPin, LuSwords } from 'react-icons/lu'

export interface MatchHeroAdminProps {
  matchId: string
  status: string
  homeScore: number
  awayScore: number
  homeName: string
  awayName: string
  homeLogo: string | null | undefined
  awayLogo: string | null | undefined
  homeWins: boolean
  awayWins: boolean
  isFinished: boolean
  isLive: boolean
  scheduledAt: Date | null
  venueName: string | null | undefined
  leagueName: string | null | undefined
  /** Мета тура: "Сезон 1 — Раунд 1, Тур 3" */
  tourMeta: string | null
  posterUrl: string | null
  photosCount: number
}

export function MatchHeroAdmin({
  matchId,
  status,
  homeScore,
  awayScore,
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  homeWins,
  awayWins,
  isFinished,
  isLive,
  scheduledAt,
  venueName,
  leagueName,
  tourMeta,
  posterUrl,
  photosCount,
}: MatchHeroAdminProps) {
  const displayStatus = getDisplayStatus({ status, scheduledAt })
  const statusInfo = STATUS_MAP[displayStatus] ?? { label: displayStatus, color: 'gray' }

  return (
    <>
      {/* Постер — если есть */}
      {posterUrl && (
        <Box maxW="md" mx="auto">
          <Image
            src={`/api/files/${posterUrl}`}
            alt={`Постер: ${homeName} vs ${awayName}`}
            width={500}
            height={700}
            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
          />
        </Box>
      )}

      {/* Hero — счёт матча */}
      <Box
        bg="brand.950"
        bgGradient="to-br"
        gradientFrom="brand.950"
        gradientTo="brand.900"
        borderRadius="2xl"
        px={{ base: 4, md: 8 }}
        py={{ base: 6, md: 10 }}
        position="relative"
        overflow="hidden"
      >
        {/* Кнопки действий в углу */}
        <HStack position="absolute" top={3} right={3} zIndex={2} gap={2}>
          <Button size="xs" variant="outline" colorPalette="whiteAlpha" asChild>
            <Link href={`/admin/matches/${matchId}/photos`}>
              <LuCamera size={14} />
              Фото{photosCount > 0 && ` (${photosCount})`}
            </Link>
          </Button>
          <Badge colorPalette={statusInfo.color} className={isLive ? 'live-pulse' : undefined}>
            {isLive && '● '}
            {statusInfo.label}
          </Badge>
        </HStack>

        {/* Декоративные blur-круги */}
        <Box
          position="absolute"
          top="-60px"
          right="-60px"
          w="200px"
          h="200px"
          borderRadius="full"
          bg="brand.700"
          opacity={0.2}
          filter="blur(40px)"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="-40px"
          left="-40px"
          w="150px"
          h="150px"
          borderRadius="full"
          bg="accent.700"
          opacity={0.1}
          filter="blur(30px)"
          pointerEvents="none"
        />

        {/* Мета: сезон, тур, лига */}
        <VStack gap={1} mb={6} position="relative">
          <Text fontSize="xs" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wide">
            {tourMeta ?? 'Товарищеский матч'}
          </Text>
          {leagueName && (
            <Badge colorPalette="brand" variant="subtle" size="sm">
              {leagueName}
            </Badge>
          )}
        </VStack>

        {/* Счёт: Команда — Score — Команда */}
        <Flex justify="center" align="center" gap={{ base: 4, md: 8 }} position="relative">
          {/* Домашняя команда */}
          <TeamColumn name={homeName} logo={homeLogo} highlighted={homeWins} dimmed={isFinished && !homeWins} />

          {/* Счёт */}
          {isFinished || isLive
            ? (
              <Text
                fontSize={{ base: '4xl', md: '6xl' }}
                fontWeight="bold"
                fontFamily="mono"
                color={isLive ? 'brand.400' : 'white'}
                letterSpacing="wider"
                flexShrink={0}
                className={isLive ? 'live-pulse' : undefined}
              >
                {homeScore}
                <Text display="inline" color="whiteAlpha.400" mx={{ base: 1, md: 2 }}>
                  :
                </Text>
                {awayScore}
              </Text>
            )
            : (
              <HStack gap={2} flexShrink={0}>
                <LuSwords size={24} color="var(--chakra-colors-white-alpha-400)" />
                <Text fontSize={{ base: '2xl', md: '4xl' }} color="whiteAlpha.400" fontWeight="medium">
                  vs
                </Text>
              </HStack>
            )}

          {/* Гостевая команда */}
          <TeamColumn name={awayName} logo={awayLogo} highlighted={awayWins} dimmed={isFinished && !awayWins} />
        </Flex>

        {/* Дата, площадка */}
        <VStack gap={1} mt={6} position="relative">
          {scheduledAt && (
            <HStack gap={1} color="whiteAlpha.500" fontSize="sm">
              <LuCalendarDays size={14} />
              <Text>{formatDateTimeFull(scheduledAt)}</Text>
            </HStack>
          )}
          {venueName && (
            <HStack gap={1} color="whiteAlpha.600" fontSize="sm">
              <LuMapPin size={14} />
              <Text>{venueName}</Text>
            </HStack>
          )}
        </VStack>
      </Box>
    </>
  )
}

/* ─── Вспомогательные компоненты ──────────────────────── */

/** Колонка команды (логотип + название) */
function TeamColumn({
  name,
  logo,
  highlighted,
  dimmed,
}: {
  name: string
  logo: string | null | undefined
  highlighted: boolean
  dimmed: boolean
}) {
  return (
    <VStack gap={2} flex={1} align="center">
      <Box w={{ base: 12, md: 16 }} h={{ base: 12, md: 16 }} borderRadius="xl" overflow="hidden">
        {logo
          ? (
            <Image
              src={`/api/files/${logo}`}
              alt={name}
              width={64}
              height={64}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          )
          : (
            <Flex align="center" justify="center" h="full" bg="brand.800" borderRadius="xl">
              <Text color="whiteAlpha.400" fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                {name.charAt(0)}
              </Text>
            </Flex>
          )}
      </Box>
      <Heading
        size={{ base: 'md', md: 'xl' }}
        color={highlighted ? 'white' : dimmed ? 'whiteAlpha.600' : 'white'}
        textAlign="center"
      >
        {name}
      </Heading>
    </VStack>
  )
}
