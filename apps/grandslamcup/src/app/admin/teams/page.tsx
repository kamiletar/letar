import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { TeamsClient } from './_components/teams-client'

type SearchParams = Promise<{ q?: string; city?: string }>

/** Команды — серверная загрузка с фильтрами */
export default async function TeamsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdmin()
  const { q, city: cityId } = await searchParams

  // Города для фильтра
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })

  // Предвыбор города для организатора одного города
  const isFullAdmin = user.roles.includes('ADMIN')
  let defaultCityId: string | undefined
  if (!isFullAdmin) {
    const organizerCities = await prisma.cityOrganizer.findMany({
      where: { userId: user.id },
      select: { cityId: true },
    })
    if (organizerCities.length === 1) {
      defaultCityId = organizerCities[0].cityId
    }
  }

  // Активный фильтр города (из URL или предвыбор)
  const activeCityId = cityId ?? defaultCityId ?? ''

  // Фильтры
  const where: Record<string, unknown> = {}
  if (q) {
    where.name = { contains: q, mode: 'insensitive' }
  }
  if (activeCityId) {
    where.cityId = activeCityId
  }

  const teams = await prisma.team.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      homeVenue: { select: { id: true, name: true } },
      _count: { select: { teamSeasons: true } },
    },
  })

  return (
    <TeamsClient
      teams={teams}
      cities={cities}
      searchQuery={q ?? ''}
      cityFilter={activeCityId}
      defaultCityId={defaultCityId}
    />
  )
}
