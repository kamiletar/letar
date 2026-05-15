import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cached } from '@/lib/redis'
import { redirect } from 'next/navigation'
import { LeaderboardClient } from './_components/leaderboard-client'

/**
 * Страница лидерборда — топ пользователей по различным метрикам
 */
export default async function LeaderboardPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Весь лидерборд кэшируем в Redis на 15 мин (данные обновляются при heartbeat Desktop)
  const leaderboardData = await cached('leaderboard:all', 900, fetchLeaderboardData)

  return <LeaderboardClient currentUserId={session.user.id} {...leaderboardData} />
}

/** Загрузка данных лидерборда (7 запросов + агрегация) */
async function fetchLeaderboardData() {
  const db = prisma
  const TOP_LIMIT = 20

  const [
    topByUploaded,
    topByRatio,
    topBySeedingTime,
    topByUptime,
    topByPublished,
    topByLibrary,
    topByEpisodes,
    topByScore,
  ] = await Promise.all([
    // Топ по отданным данным
    db.distributionStats.findMany({
      where: { totalBytesUploaded: { gt: 0 } },
      orderBy: { totalBytesUploaded: 'desc' },
      take: TOP_LIMIT,
      include: { user: { select: { id: true, name: true } } },
    }),
    // Топ по ratio (отдано/загружено) — вычисляем на клиенте
    db.distributionStats.findMany({
      where: { totalBytesUploaded: { gt: 0 }, totalBytesDownloaded: { gt: 0 } },
      orderBy: { totalBytesUploaded: 'desc' },
      take: 100, // Берём больше для корректной сортировки по ratio
      include: { user: { select: { id: true, name: true } } },
    }),
    // Топ по времени раздачи
    db.distributionStats.findMany({
      where: { totalSeedingTimeMs: { gt: 0 } },
      orderBy: { totalSeedingTimeMs: 'desc' },
      take: TOP_LIMIT,
      include: { user: { select: { id: true, name: true } } },
    }),
    // Топ по аптайму
    db.distributionStats.findMany({
      where: { totalUptimeMs: { gt: 0 } },
      orderBy: { totalUptimeMs: 'desc' },
      take: TOP_LIMIT,
      include: { user: { select: { id: true, name: true } } },
    }),
    // Топ по опубликованным аниме
    db.anime.groupBy({
      by: ['uploadedById'],
      where: { status: 'PUBLISHED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: TOP_LIMIT,
    }),
    // Топ по размеру библиотеки
    db.userLibraryItem.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: TOP_LIMIT,
    }),
    // Топ по просмотренным эпизодам — агрегация в SQL вместо загрузки всех записей
    db.$queryRaw<Array<{ userId: string; count: bigint }>>`
      SELECT uli."userId", COUNT(*)::bigint as count
      FROM "UserWatchProgress" uwp
      JOIN "UserLibraryItem" uli ON uwp."libraryItemId" = uli.id
      WHERE uwp.completed = true
      GROUP BY uli."userId"
      ORDER BY count DESC
      LIMIT ${TOP_LIMIT}
    `,
    // Топ по рейтингу загрузчиков
    db.user.findMany({
      where: { uploaderScore: { gt: 0 } },
      orderBy: { uploaderScore: 'desc' },
      take: TOP_LIMIT,
      select: { id: true, name: true, uploaderScore: true, uploaderRank: true },
    }),
  ])

  // Получаем имена пользователей для groupBy результатов
  const userIds = new Set<string>()
  for (const item of topByPublished) {
    userIds.add(item.uploadedById)
  }
  for (const item of topByLibrary) {
    userIds.add(item.userId)
  }
  // Эпизоды — уже агрегированы в SQL
  for (const item of topByEpisodes) {
    userIds.add(item.userId)
  }

  const users =
    userIds.size > 0
      ? await db.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, name: true },
        })
      : []

  const userMap: Record<string, string> = {}
  for (const u of users) {
    userMap[u.id] = u.name || 'Аноним'
  }

  // Сериализация BigInt и подготовка данных
  const serialize = (stats: typeof topByUploaded) =>
    stats.map((s) => ({
      userId: s.userId,
      userName: s.user.name || 'Аноним',
      totalBytesUploaded: Number(s.totalBytesUploaded),
      totalBytesDownloaded: Number(s.totalBytesDownloaded),
      totalSeedingTimeMs: Number(s.totalSeedingTimeMs),
      totalUptimeMs: Number(s.totalUptimeMs),
      totalPeersHelped: s.totalPeersHelped,
      activeDistributions: s.activeDistributions,
    }))

  // Ratio: сортируем серверно
  const ratioSorted = topByRatio
    .map((s) => ({
      userId: s.userId,
      userName: s.user.name || 'Аноним',
      totalBytesUploaded: Number(s.totalBytesUploaded),
      totalBytesDownloaded: Number(s.totalBytesDownloaded),
      ratio: Number(s.totalBytesUploaded) / Number(s.totalBytesDownloaded),
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, TOP_LIMIT)

  return {
    topByUploaded: serialize(topByUploaded),
    topByRatio: ratioSorted,
    topBySeedingTime: serialize(topBySeedingTime),
    topByUptime: serialize(topByUptime),
    topByPublished: topByPublished.map((item) => ({
      userId: item.uploadedById,
      userName: userMap[item.uploadedById] || 'Аноним',
      count: item._count.id,
    })),
    topByLibrary: topByLibrary.map((item) => ({
      userId: item.userId,
      userName: userMap[item.userId] || 'Аноним',
      count: item._count.id,
    })),
    topByEpisodes: topByEpisodes.map((item) => ({
      userId: item.userId,
      userName: userMap[item.userId] || 'Аноним',
      count: Number(item.count),
    })),
    topByScore: topByScore.map((u) => ({
      userId: u.id,
      userName: u.name || 'Аноним',
      score: u.uploaderScore,
      rank: u.uploaderRank,
    })),
  }
}

export const metadata = {
  title: 'Лидерборд',
}
