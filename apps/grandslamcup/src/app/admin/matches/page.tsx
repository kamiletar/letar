import { ITEMS_PER_PAGE } from '@/lib/constants'
import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME_SLUG } from '@/lib/prisma-includes'
import { MatchesClient } from './_components/matches-client'

type SearchParams = Promise<{ city?: string; status?: string; limit?: string }>

export default async function MatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const { city, status, limit: limitStr } = await searchParams

  const limit = Math.min(parseInt(limitStr ?? '') || ITEMS_PER_PAGE, 500)

  // Собираем where-фильтр
  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') {
    where.status = status
  }
  if (city && city !== 'ALL') {
    where.venue = { cityId: city }
  }

  const [matches, totalCount, cities] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      take: limit,
      include: {
        ...MATCH_TEAMS_NAME_SLUG,
        venue: { select: { name: true, cityId: true } },
        scorerUser: { select: { id: true, name: true } },
        presenterUser: { select: { id: true, name: true } },
        tour: {
          select: {
            number: true,
            round: { select: { name: true, season: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.match.count({ where }),
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  // Получаем citySlug для каждого города через отдельный запрос (чтобы не ломать ZenStack)
  const cityMap = new Map<string, string>()
  const allCities = await prisma.city.findMany({ select: { id: true, slug: true } })
  for (const c of allCities) {
    cityMap.set(c.id, c.slug)
  }

  // Добавляем citySlug к матчам
  const matchesWithCity = matches.map((m) => {
    const venueCity = m.venue?.cityId ? cityMap.get(m.venue.cityId) : undefined
    return { ...m, citySlug: venueCity ?? '' }
  })

  return (
    <MatchesClient
      matches={matchesWithCity}
      totalCount={totalCount}
      cities={cities}
      currentCity={city ?? 'ALL'}
      currentStatus={status ?? 'ALL'}
    />
  )
}
