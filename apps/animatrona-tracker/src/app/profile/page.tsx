import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ProfileClient } from './_components/profile-client'

interface ProfilePageProps {
  searchParams: Promise<{
    tab?: string
    page?: string
    q?: string
  }>
}

/**
 * Страница профиля пользователя
 * Серверный компонент с пагинацией аниме и табами
 */
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const db = getEnhancedPrisma(session.user)

  // Пагинация для таба "anime"
  const currentPage = parseInt(params.page || '1', 10)
  const limit = 20
  const skip = (currentPage - 1) * limit

  // Фильтр поиска по названию
  const searchFilter = params.q
    ? {
      OR: [
        { title: { contains: params.q, mode: 'insensitive' as const } },
        { titleOriginal: { contains: params.q, mode: 'insensitive' as const } },
      ],
    }
    : {}

  const animeWhere = {
    uploadedById: session.user.id,
    // HIDDEN = архивные (старые версии после approve_replacement) — не показываем
    status: { not: 'HIDDEN' as const },
    ...searchFilter,
  }

  // Аниме с расширенным select (для карточек) + count — параллельно
  const [animeList, totalAnime, totalPublished, totalPending] = await Promise.all([
    db.anime.findMany({
      where: animeWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        title: true,
        titleOriginal: true,
        coverUrl: true,
        shikimoriId: true,
        franchiseKey: true,
        year: true,
        studio: true,
        genres: true,
        ageRating: true,
        status: true,
        createdAt: true,
        viewCount: true,
        avgRating: true,
        _count: {
          select: { episodes: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    }),
    db.anime.count({ where: animeWhere }),
    db.anime.count({ where: { uploadedById: session.user.id, status: 'PUBLISHED' } }),
    db.anime.count({ where: { uploadedById: session.user.id, status: 'PENDING' } }),
  ])

  const totalPages = Math.ceil(totalAnime / limit)

  const stats = {
    totalAnime,
    publishedCount: totalPublished,
    pendingCount: totalPending,
  }

  // Статистика раздач и активности — параллельно
  const [distStats, libraryCount, completedAnimeCount, watchedEpisodesCount] = await Promise.all([
    db.distributionStats.findUnique({
      where: { userId: session.user.id },
    }),
    db.userLibraryItem.count({
      where: { userId: session.user.id },
    }),
    db.userLibraryItem.count({
      where: { userId: session.user.id, watchStatus: 'COMPLETED' },
    }),
    db.userWatchProgress.count({
      where: { libraryItem: { userId: session.user.id }, completed: true },
    }),
  ])

  const distributionStats = distStats
    ? {
      totalBytesUploaded: Number(distStats.totalBytesUploaded),
      totalBytesDownloaded: Number(distStats.totalBytesDownloaded),
      totalSeedingTimeMs: Number(distStats.totalSeedingTimeMs),
      totalPeersHelped: distStats.totalPeersHelped,
      totalUptimeMs: Number(distStats.totalUptimeMs),
      activeDistributions: distStats.activeDistributions,
    }
    : null

  const activityStats = {
    libraryCount,
    completedAnimeCount,
    watchedEpisodesCount,
  }

  // Настройки + привязанные аккаунты — параллельно
  const [userSettings, linkedAccounts] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { preferredTrackMode: true },
    }),
    db.account.findMany({
      where: { userId: session.user.id },
      select: { providerId: true, createdAt: true },
    }),
  ])

  // Определяем, есть ли микс статусов (для показа фильтра)
  const hasStatusMix = totalPublished > 0 && totalPending > 0

  return (
    <ProfileClient
      user={{ ...session.user, preferredTrackMode: userSettings?.preferredTrackMode }}
      animeList={animeList}
      stats={stats}
      page={currentPage}
      totalPages={totalPages}
      query={params.q || ''}
      tab={params.tab || 'anime'}
      hasStatusMix={hasStatusMix}
      distributionStats={distributionStats}
      activityStats={activityStats}
      linkedAccounts={linkedAccounts.map((a) => ({ providerId: a.providerId, linkedAt: a.createdAt }))}
    />
  )
}

export const metadata = {
  title: 'Профиль',
}
