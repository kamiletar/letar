import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AdminClient } from './_components/admin-client'

/**
 * Админ-панель для модерации аниме
 *
 * Pin jobs и seeds загружаются клиентским TanStack Query,
 * здесь грузим только moderation, pin servers и статистику.
 */
export default async function AdminPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверяем роль
  if (session.user.role !== 'MODERATOR' && session.user.role !== 'ADMIN') {
    redirect('/anime')
  }

  const db = getEnhancedPrisma(session.user)

  // Поля для карточки модерации (description включён для сравнения замен)
  const animeSelect = {
    id: true,
    title: true,
    titleOriginal: true,
    coverUrl: true,
    directoryCid: true,
    directorySize: true,
    directoryBlocks: true,
    shikimoriId: true,
    malId: true,
    anilistId: true,
    description: true,
    replacesAnimeId: true,
    year: true,
    studio: true,
    genres: true,
    status: true,
    createdAt: true,
  } as const

  // Эпизоды: videoCid + duration для поэпизодного сравнения замен (без лимита — нужны все)
  const episodeSelect = {
    select: { id: true, number: true, title: true, videoCid: true, duration: true },
    orderBy: { number: 'asc' as const },
  }

  // Получаем аниме на модерации (лимит 30 — оптимизация памяти)
  const pendingAnime = await db.anime.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 30,
    select: {
      ...animeSelect,
      uploadedBy: { select: { id: true, name: true, email: true } },
      episodes: episodeSelect,
      // Данные о замещаемом аниме (для UI сравнения)
      replacesAnime: {
        select: {
          ...animeSelect,
          uploadedBy: { select: { id: true, name: true, email: true } },
          episodes: episodeSelect,
        },
      },
    },
  })

  // Получаем пин-серверы (select вместо include — не тянем секреты на клиент)
  const pinServers = await db.pinServer.findMany({
    orderBy: { name: 'asc' },
    take: 50,
    select: {
      id: true,
      name: true,
      apiUrl: true,
      peerId: true,
      authSecret: true, // Нужен для бейджа "Авторизация" в UI
      status: true,
      role: true,
      capacityBytes: true,
      usedBytes: true,
      createdAt: true,
      _count: { select: { pinJobs: true } },
    },
  })

  // Статистика — параллельные count запросы вместо последовательных
  const [totalPublished, totalUsers, pinnedCount] = await Promise.all([
    db.anime.count({ where: { status: 'PUBLISHED' } }),
    db.user.count(),
    db.pinJob.count({ where: { status: 'PINNED' } }),
  ])

  const stats = {
    pendingAnime: pendingAnime.length,
    totalPublished,
    totalUsers,
    pinnedCount,
  }

  // Сериализуем BigInt
  const serializedServers = pinServers.map((s) => ({
    ...s,
    capacityBytes: Number(s.capacityBytes),
    usedBytes: Number(s.usedBytes),
  }))

  // Группировка конкурирующих заявок по shikimoriId
  const shikimoriGroups = new Map<number, string[]>()
  for (const anime of pendingAnime) {
    if (anime.shikimoriId) {
      const group = shikimoriGroups.get(anime.shikimoriId) || []
      group.push(anime.id)
      shikimoriGroups.set(anime.shikimoriId, group)
    }
  }

  // Сериализуем BigInt в pendingAnime + добавляем инфо о конкурентах
  const serializedPending = pendingAnime.map((a) => {
    // Конкуренты: другие PENDING с тем же shikimoriId
    const group = a.shikimoriId ? shikimoriGroups.get(a.shikimoriId) : undefined
    const competingAnimeIds = group && group.length > 1 ? group.filter((id) => id !== a.id) : undefined

    return {
      ...a,
      directorySize: a.directorySize ? Number(a.directorySize) : null,
      replacesAnime: a.replacesAnime
        ? {
          ...a.replacesAnime,
          directorySize: a.replacesAnime.directorySize ? Number(a.replacesAnime.directorySize) : null,
        }
        : null,
      competingCount: competingAnimeIds?.length ?? 0,
      competingAnimeIds,
    }
  })

  return (
    <AdminClient
      pendingAnime={serializedPending}
      stats={stats}
      pinServers={serializedServers}
      userRole={session.user.role}
    />
  )
}

export const metadata = {
  title: 'Админ-панель',
}
