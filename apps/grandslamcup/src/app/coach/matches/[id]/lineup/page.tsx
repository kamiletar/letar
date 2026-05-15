/**
 * Заявка состава на матч — кабинет тренера
 *
 * Server Component загружает данные матча и игроков,
 * Client Component обеспечивает интерактивность (чекбоксы, отправка).
 */

import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { requireCoach } from '@/lib/roles'
import { notFound, redirect } from 'next/navigation'
import { LineupForm } from './_components/lineup-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchLineupPage({ params }: PageProps) {
  const { id: matchId } = await params
  const coach = await requireCoach()

  // Загружаем матч с командами и площадкой
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      homeTeamId: true,
      awayTeamId: true,
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true } },
      lineups: {
        where: { teamSeasonId: coach.teamSeasonId },
        select: { playerId: true },
      },
    },
  })

  if (!match) {
    notFound()
  }

  // Проверяем что это матч нашей команды
  const isHome = match.homeTeamId === coach.teamSeasonId
  const isAway = match.awayTeamId === coach.teamSeasonId
  if (!isHome && !isAway) {
    redirect('/coach/matches')
  }

  const opponentName = isHome ? match.awayTeam.team.name : match.homeTeam.team.name

  // Загружаем активных игроков команды
  const playerTeamSeasons = await prisma.playerTeamSeason.findMany({
    where: {
      teamSeasonId: coach.teamSeasonId,
      leftAt: null,
    },
    include: {
      player: { select: { id: true, name: true, disambiguation: true } },
    },
    orderBy: { player: { name: 'asc' } },
  })

  const players = playerTeamSeasons.map((pts) => ({
    id: pts.player.id,
    name: playerDisplayName(pts.player),
    role: pts.role,
  }))

  // Текущая заявка (если есть)
  const existingPlayerIds = match.lineups.map((l) => l.playerId)

  // Часов до матча
  const hoursUntilMatch = match.scheduledAt ? (match.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60) : null

  return (
    <LineupForm
      matchId={match.id}
      opponentName={opponentName}
      scheduledAt={match.scheduledAt?.toISOString() ?? null}
      venueName={match.venue?.name ?? null}
      matchStatus={match.status}
      players={players}
      existingPlayerIds={existingPlayerIds}
      hoursUntilMatch={hoursUntilMatch}
    />
  )
}
