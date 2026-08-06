/**
 * Детали матча в админке — оркестратор: загрузка данных + компоновка секций.
 */

import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { requireAdmin } from '@/lib/roles'
import { Badge, Box, Button, Circle, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuCamera, LuFileWarning, LuMic, LuStar, LuTrophy, LuUserRound } from 'react-icons/lu'
import { MatchHeroAdmin } from './_components/match-hero-admin'
import { MatchPerformancesTable } from './_components/match-performances-table'
import { TelegramActions } from './_components/telegram-actions'
import { computeCardStats, computeMvp, computeWinner } from './_lib/compute-match-data'

type Params = Promise<{ id: string }>

export async function generateMetadata(_props: { params: Params }): Promise<Metadata> {
  return { title: 'Детали матча — Админка' }
}

/** Маппинг статуса состава */
const LINEUP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  STARTER_HALF1: { label: '1 тайм', color: 'green' },
  STARTER_HALF2: { label: '2 тайм', color: 'blue' },
  SUBSTITUTE: { label: 'Замена', color: 'yellow' },
  UNUSED: { label: 'Запас', color: 'gray' },
}

export default async function AdminMatchDetailPage({ params }: { params: Params }) {
  await requireAdmin()
  const { id } = await params

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { team: { select: { name: true, logo: true } } } },
      awayTeam: { include: { team: { select: { name: true, logo: true } } } },
      venue: { select: { name: true } },
      league: { select: { name: true } },
      tour: {
        include: {
          round: {
            include: {
              season: { include: { city: { select: { telegramChatId: true } } } },
            },
          },
        },
      },
      season: { include: { city: { select: { telegramChatId: true } } } },
      performances: {
        include: {
          player: { select: { id: true, name: true, slug: true, disambiguation: true } },
          teamSeason: { include: { team: { select: { name: true } } } },
          cards: { select: { id: true, type: true, reason: true } },
        },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
      lineups: {
        include: {
          player: { select: { name: true, slug: true, disambiguation: true } },
          teamSeason: { select: { id: true } },
        },
      },
      photos: {
        take: 4,
        orderBy: { order: 'asc' },
        select: { id: true, path: true, width: true, height: true },
      },
      _count: { select: { photos: true } },
    },
  })

  if (!match) {
    notFound()
  }

  /* ─── Подготовка данных ──────────────────────── */

  const homeName = match.homeTeam?.team.name ?? 'Хозяева'
  const awayName = match.awayTeam?.team.name ?? 'Гости'
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'LIVE'
  const { homeWins, awayWins } = computeWinner(match.homeScore, match.awayScore, isFinished)
  const mvp = computeMvp(match.performances, isFinished)
  const cardStats = computeCardStats(match.performances)

  // Составы по командам
  const homeLineup = match.lineups.filter((l) => l.teamSeason.id === match.homeTeamId)
  const awayLineup = match.lineups.filter((l) => l.teamSeason.id === match.awayTeamId)

  // Дисквалификации за плагиат
  const seasonId = match.tour?.round?.season?.id
  const playerIds = match.performances.map((p) => p.playerId)

  const existingPlagiarisms = seasonId
    ? await prisma.playerSuspension.findMany({
      where: { playerId: { in: playerIds }, seasonId, reason: 'PLAGIARISM', active: true },
      select: { playerId: true },
    })
    : []

  const plagiarizedPlayerIds = new Set(existingPlagiarisms.map((s) => s.playerId))

  // Telegram
  const matchCity = match.tour?.round?.season?.city ?? match.season?.city
  const telegramConfig = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  const hasTelegramChannel = !!matchCity?.telegramChatId && !!telegramConfig?.enabled && !!telegramConfig?.botToken

  // Мета тура для hero
  const tourMeta = match.tour
    ? `${match.tour.round.season.name} — ${match.tour.round.name}, Тур ${match.tour.number}`
    : null

  return (
    <VStack gap={6} align="stretch">
      {/* Кнопка назад */}
      <Link href="/admin/matches">
        <HStack gap={2} color="fg.muted" _hover={{ color: 'fg' }} transition="color 0.15s" w="fit-content">
          <LuArrowLeft size={16} />
          <Text fontSize="sm">Матчи</Text>
        </HStack>
      </Link>

      {/* Hero — счёт, команды, статус */}
      <MatchHeroAdmin
        matchId={id}
        status={match.status}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        homeName={homeName}
        awayName={awayName}
        homeLogo={match.homeTeam?.team.logo}
        awayLogo={match.awayTeam?.team.logo}
        homeWins={homeWins}
        awayWins={awayWins}
        isFinished={isFinished}
        isLive={isLive}
        scheduledAt={match.scheduledAt}
        venueName={match.venue?.name}
        leagueName={match.league?.name}
        tourMeta={tourMeta}
        posterUrl={match.posterUrl}
        photosCount={match._count.photos}
      />

      {/* Stat Cards */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
        <StatCard
          icon={<LuMic size={18} />}
          label="Выступления"
          value={String(match.performances.length)}
          color="blue"
        />
        <StatCard
          icon={<LuStar size={18} />}
          label="MVP"
          value={mvp ? mvp.playerName : '—'}
          subtitle={mvp ? `${mvp.totalScore} баллов` : undefined}
          color="yellow"
        />
        <StatCard
          icon={<LuTrophy size={18} />}
          label="Турнирные очки"
          value={match.homePoints !== null && match.awayPoints !== null
            ? `${match.homePoints} : ${match.awayPoints}`
            : '—'}
          color="green"
        />
        <StatCard
          icon={<LuFileWarning size={18} />}
          label="Карточки"
          value={cardStats.total > 0 ? String(cardStats.total) : '—'}
          subtitle={cardStats.total > 0 ? `${cardStats.yellow} Ж / ${cardStats.red} К` : undefined}
          color={cardStats.red > 0 ? 'red' : cardStats.total > 0 ? 'yellow' : 'gray'}
        />
      </SimpleGrid>

      {/* Telegram */}
      <TelegramActions matchId={id} status={match.status} hasTelegramChannel={hasTelegramChannel} />

      {/* Составы */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <Box>
          <Heading size="md" mb={3}>
            Составы
          </Heading>
          <SimpleGrid columns={2} gap={{ base: 3, md: 6 }}>
            {/* Домашняя команда */}
            <Box>
              <HStack gap={2} mb={2} justify="flex-end">
                <Text fontWeight="bold" fontSize="sm" color={homeWins ? 'brand.solid' : 'fg.muted'}>
                  {homeName}
                </Text>
                {homeWins && <LuTrophy size={14} color="var(--chakra-colors-brand-solid)" />}
              </HStack>
              <VStack gap={1} align="stretch">
                {homeLineup.map((l) => <LineupRow key={l.id} player={l.player} status={l.status} align="right" />)}
                {homeLineup.length === 0 && (
                  <Text fontSize="sm" color="fg.subtle" textAlign="right">
                    Состав не подан
                  </Text>
                )}
              </VStack>
            </Box>
            {/* Гостевая команда */}
            <Box>
              <HStack gap={2} mb={2}>
                {awayWins && <LuTrophy size={14} color="var(--chakra-colors-brand-solid)" />}
                <Text fontWeight="bold" fontSize="sm" color={awayWins ? 'brand.solid' : 'fg.muted'}>
                  {awayName}
                </Text>
              </HStack>
              <VStack gap={1} align="stretch">
                {awayLineup.map((l) => <LineupRow key={l.id} player={l.player} status={l.status} align="left" />)}
                {awayLineup.length === 0 && (
                  <Text fontSize="sm" color="fg.subtle">
                    Состав не подан
                  </Text>
                )}
              </VStack>
            </Box>
          </SimpleGrid>
        </Box>
      )}

      {/* Выступления по таймам */}
      <MatchPerformancesTable performances={match.performances} plagiarizedPlayerIds={plagiarizedPlayerIds} />

      {/* Фото-превью */}
      {match._count.photos > 0 && (
        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <Heading size="md">Фото ({match._count.photos})</Heading>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/matches/${id}/photos`}>
                <LuCamera size={14} />
                Все фото
              </Link>
            </Button>
          </Flex>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
            {match.photos.map((photo) => (
              <Link key={photo.id} href={`/admin/matches/${id}/photos`}>
                <Box
                  borderRadius="lg"
                  overflow="hidden"
                  aspectRatio={4 / 3}
                  position="relative"
                  _hover={{ opacity: 0.8 }}
                  transition="opacity 0.15s"
                >
                  <Image
                    src={`/api/files/${photo.path}`}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              </Link>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}

/* ─── Вспомогательные компоненты ──────────────────────── */

/** Карточка статистики */
function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  color: string
}) {
  return (
    <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={4}>
      <HStack gap={3} mb={2}>
        <Circle size={8} bg={`${color}.subtle`} color={`${color}.fg`}>
          {icon}
        </Circle>
        <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
          {label}
        </Text>
      </HStack>
      <Text fontWeight="bold" fontSize="lg" truncate>
        {value}
      </Text>
      {subtitle && (
        <Text fontSize="xs" color="fg.muted">
          {subtitle}
        </Text>
      )}
    </Box>
  )
}

/** Строка состава игрока */
function LineupRow({
  player,
  status,
  align,
}: {
  player: { name: string; slug: string; disambiguation: string | null }
  status: string
  align: 'left' | 'right'
}) {
  const statusInfo = LINEUP_STATUS_MAP[status] ?? { label: status, color: 'gray' }

  return (
    <HStack
      gap={2}
      py={1.5}
      px={2}
      borderRadius="lg"
      _hover={{ bg: 'bg.subtle' }}
      transition="background 0.15s"
      flexDirection={align === 'right' ? 'row-reverse' : 'row'}
    >
      <Circle size={7} bg="bg.subtle" color="fg.muted" flexShrink={0}>
        <LuUserRound size={14} />
      </Circle>
      <Text fontSize="sm" flex={1} textAlign={align}>
        {playerDisplayName(player)}
      </Text>
      <Badge size="xs" colorPalette={statusInfo.color} variant="subtle">
        {statusInfo.label}
      </Badge>
    </HStack>
  )
}
