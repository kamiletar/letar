/**
 * Экран ведущего — управление матчем со сцены
 *
 * Доступ по ссылке с токеном: /match/{id}/presenter?token=xxx
 * Mobile-first, крупный шрифт, высокий контраст.
 */

import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { redirect } from 'next/navigation'

import { PresenterClient } from './_components/presenter-client'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ token?: string }>

export default async function PresenterPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id: matchId } = await params
  const { token } = await searchParams

  if (!token) {
    redirect('/')
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: {
            select: {
              name: true,
              city: { select: { slug: true } },
            },
          },
          lineups: {
            where: { matchId },
            include: { player: { select: { id: true, name: true, disambiguation: true } } },
          },
        },
      },
      awayTeam: {
        include: {
          team: { select: { name: true } },
          lineups: {
            where: { matchId },
            include: { player: { select: { id: true, name: true, disambiguation: true } } },
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
      victoryPoemPlayer: { select: { name: true, disambiguation: true } },
      performances: {
        include: {
          player: { select: { name: true, disambiguation: true } },
          judgeVotes: {
            include: { judgeSession: { select: { name: true, judgeNumber: true } } },
          },
        },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
    },
  })

  if (!match || match.presenterToken !== token) {
    redirect('/')
  }

  const matchData = {
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    presenterToken: match.presenterToken,
    firstHalfStartTeam: match.firstHalfStartTeam,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.team.name,
      players: match.homeTeam.lineups.map((l) => ({
        id: l.player.id,
        name: playerDisplayName(l.player),
        status: l.status,
      })),
    },
    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.team.name,
      players: match.awayTeam.lineups.map((l) => ({
        id: l.player.id,
        name: playerDisplayName(l.player),
        status: l.status,
      })),
    },
    venue: match.venue?.name ?? null,
    season: match.tour?.round.season.name ?? 'Товарищеский',
    tour: match.tour ? `Круг ${match.tour.round.number}, Тур ${match.tour.number}` : 'Товарищеский матч',
    citySlug: match.homeTeam.team.city?.slug ?? null,
    victoryPoemPlayerId: match.victoryPoemPlayerId,
    victoryPoemPlayerName: match.victoryPoemPlayer ? playerDisplayName(match.victoryPoemPlayer) : null,
    performances: match.performances.map((p) => ({
      id: p.id,
      half: p.half,
      roundNumber: p.roundNumber,
      playerName: playerDisplayName(p.player),
      teamSeasonId: p.teamSeasonId,
      textScores: p.textScores as number[],
      deliveryScores: p.deliveryScores as number[],
      textAdjusted: p.textAdjusted,
      deliveryAdjusted: p.deliveryAdjusted,
      totalScore: p.totalScore,
      durationSec: p.durationSec,
      votes: p.judgeVotes.map((v) => ({
        judgeName: v.judgeSession.name,
        judgeNumber: v.judgeSession.judgeNumber,
        dimension: v.dimension,
        score: v.score,
      })),
    })),
  }

  return <PresenterClient match={matchData} />
}
