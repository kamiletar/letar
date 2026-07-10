import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { CreateMatchForm } from './_components/create-match-form'

/** Страница создания матча (только для админов/организаторов) */
export default async function CreateMatchPage() {
  const user = await requireAdmin()

  // Города, в которых пользователь — организатор
  const organizerCities = await prisma.cityOrganizer.findMany({
    where: { userId: user.id },
    select: { cityId: true },
  })
  const organizerCityIds = organizerCities.map((c) => c.cityId)
  const isFullAdmin = user.roles.includes('ADMIN')

  // Загружаем данные для dropdowns параллельно
  const [cities, seasons, teamSeasons, venues, tours, bracketSlots, swissMatches] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, useHomeAway: true },
    }),
    prisma.season.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cityId: true },
    }),
    prisma.teamSeason.findMany({
      include: {
        team: { select: { name: true } },
        season: { select: { id: true, name: true, cityId: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: { team: { name: 'asc' } },
    }),
    prisma.venue.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cityId: true },
    }),
    prisma.tour.findMany({
      include: {
        round: {
          select: {
            name: true,
            seasonId: true,
            number: true,
            startDate: true,
            stageId: true,
            season: { select: { name: true, cityId: true, status: true } },
          },
        },
        _count: { select: { matches: true } },
      },
      orderBy: [{ round: { season: { name: 'asc' } } }, { round: { number: 'asc' } }, { number: 'asc' }],
    }),
    // Слоты плей-офф сетки с уже определёнными командами
    prisma.bracketSlot.findMany({
      where: { teamSeasonId: { not: null } },
      select: { stageId: true, teamSeasonId: true },
    }),
    // Swiss-матчи для вычисления W-L (все статусы кроме POSTPONED)
    prisma.match.findMany({
      where: {
        status: { in: ['FINISHED', 'LIVE', 'SCHEDULED'] },
        tour: { round: { stageId: null, season: { status: 'ACTIVE' } } },
      },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, status: true },
    }),
  ])

  // W-L + total по teamSeason для Swiss-матчей
  // total = все матчи (FINISHED+LIVE+SCHEDULED) → определяет текущий тур команды
  // wins/losses = только FINISHED → определяет выбывших/прошедших
  const swissRecords = new Map<string, { total: number; wins: number; losses: number }>()
  const ensure = (id: string) => {
    if (!swissRecords.has(id)) swissRecords.set(id, { total: 0, wins: 0, losses: 0 })
    return swissRecords.get(id)!
  }
  for (const m of swissMatches) {
    ensure(m.homeTeamId).total++
    ensure(m.awayTeamId).total++
    if (m.status === 'FINISHED' && m.homeScore !== null && m.awayScore !== null) {
      if (m.homeScore > m.awayScore) {
        ensure(m.homeTeamId).wins++
        ensure(m.awayTeamId).losses++
      } else {
        ensure(m.homeTeamId).losses++
        ensure(m.awayTeamId).wins++
      }
    }
  }
  // Сериализуем записи для клиента
  const swissTeamRecords: Record<string, { total: number; wins: number; losses: number }> =
    Object.fromEntries(swissRecords)

  // Сериализуем для клиента
  const serializedTeamSeasons = teamSeasons.map((ts) => ({
    id: ts.id,
    teamName: ts.team.name,
    seasonId: ts.seasonId,
    seasonName: ts.season.name,
    cityId: ts.season.cityId,
    leagueId: ts.leagueId,
    leagueName: ts.league.name,
  }))

  const serializedTours = tours.map((t) => ({
    id: t.id,
    number: t.number,
    roundNumber: t.round.number,
    roundName: t.round.name,
    roundStartDate: t.round.startDate?.toISOString() ?? null,
    seasonId: t.round.seasonId,
    seasonName: t.round.season.name,
    seasonStatus: t.round.season.status as string,
    cityId: t.round.season.cityId,
    matchCount: t._count.matches,
    stageId: t.round.stageId ?? null,
  }))

  const serializedBracketSlots = bracketSlots
    .filter((s): s is { stageId: string; teamSeasonId: string } => s.teamSeasonId !== null)
    .map((s) => ({ stageId: s.stageId, teamSeasonId: s.teamSeasonId }))

  const serializedSeasons = seasons.map((s) => ({
    id: s.id,
    name: s.name,
    cityId: s.cityId,
  }))

  const serializedVenues = venues.map((v) => ({
    id: v.id,
    name: v.name,
    cityId: v.cityId,
  }))

  return (
    <CreateMatchForm
      cities={cities}
      seasons={serializedSeasons}
      teamSeasons={serializedTeamSeasons}
      venues={serializedVenues}
      tours={serializedTours}
      bracketSlots={serializedBracketSlots}
      swissTeamRecords={swissTeamRecords}
      organizerCityIds={isFullAdmin ? null : organizerCityIds}
    />
  )
}
