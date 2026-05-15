/**
 * Экран тренера на матче — управление составом в реальном времени
 *
 * Доступ по ссылке с токеном: /match/{id}/coach?token=xxx
 * Без регистрации, без логина (как скорер и ведущий).
 */

import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

import { CoachMatchClient } from './_components/coach-match-client'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ token?: string }>

export default async function CoachMatchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id: matchId } = await params
  const { token } = await searchParams

  if (!token) {
    redirect('/')
  }

  // Загружаем матч с составами и перформансами
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: { select: { name: true } },
          lineups: {
            where: { matchId },
            include: { player: { select: { id: true, name: true } } },
          },
        },
      },
      awayTeam: {
        include: {
          team: { select: { name: true } },
          lineups: {
            where: { matchId },
            include: { player: { select: { id: true, name: true } } },
          },
        },
      },
      venue: { select: { name: true } },
      tour: {
        include: {
          round: {
            include: { season: { select: { name: true } } },
          },
        },
      },
      performances: {
        include: { player: { select: { name: true } } },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
    },
  })

  if (!match) {
    redirect('/')
  }

  // Определяем сторону тренера по токену
  let coachSide: 'home' | 'away'
  if (token === match.homeCoachToken) {
    coachSide = 'home'
  } else if (token === match.awayCoachToken) {
    coachSide = 'away'
  } else {
    redirect('/')
  }

  const coachTeamSeasonId = coachSide === 'home' ? match.homeTeam.id : match.awayTeam.id

  // Сериализуем данные для клиента
  const matchData = {
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    coachToken: token,
    coachSide,
    coachTeamSeasonId,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.team.name,
      players: match.homeTeam.lineups.map((l) => ({
        id: l.player.id,
        name: l.player.name,
        status: l.status,
      })),
    },
    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.team.name,
      players: match.awayTeam.lineups.map((l) => ({
        id: l.player.id,
        name: l.player.name,
        status: l.status,
      })),
    },
    venue: match.venue?.name ?? null,
    season: match.tour?.round.season.name ?? 'Товарищеский',
    tour: match.tour ? `Круг ${match.tour.round.number}, Тур ${match.tour.number}` : 'Товарищеский матч',
    performances: match.performances.map((p) => ({
      id: p.id,
      half: p.half,
      roundNumber: p.roundNumber,
      playerName: p.player.name,
      teamSeasonId: p.teamSeasonId,
      totalScore: p.totalScore,
      textAdjusted: p.textAdjusted,
      deliveryAdjusted: p.deliveryAdjusted,
    })),
  }

  return <CoachMatchClient match={matchData} />
}
