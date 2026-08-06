import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOnlineDistributions } from '@/lib/redis-distributions'
import { NextResponse } from 'next/server'

/** Тип сида */
interface Seed {
  type: 'desktop' | 'pin-server'
  /** Имя сервера или пользователя */
  name: string
  peerId: string | null
  size: number
  /** Для desktop — последний heartbeat, для pin-server — дата пиннинга */
  lastSeenAt: string
  /** Онлайн-статус: true если ключ существует в Redis */
  online: boolean
  /** Статус из PostgreSQL: ACTIVE/PAUSED/OFFLINE для desktop, PINNED для pin-server */
  status: string
}

/** Аниме с его сидами */
interface AnimeSeed {
  animeId: string
  title: string
  coverUrl: string | null
  shikimoriId: number | null
  totalSize: number
  /** Количество сидов, которые сейчас онлайн */
  onlineCount: number
  seeds: Seed[]
}

/**
 * GET /api/admin/seeds
 * Объединённый список сидов: desktop раздачи + pin-серверы (PINNED).
 * Онлайн-статус desktop пиров — из Redis (TTL 1ч).
 */
export async function GET() {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'MODERATOR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Параллельно загружаем desktop-раздачи, pin-сервер сиды, маппинг CID→Anime и Redis онлайн
  const [distributions, pinnedJobs, animeList, onlinePeers] = await Promise.all([
    prisma.distribution.findMany({
      select: {
        id: true,
        cid: true,
        peerId: true,
        size: true,
        status: true,
        lastSeenAt: true,
        animeId: true,
        user: { select: { name: true } },
        anime: { select: { id: true, title: true, coverUrl: true, shikimoriId: true } },
      },
    }),
    prisma.pinJob.findMany({
      where: { status: 'PINNED', animeId: { not: null } },
      select: {
        cid: true,
        size: true,
        createdAt: true,
        animeId: true,
        server: { select: { name: true, peerId: true, status: true } },
        anime: { select: { id: true, title: true, coverUrl: true, shikimoriId: true } },
      },
    }),
    // Маппинг directoryCid → Anime для desktop раздач без animeId
    prisma.anime.findMany({
      where: { directoryCid: { not: null } },
      select: { id: true, title: true, coverUrl: true, shikimoriId: true, directoryCid: true },
    }),
    // Все онлайн пиры из Redis
    getOnlineDistributions(),
  ])

  // Set онлайн пиров для быстрого поиска: "peerId:cid" → true
  const onlineSet = new Set(onlinePeers.map((p) => `${p.peerId}:${p.cid}`))

  // Карта CID → Anime для сопоставления desktop раздач
  const cidToAnime = new Map<string, (typeof animeList)[0]>()
  for (const anime of animeList) {
    if (anime.directoryCid) {
      cidToAnime.set(anime.directoryCid, anime)
    }
  }

  // Группируем по animeId
  const animeMap = new Map<string, AnimeSeed>()

  // Desktop раздачи — показываем все, онлайн-статус из Redis
  for (const dist of distributions) {
    // Определяем аниме: через связь animeId или через CID
    const anime = dist.anime ?? cidToAnime.get(dist.cid) ?? null
    const animeId = dist.animeId ?? anime?.id ?? null
    if (!animeId || !anime) {
      continue
    }

    if (!animeMap.has(animeId)) {
      animeMap.set(animeId, {
        animeId,
        title: anime.title,
        coverUrl: anime.coverUrl,
        shikimoriId: anime.shikimoriId,
        totalSize: 0,
        onlineCount: 0,
        seeds: [],
      })
    }

    const isOnline = onlineSet.has(`${dist.peerId}:${dist.cid}`)
    const entry = animeMap.get(animeId)!
    const size = Number(dist.size)
    entry.totalSize = Math.max(entry.totalSize, size)
    if (isOnline) {
      entry.onlineCount++
    }
    entry.seeds.push({
      type: 'desktop',
      name: dist.user.name || 'Пользователь',
      peerId: dist.peerId,
      size,
      lastSeenAt: dist.lastSeenAt.toISOString(),
      online: isOnline,
      status: dist.status,
    })
  }

  // Pin-серверы (PINNED = сидирует)
  for (const job of pinnedJobs) {
    if (!job.animeId || !job.anime) {
      continue
    }

    if (!animeMap.has(job.animeId)) {
      animeMap.set(job.animeId, {
        animeId: job.animeId,
        title: job.anime.title,
        coverUrl: job.anime.coverUrl,
        shikimoriId: job.anime.shikimoriId,
        totalSize: 0,
        onlineCount: 0,
        seeds: [],
      })
    }

    const isPinServerOnline = job.server.status === 'ONLINE'
    const entry = animeMap.get(job.animeId)!
    const size = Number(job.size)
    entry.totalSize = Math.max(entry.totalSize, size)
    if (isPinServerOnline) {
      entry.onlineCount++
    }
    entry.seeds.push({
      type: 'pin-server',
      name: job.server.name,
      peerId: job.server.peerId,
      size,
      lastSeenAt: job.createdAt.toISOString(),
      online: isPinServerOnline,
      status: isPinServerOnline ? 'ACTIVE' : 'OFFLINE',
    })
  }

  // Сортируем: больше онлайн сидов → выше
  const result = Array.from(animeMap.values()).sort(
    (a, b) => b.onlineCount - a.onlineCount || b.seeds.length - a.seeds.length,
  )

  return NextResponse.json({ data: result })
}
