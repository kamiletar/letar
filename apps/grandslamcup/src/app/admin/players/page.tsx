import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { PlayersClient } from './_components/players-client'

const PAGE_SIZE = 30

type SearchParams = Promise<{ q?: string; city?: string; page?: string }>

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const { q, city: cityId, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  // Фильтры
  const where: Record<string, unknown> = {}
  if (q) {
    where.name = { contains: q, mode: 'insensitive' }
  }
  if (cityId) {
    where.cityId = cityId
  }

  // Города для фильтра
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })

  // Параллельно: список + общее кол-во
  const [players, totalCount] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        photo: true,
        bio: true,
        userId: true,
        socialLinks: true,
        disambiguation: true,
        city: { select: { id: true, name: true, slug: true } },
        _count: { select: { playerTeamSeasons: true, performances: true } },
        playerTeamSeasons: {
          where: { leftAt: null },
          take: 1,
          orderBy: { teamSeason: { season: { startDate: 'desc' } } },
          select: { teamSeason: { select: { team: { select: { slug: true } } } } },
        },
      },
    }),
    prisma.player.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <PlayersClient
      players={players}
      cities={cities}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      searchQuery={q ?? ''}
      cityFilter={cityId ?? ''}
    />
  )
}
