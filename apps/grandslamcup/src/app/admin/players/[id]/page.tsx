/**
 * Страница поэта в админке — просмотр и редактирование профиля.
 */

import { EditPlayerButton } from '@/app/_components/edit-player-button'
import { parseSocialLinks } from '@/app/_components/social-links'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { getRoleLabel } from '@/lib/player-role-labels'
import { playerDisplayName } from '@/lib/player-utils'
import { requireAdmin } from '@/lib/roles'
import { Badge, Box, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowLeft, LuExternalLink, LuUserRound } from 'react-icons/lu'
import { PlayerLinkSection } from './_components/player-link-section'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const player = await prisma.player.findUnique({ where: { id }, select: { name: true } })
  return { title: player ? `${player.name} — Админ` : 'Поэт не найден' }
}

export default async function AdminPlayerPage({ params }: { params: Params }) {
  await requireAdmin()
  const { id } = await params

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      city: { select: { name: true, slug: true } },
      user: { select: { id: true, name: true, email: true } },
      playerTeamSeasons: {
        include: {
          teamSeason: {
            include: {
              team: { select: { name: true, slug: true } },
              season: { select: { name: true } },
              league: { select: { name: true } },
            },
          },
        },
        orderBy: { teamSeason: { season: { startDate: 'desc' } } },
      },
      performances: { select: { id: true, totalScore: true } },
      poems: { select: { id: true, title: true, published: true } },
      albums: {
        orderBy: { createdAt: 'desc' as const },
        select: {
          id: true,
          title: true,
          publishedAt: true,
          _count: { select: { albumPoems: true } },
        },
      },
      suspensions: { where: { active: true }, select: { id: true, reason: true, matchesLeft: true } },
    },
  })

  if (!player) {
    notFound()
  }

  // Подгружаем данные pending пользователя если есть заявка
  const pendingUser = player.pendingUserId
    ? await prisma.user.findUnique({
        where: { id: player.pendingUserId },
        select: { id: true, name: true, email: true },
      })
    : null

  const perfCount = player.performances.length
  const totalScore = player.performances.reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const avgScore = perfCount > 0 ? (totalScore / perfCount).toFixed(1) : '—'
  const citySlug = player.city?.slug

  return (
    <VStack gap={6} align="stretch">
      {/* Навигация */}
      <Link href="/admin/players">
        <HStack gap={1} color="fg.muted" _hover={{ color: 'brand.solid' }}>
          <LuArrowLeft size={16} />
          <Text fontSize="sm">Назад к списку</Text>
        </HStack>
      </Link>

      {/* Hero */}
      <Flex gap={6} align="start" flexWrap="wrap">
        {player.photo ? (
          <Image
            src={`/api/files/${player.photo}`}
            alt={player.name}
            width={120}
            height={120}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <Flex w={120} h={120} bg="bg.subtle" borderRadius="full" align="center" justify="center">
            <LuUserRound size={48} color="var(--chakra-colors-fg-muted)" />
          </Flex>
        )}
        <VStack align="start" gap={2}>
          <HStack gap={2}>
            <Heading size="xl">{playerDisplayName(player)}</Heading>
            <EditPlayerButton
              playerId={player.id}
              playerName={player.name}
              playerUserId={player.userId}
              playerPhoto={player.photo}
              bio={player.bio}
              socialLinks={parseSocialLinks(player.socialLinks)}
              currentTeamId={player.playerTeamSeasons[0]?.teamSeason.team.slug ?? null}
              canEdit
            />
          </HStack>
          <HStack gap={2} flexWrap="wrap">
            {player.city && <Badge>{player.city.name}</Badge>}
            {player.user && <Badge colorPalette="green">Привязан: {player.user.email}</Badge>}
            {!player.user && <Badge colorPalette="gray">Без аккаунта</Badge>}
            {player.pendingUserId && <Badge colorPalette="yellow">Заявка на привязку</Badge>}
            {player.suspensions.length > 0 && <Badge colorPalette="red">Отстранён</Badge>}
          </HStack>
          {citySlug && (
            <Link href={`/${citySlug}/players/${player.slug}`} target="_blank">
              <HStack gap={1} color="brand.fg" fontSize="sm" _hover={{ textDecoration: 'underline' }}>
                <LuExternalLink size={14} />
                <Text>Публичный профиль</Text>
              </HStack>
            </Link>
          )}
        </VStack>
      </Flex>

      {/* Статистика */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            {perfCount}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Выступлений
          </Text>
        </Box>
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            {avgScore}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Средний балл
          </Text>
        </Box>
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            {player.poems.length}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Стихов
          </Text>
        </Box>
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            {player.playerTeamSeasons.length}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Сезонов
          </Text>
        </Box>
      </SimpleGrid>

      {/* Биография */}
      {player.bio && (
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Биография
          </Text>
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {player.bio}
          </Text>
        </Box>
      )}

      {/* Привязка аккаунта */}
      <PlayerLinkSection playerId={player.id} user={player.user} pendingUser={pendingUser} />

      {/* Альбомы */}
      {player.albums.length > 0 && (
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
          <Text fontSize="sm" fontWeight="semibold" mb={3}>
            Альбомы ({player.albums.length})
          </Text>
          <VStack gap={2} align="stretch">
            {player.albums.map((album) => (
              <Flex key={album.id} justify="space-between" align="center" py={1}>
                <Text fontSize="sm" fontWeight="medium">
                  {album.title}
                </Text>
                <HStack gap={2}>
                  <Text fontSize="xs" color="fg.muted">
                    {album._count.albumPoems} стих.
                  </Text>
                  <Badge size="sm" colorPalette={album.publishedAt ? 'green' : 'gray'}>
                    {album.publishedAt ? 'Опубликован' : 'Черновик'}
                  </Badge>
                </HStack>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}

      {/* История команд */}
      <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
        <Text fontSize="sm" fontWeight="semibold" mb={3}>
          Команды
        </Text>
        <VStack gap={2} align="stretch">
          {player.playerTeamSeasons.map((pts) => (
            <Flex key={pts.id} justify="space-between" align="center" py={1}>
              <HStack gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {pts.teamSeason.team.name}
                </Text>
                <Badge size="sm" variant="subtle">
                  {pts.teamSeason.season.name}
                </Badge>
                <Badge size="sm" colorPalette="teal">
                  {getRoleLabel(pts.role, pts.isPlaying)}
                </Badge>
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                {formatDate(pts.joinedAt)}
                {pts.leftAt ? ` — ${formatDate(pts.leftAt)}` : ''}
              </Text>
            </Flex>
          ))}
          {player.playerTeamSeasons.length === 0 && (
            <Text fontSize="sm" color="fg.muted">
              Не состоит ни в одной команде
            </Text>
          )}
        </VStack>
      </Box>
    </VStack>
  )
}
