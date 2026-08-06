import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { cached } from '@/lib/redis'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PublicProfileClient } from './profile-public-client'

type Params = Promise<{ userId: string }>

/**
 * Публичный профиль пользователя /profile/[userId]
 */
export default async function PublicProfilePage({ params }: { params: Params }) {
  const { userId } = await params
  const session = await getSession()

  // Если это свой профиль — редирект на /profile
  if (session?.user?.id === userId) {
    redirect('/profile')
  }

  // Используем enhanced Prisma (анонимный доступ — User имеет @@allow('read', true))
  const db = getEnhancedPrisma(session?.user ?? undefined)

  // Получаем данные пользователя
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      uploaderScore: true,
      uploaderRank: true,
    },
  })

  if (!user) {
    notFound()
  }

  // Параллельно загружаем статистику — кэш 5 мин
  const [publishedAnime, distStats, libraryCount, completedAnimeCount, watchedEpisodesCount] = await cached(
    `profile:${userId}:data`,
    300,
    () =>
      Promise.all([
        // Опубликованные аниме (@@allow('read', status == PUBLISHED))
        db.anime.findMany({
          where: { uploadedById: userId, status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            title: true,
            coverUrl: true,
            directoryCid: true,
            year: true,
            createdAt: true,
          },
        }),
        // Статистика раздач
        db.distributionStats.findUnique({
          where: { userId },
        }),
        // Библиотека
        db.userLibraryItem.count({
          where: { userId },
        }),
        // Завершённые
        db.userLibraryItem.count({
          where: { userId, watchStatus: 'COMPLETED' },
        }),
        // Просмотренные эпизоды
        db.userWatchProgress.count({
          where: { libraryItem: { userId }, completed: true },
        }),
      ]),
  )

  // Количество опубликованных (всего)
  const publishedCount = await db.anime.count({
    where: { uploadedById: userId, status: 'PUBLISHED' },
  })

  const distributionStats = distStats
    ? {
      totalBytesUploaded: Number(distStats.totalBytesUploaded),
      totalSeedingTimeMs: Number(distStats.totalSeedingTimeMs),
      totalPeersHelped: distStats.totalPeersHelped,
    }
    : null

  return (
    <PublicProfileClient
      user={{
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        uploaderScore: user.uploaderScore,
        uploaderRank: user.uploaderRank,
      }}
      publishedAnime={publishedAnime}
      publishedCount={publishedCount}
      distributionStats={distributionStats}
      activityStats={{
        libraryCount,
        completedAnimeCount,
        watchedEpisodesCount,
      }}
    />
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { userId } = await params
  const db = getEnhancedPrisma(undefined)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  return {
    title: user ? `${user.name || 'Пользователь'} — Профиль` : 'Профиль не найден',
  }
}
