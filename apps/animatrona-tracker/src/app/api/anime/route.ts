/**
 * POST /api/anime — Публикация аниме из Animatrona
 *
 * Desktop отправляет directoryCid. Трекер сам резолвит manifest.json →
 * AnimeInfo → EpisodesDocument через IPFS gateway.
 * Аутентификация через API Key (Bearer token).
 *
 * GET /api/anime — Публичный каталог опубликованных аниме.
 */

import { getAgeGroup, getAllowedRatings } from '@/lib/age-rating'
import { buildAnimeMetadataFields, recreateEpisodes } from '@/lib/anime-upsert'
import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { isValidCid } from '@/lib/ipfs'
import {
  extractAnimeMetadata,
  resolveAnimeFromDirectory,
  resolveFranchiseKey,
  resolveRelations,
} from '@/lib/ipfs-resolver'
import { cancelQueuedPinsForCid } from '@/lib/pinning'
import { cached } from '@/lib/redis'
import { updateVoiceActingFromIpfs } from '@/lib/voice-acting'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

/**
 * Сохранить связи аниме из IPFS franchise graph в БД.
 * Использует unenhanced prisma (системная операция).
 */
async function saveAnimeRelations(
  animeId: string,
  manifest: import('@letar/animatrona-types').AnimeManifest,
  shikimoriId: number | null | undefined,
) {
  const relations = await resolveRelations(manifest, shikimoriId)
  if (relations.length === 0) {
    return
  }

  // Lookup targetAnimeId по shikimoriId в нашей БД
  const targetShikimoriIds = relations.map((r) => r.targetShikimoriId)
  const existingAnime = await prisma.anime.findMany({
    where: { shikimoriId: { in: targetShikimoriIds }, status: 'PUBLISHED' },
    select: { id: true, shikimoriId: true },
  })
  const shikimoriToAnimeId = new Map(existingAnime.map((a) => [a.shikimoriId, a.id]))

  // Удаляем старые связи и создаём новые (атомарно)
  await prisma.$transaction([
    prisma.animeRelation.deleteMany({ where: { animeId } }),
    ...relations.map((r) =>
      prisma.animeRelation.create({
        data: {
          animeId,
          targetShikimoriId: r.targetShikimoriId,
          targetAnimeId: shikimoriToAnimeId.get(r.targetShikimoriId) ?? null,
          relationKind: r.relationKind,
        },
      })
    ),
  ])

  // Обновляем чужие связи, указывающие на нас (targetShikimoriId = наш shikimoriId)
  // При первом импорте аниме-цели ещё нет в БД → targetAnimeId = null.
  // Теперь мы есть — заполняем targetAnimeId у всех, кто на нас ссылается.
  if (shikimoriId) {
    await prisma.animeRelation.updateMany({
      where: { targetShikimoriId: shikimoriId, targetAnimeId: null },
      data: { targetAnimeId: animeId },
    })
  }
}

// Схема публикации: directoryCid + данные о размере
const AnimePayloadSchema = z
  .object({
    directoryCid: z.string().min(1),
    directoryBlocks: z.number().int().positive().optional(),
    directorySize: z.number().int().nonnegative().optional(),
  })
  .strip()

export async function POST(request: NextRequest) {
  // Аутентификация по API Key
  const user = await verifyApiKey(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Требуется API Key в заголовке Authorization: Bearer <key>' },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 })
  }

  const parsed = AnimePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { directoryCid, directoryBlocks, directorySize } = parsed.data

  // Валидация CID
  if (!isValidCid(directoryCid)) {
    return NextResponse.json({ error: { message: 'Неверный формат directoryCid' } }, { status: 400 })
  }

  const db = getEnhancedPrisma(user)

  try {
    // Проверяем, существует ли аниме с таким directoryCid → UPDATE
    const existing = await db.anime.findFirst({
      where: { directoryCid },
      select: { id: true },
    })

    // Резолвим данные из IPFS (общее для всех путей)
    const resolved = await resolveAnimeFromDirectory(directoryCid)
    const metadata = extractAnimeMetadata(resolved)
    const metadataFields = buildAnimeMetadataFields(metadata, { directoryBlocks, directorySize })

    // Загружаем franchise graph для группировки (не блокирует при ошибке)
    const franchiseKey = await resolveFranchiseKey(resolved.manifest)

    if (existing) {
      // Повторная публикация с тем же directoryCid — обновляем метаданные
      const anime = await db.anime.update({
        where: { id: existing.id },
        data: { franchiseKey, ...metadataFields },
      })

      await recreateEpisodes(db, anime.id, metadata.episodes)

      // Сохраняем связи из franchise graph (fire-and-forget)
      void saveAnimeRelations(anime.id, resolved.manifest, metadata.shikimoriId)

      // Обновляем voiceActing из EpisodeManifest (fire-and-forget)
      void updateVoiceActingFromIpfs(anime.id, directoryCid)

      return NextResponse.json(
        {
          success: true,
          anime: {
            id: anime.id,
            title: anime.title,
            directoryCid,
            status: anime.status,
            episodeCount: metadata.episodes.length,
          },
        },
        { status: 200 },
      )
    }

    // Проверяем дубликат по shikimoriId
    let replacesAnimeId: string | undefined
    if (metadata.shikimoriId) {
      // Если есть PENDING заявка с тем же shikimoriId от того же пользователя — обновляем её
      const pendingDuplicate = await db.anime.findFirst({
        where: {
          shikimoriId: metadata.shikimoriId,
          status: 'PENDING',
          uploadedById: user.id,
        },
        select: { id: true, directoryCid: true },
      })

      if (pendingDuplicate) {
        // Записываем историю замены CID и отменяем ожидающие пины старого CID
        if (pendingDuplicate.directoryCid && pendingDuplicate.directoryCid !== directoryCid) {
          await db.cidHistory.create({
            data: {
              animeId: pendingDuplicate.id,
              oldCid: pendingDuplicate.directoryCid,
              newCid: directoryCid,
            },
          })
          // Удаляем QUEUED пины старого CID (PINNING оставляем — пусть допинится)
          void cancelQueuedPinsForCid(pendingDuplicate.directoryCid)
        }

        const anime = await db.anime.update({
          where: { id: pendingDuplicate.id },
          data: {
            directoryCid,
            franchiseKey,
            ...metadataFields,
          },
        })

        await recreateEpisodes(db, anime.id, metadata.episodes)

        // Сохраняем связи из franchise graph (fire-and-forget)
        void saveAnimeRelations(anime.id, resolved.manifest, metadata.shikimoriId)

        // Обновляем voiceActing из EpisodeManifest (fire-and-forget)
        void updateVoiceActingFromIpfs(anime.id, directoryCid)

        return NextResponse.json(
          {
            success: true,
            anime: {
              id: anime.id,
              title: anime.title,
              directoryCid,
              status: anime.status,
              episodeCount: metadata.episodes.length,
              replaced: true,
            },
          },
          { status: 200 },
        )
      }

      // Ищем PUBLISHED с таким же shikimoriId
      const publishedDuplicate = await db.anime.findFirst({
        where: {
          shikimoriId: metadata.shikimoriId,
          status: 'PUBLISHED',
        },
        select: { id: true, uploadedById: true },
      })
      if (publishedDuplicate) {
        // Любой пользователь (включая автора) — кандидат на замену через модерацию
        // Это позволяет одобрить + запинить обновление
        replacesAnimeId = publishedDuplicate.id
      }
    }

    // Создаём новое аниме
    const anime = await db.anime.create({
      data: {
        directoryCid,
        franchiseKey,
        ...metadataFields,
        uploadedById: user.id,
        replacesAnimeId,
        episodes: {
          create: metadata.episodes,
        },
      },
    })

    // Сохраняем связи из franchise graph (fire-and-forget)
    void saveAnimeRelations(anime.id, resolved.manifest, metadata.shikimoriId)

    // Обновляем voiceActing из EpisodeManifest (fire-and-forget)
    void updateVoiceActingFromIpfs(anime.id, directoryCid)

    return NextResponse.json(
      {
        success: true,
        anime: {
          id: anime.id,
          title: anime.title,
          directoryCid,
          status: anime.status,
          episodeCount: metadata.episodes.length,
          isReplacement: !!replacesAnimeId,
          replacesAnimeId: replacesAnimeId ?? null,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Ошибка публикации аниме:', error)

    // Ошибка резолва из IPFS
    if (error instanceof Error && error.message.includes('IPFS')) {
      return NextResponse.json({ error: `Не удалось загрузить данные из IPFS: ${error.message}` }, { status: 502 })
    }

    // ZenStack v3 ORM оборачивает ошибку в ORMError с полем `reason`
    // ('rejected-by-policy' — отказ в доступе, 'db-query-error' + dbErrorCode — ошибка драйвера БД).
    // Это не Prisma-коды P2004/P2002 — см. .claude/docs/zenstack-v3-orm-error-codes.md
    const ormError = error as { reason?: string; dbErrorCode?: string; message?: string }

    // ZenStack: отказ в доступе
    if (ormError.reason === 'rejected-by-policy' || ormError.message?.includes('denied')) {
      return NextResponse.json(
        { error: 'Нет прав для обновления этого аниме. Возможно, оно загружено другим пользователем.' },
        { status: 403 },
      )
    }

    // ZenStack v3: unique constraint violation (Postgres SQLSTATE 23505)
    if (ormError.reason === 'db-query-error' && ormError.dbErrorCode === '23505') {
      return NextResponse.json({ error: `Конфликт уникальности: ${ormError.message}` }, { status: 409 })
    }

    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

/**
 * GET /api/anime — Получить список опубликованных аниме
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const genre = searchParams.get('genre')
  const year = searchParams.get('year')
  const search = searchParams.get('search')
  // voiceActing — список через запятую (DUB_RU,SUB_EN). Возвращаем аниме, у которых ВСЕ указанные коды присутствуют.
  const voiceActingRaw = searchParams.get('voiceActing')
  const voiceActing = voiceActingRaw ? voiceActingRaw.split(',').filter(Boolean) : null

  // Возрастная фильтрация: определяем допустимые рейтинги по birthDate пользователя
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user
  const allowedRatings = getAllowedRatings(user?.birthDate)
  const ageGroup = getAgeGroup(user?.birthDate)

  const db = getEnhancedPrisma(null) // Анонимный доступ (только PUBLISHED)

  // Собираем фильтры в AND-массив для комбинирования
  const andFilters: Record<string, unknown>[] = []

  // Возрастной фильтр: только аниме с допустимым рейтингом
  // Контент без ageRating (null) скрыт для ограниченных пользователей — считается 17+
  if (allowedRatings) {
    andFilters.push({ ageRating: { in: allowedRatings } })
  }

  if (genre) {
    andFilters.push({ genres: { has: genre } })
  }

  if (year) {
    andFilters.push({ year: parseInt(year) })
  }

  if (search) {
    andFilters.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { titleOriginal: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { studio: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  // voiceActing: все указанные коды должны присутствовать (AND через массив hasEvery)
  if (voiceActing && voiceActing.length > 0) {
    andFilters.push({ voiceActing: { hasEvery: voiceActing } })
  }

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  }

  // Ключ кэша по параметрам запроса + возрастная группа (60 сек)
  const cacheKey = `api:anime:${ageGroup}:${page}:${limit}:${genre || ''}:${year || ''}:${search || ''}:${
    voiceActing?.join(',') || ''
  }`

  const [anime, total] = await cached(cacheKey, 60, () =>
    Promise.all([
      db.anime.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          titleOriginal: true,
          coverUrl: true,
          directoryCid: true,
          shikimoriId: true,
          franchiseKey: true,
          year: true,
          studio: true,
          genres: true,
          ageRating: true,
          createdAt: true,
          sourceRelations: {
            select: { targetShikimoriId: true, targetAnimeId: true, relationKind: true },
          },
          _count: { select: { episodes: true } },
        },
      }),
      db.anime.count({ where }),
    ]))

  return NextResponse.json(
    {
      data: anime.map(({ _count, sourceRelations, ...a }) => ({
        ...a,
        relations: sourceRelations,
        episodeCount: _count.episodes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    {
      headers: {
        // Кэширование публичного каталога — CDN 60 сек, stale 5 мин
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
