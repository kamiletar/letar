import { prisma } from '@/lib/db'
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grandslamcup.letar.best'

/** Динамический sitemap — все публичные страницы */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, teams, players, venues, matches, news] = await Promise.all([
    prisma.city.findMany({ select: { slug: true } }),
    prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.player.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.venue.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.match.findMany({
      where: { status: { in: ['FINISHED', 'SCHEDULED'] } },
      select: {
        id: true,
        updatedAt: true,
        tour: { select: { round: { select: { season: { select: { city: { select: { slug: true } } } } } } } },
      },
    }),
    prisma.newsPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ])

  const citySlugs = cities.map((c) => c.slug)

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    ...citySlugs.flatMap((city) => [
      { url: `${BASE_URL}/${city}`, changeFrequency: 'daily' as const, priority: 0.9 },
      { url: `${BASE_URL}/${city}/schedule`, changeFrequency: 'daily' as const, priority: 0.7 },
      { url: `${BASE_URL}/${city}/standings`, changeFrequency: 'daily' as const, priority: 0.7 },
      { url: `${BASE_URL}/${city}/teams`, changeFrequency: 'weekly' as const, priority: 0.6 },
      { url: `${BASE_URL}/${city}/players`, changeFrequency: 'weekly' as const, priority: 0.6 },
      { url: `${BASE_URL}/${city}/venues`, changeFrequency: 'weekly' as const, priority: 0.5 },
      { url: `${BASE_URL}/${city}/rules`, changeFrequency: 'monthly' as const, priority: 0.4 },
      { url: `${BASE_URL}/${city}/donate`, changeFrequency: 'monthly' as const, priority: 0.3 },
    ]),
    { url: `${BASE_URL}/news`, changeFrequency: 'daily', priority: 0.7 },
  ]

  // Команды — для каждого города
  const teamPages: MetadataRoute.Sitemap = citySlugs.flatMap((city) =>
    teams.map((t) => ({
      url: `${BASE_URL}/${city}/teams/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  )

  // Поэты
  const playerPages: MetadataRoute.Sitemap = citySlugs.flatMap((city) =>
    players.map((p) => ({
      url: `${BASE_URL}/${city}/players/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  )

  // Стадионы
  const venuePages: MetadataRoute.Sitemap = citySlugs.flatMap((city) =>
    venues.map((v) => ({
      url: `${BASE_URL}/${city}/venues/${v.slug}`,
      lastModified: v.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  )

  // Матчи — привязаны к городу через tour
  const matchPages: MetadataRoute.Sitemap = matches.map((m) => {
    const citySlug = m.tour?.round?.season?.city?.slug ?? citySlugs[0]
    return {
      url: `${BASE_URL}/${citySlug}/matches/${m.id}`,
      lastModified: m.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }
  })

  // Новости
  const newsPages: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${BASE_URL}/news/${n.slug}`,
    lastModified: n.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...teamPages, ...playerPages, ...venuePages, ...matchPages, ...newsPages]
}
