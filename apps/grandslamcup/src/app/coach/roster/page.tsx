/**
 * Состав команды — кабинет тренера.
 * Серверная обёртка: загружает данные и передаёт клиенту.
 */

import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { requireCoach } from '@/lib/roles'

import { RosterClient } from './_components/roster-client'

export default async function CoachRosterPage() {
  const coach = await requireCoach()

  // Загружаем citySlug для ссылок на профили игроков
  const team = await prisma.team.findUnique({
    where: { id: coach.teamId },
    select: { city: { select: { slug: true } } },
  })
  const citySlug = team?.city?.slug

  const roster = await prisma.playerTeamSeason.findMany({
    where: {
      teamSeasonId: coach.teamSeasonId,
      leftAt: null,
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          disambiguation: true,
          slug: true,
          photo: true,
          userId: true,
          bio: true,
          telegramLink: true,
          vkLink: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // Количество PENDING заявок
  const pendingCount = await prisma.rosterApplication.count({
    where: {
      toTeamSeasonId: coach.teamSeasonId,
      status: 'PENDING',
    },
  })

  return (
    <RosterClient
      roster={roster.map((pts) => ({
        id: pts.id,
        playerId: pts.player.id,
        playerName: playerDisplayName(pts.player),
        playerSlug: pts.player.slug,
        playerPhoto: pts.player.photo,
        hasUser: !!pts.player.userId,
        bio: pts.player.bio,
        telegramLink: pts.player.telegramLink,
        vkLink: pts.player.vkLink,
        role: pts.role,
        isPlaying: pts.isPlaying,
        joinedAt: pts.joinedAt?.toISOString() ?? null,
        isCoach: pts.player.id === coach.playerId,
      }))}
      pendingCount={pendingCount}
      citySlug={citySlug}
    />
  )
}
