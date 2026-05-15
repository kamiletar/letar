/**
 * Экран скорера — управление live scoring матча
 *
 * Доступ по ссылке с токеном: /match/{id}/score?token=xxx
 * Без регистрации, без логина.
 */

import { prisma } from '@/lib/db'
import { playerDisplayName } from '@/lib/player-utils'
import { redirect } from 'next/navigation'

import { ScorerWizard } from './_components/wizard/scorer-wizard'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ token?: string }>

export default async function ScorerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id: matchId } = await params
  const { token } = await searchParams

  if (!token) {
    // Токен не передан — показываем подсказку вместо тихого редиректа на главную
    redirect(`/match/${matchId}/score/no-token`)
  }

  // Загружаем матч с составами
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: {
            select: {
              name: true,
              city: { select: { useHomeAway: true, slug: true } },
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

  if (!match || match.scorerToken !== token) {
    redirect('/')
  }

  // Загружаем активные составы обеих команд (roster) — нужны для B12 (счетовод заявляет состав за команду)
  const [homeRoster, awayRoster] = await Promise.all([
    prisma.playerTeamSeason.findMany({
      where: { teamSeasonId: match.homeTeam.id, leftAt: null },
      include: { player: { select: { id: true, name: true, disambiguation: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.playerTeamSeason.findMany({
      where: { teamSeasonId: match.awayTeam.id, leftAt: null },
      include: { player: { select: { id: true, name: true, disambiguation: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  // Сериализуем данные для клиента
  const matchData = {
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    firstHalfStartTeam: match.firstHalfStartTeam,
    scorerToken: match.scorerToken,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.team.name,
      players: match.homeTeam.lineups.map((l) => ({
        id: l.player.id,
        name: playerDisplayName(l.player),
        status: l.status,
      })),
      hasLineup: match.homeTeam.lineups.length > 0,
      roster: homeRoster.map((r) => ({
        id: r.player.id,
        name: playerDisplayName(r.player),
        role: r.role,
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
      hasLineup: match.awayTeam.lineups.length > 0,
      roster: awayRoster.map((r) => ({
        id: r.player.id,
        name: playerDisplayName(r.player),
        role: r.role,
      })),
    },
    venue: match.venue?.name ?? null,
    season: match.tour?.round.season.name ?? 'Товарищеский',
    tour: match.tour ? `Круг ${match.tour.round.number}, Тур ${match.tour.number}` : 'Товарищеский матч',
    /** Город команды использует терминологию «дома/в гостях» (СПб да, Москва нет) */
    useHomeAway: match.homeTeam.team.city?.useHomeAway ?? false,
    citySlug: match.homeTeam.team.city?.slug ?? null,
    victoryPoemPlayerId: match.victoryPoemPlayerId,
    victoryPoemPlayerName: match.victoryPoemPlayer ? playerDisplayName(match.victoryPoemPlayer) : null,
    performances: match.performances.map((p) => ({
      id: p.id,
      half: p.half,
      roundNumber: p.roundNumber,
      playerName: playerDisplayName(p.player),
      teamSeasonId: p.teamSeasonId,
      textScores: p.textScores,
      deliveryScores: p.deliveryScores,
      textAdjusted: p.textAdjusted,
      deliveryAdjusted: p.deliveryAdjusted,
      totalScore: p.totalScore,
      votes: p.judgeVotes.map((v) => ({
        judgeName: v.judgeSession.name,
        judgeNumber: v.judgeSession.judgeNumber,
        dimension: v.dimension,
        score: v.score,
      })),
    })),
  }

  return <ScorerWizard match={matchData} />
}
