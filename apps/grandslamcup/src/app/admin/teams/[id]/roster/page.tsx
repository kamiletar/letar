/**
 * Управление составом команды — страница админки.
 * Показывает ростер выбранного сезона с возможностью смены ролей, добавления/удаления.
 */

import { prisma } from '@/lib/db'
import { Heading, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { RosterAdminClient } from './_components/roster-admin-client'

export default async function AdminRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      cityId: true,
      teamSeasons: {
        include: {
          season: { select: { id: true, name: true, status: true } },
          league: { select: { name: true } },
          playerTeamSeasons: {
            where: { leftAt: null },
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  photo: true,
                  bio: true,
                  socialLinks: true,
                  badges: true,
                  userId: true,
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
        orderBy: { season: { startDate: 'desc' } },
      },
    },
  })

  if (!team) {
    notFound()
  }

  // Города для select при создании нового игрока
  const cities = await prisma.city.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Преобразуем для клиента
  const seasons = team.teamSeasons.map((ts) => ({
    teamSeasonId: ts.id,
    seasonName: ts.season.name,
    seasonStatus: ts.season.status,
    leagueName: ts.league.name,
    roster: ts.playerTeamSeasons.map((pts) => ({
      id: pts.id,
      playerId: pts.player.id,
      name: pts.player.name,
      slug: pts.player.slug,
      photo: pts.player.photo,
      bio: pts.player.bio,
      socialLinks: (pts.player.socialLinks as Array<{ platform: string; url: string }>) ?? [],
      badges: pts.player.badges,
      hasUser: !!pts.player.userId,
      role: pts.role,
      isPlaying: pts.isPlaying,
      joinedAt: pts.joinedAt?.toISOString() ?? null,
    })),
  }))

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">{team.name} — Состав</Heading>
      <RosterAdminClient
        teamId={team.id}
        teamName={team.name}
        teamCityId={team.cityId}
        seasons={seasons}
        cities={cities}
      />
    </VStack>
  )
}
