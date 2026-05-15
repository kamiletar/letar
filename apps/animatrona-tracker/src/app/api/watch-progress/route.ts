/**
 * API для прогресса просмотра
 *
 * GET /api/watch-progress?animeId=xxx — прогресс всех эпизодов аниме
 * POST /api/watch-progress — сохранить прогресс (upsert)
 *
 * Аутентификация: API Key (Bearer) или сессия
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { invalidate } from '@/lib/redis'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET — прогресс всех эпизодов аниме для текущего пользователя
 *
 * Query: ?animeId=string
 * Response: { episodes: { episodeNumber, currentTime, duration, completed, audioTrackIndex, subtitleTrackIndex }[] }
 */
export async function GET(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const animeId = url.searchParams.get('animeId')
  if (!animeId) {
    return NextResponse.json({ error: 'animeId required' }, { status: 400 })
  }

  const db = getEnhancedPrisma(user)

  // Находим libraryItem
  const libraryItem = await db.userLibraryItem.findUnique({
    where: { userId_animeId: { userId: user.id, animeId } },
    select: {
      watchProgress: {
        select: {
          episodeNumber: true,
          currentTime: true,
          duration: true,
          audioTrackIndex: true,
          subtitleTrackIndex: true,
          completed: true,
          updatedAt: true,
        },
        orderBy: { episodeNumber: 'asc' },
      },
    },
  })

  return NextResponse.json({
    episodes: libraryItem?.watchProgress ?? [],
  })
}

/**
 * POST — сохранить прогресс эпизода (вызывается плеером каждые 5 сек)
 *
 * Body: { animeId, episodeNumber, currentTime, duration, audioTrackIndex, subtitleTrackIndex, completed?, updatedAt? }
 * updatedAt — ISO string для conflict resolution (last-write-wins)
 */
export async function POST(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    animeId,
    episodeNumber,
    currentTime,
    duration,
    audioTrackIndex,
    subtitleTrackIndex,
    completed,
    trackMode,
    updatedAt: clientUpdatedAt,
  } = body

  if (!animeId || episodeNumber === undefined || currentTime === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Инференс duration: если не передан или 0, берём из модели эпизода или существующей записи
  let finalDuration = Number(duration || 0)
  if (finalDuration === 0) {
    // Пробуем взять из AnimeEpisode (duration хранится при импорте из Animatrona)
    const episode = await prisma.animeEpisode.findFirst({
      where: { animeId, number: Number(episodeNumber) },
      select: { duration: true },
    })
    if (episode?.duration && episode.duration > 0) {
      finalDuration = episode.duration
    }
  }

  const db = getEnhancedPrisma(user)

  // Upsert libraryItem (автоматически добавляем в библиотеку при просмотре)
  const libraryItem = await db.userLibraryItem.upsert({
    where: { userId_animeId: { userId: user.id, animeId } },
    create: {
      userId: user.id,
      animeId,
      watchStatus: 'WATCHING',
    },
    update: {
      // Не меняем watchStatus, если уже установлен
      watchStatus: undefined,
    },
    select: { id: true, watchStatus: true },
  })

  // Обновляем статус на WATCHING если был NOT_STARTED + trackMode per-anime
  const updateData: Record<string, unknown> = {}
  if (libraryItem.watchStatus === 'NOT_STARTED') {
    updateData.watchStatus = 'WATCHING'
  }
  if (trackMode === 'RUSSIAN_DUB' || trackMode === 'ORIGINAL_SUB') {
    updateData.trackMode = trackMode
  }
  if (Object.keys(updateData).length > 0) {
    await db.userLibraryItem.update({
      where: { id: libraryItem.id },
      data: updateData,
    })
  }

  // Определяем, завершён ли эпизод (>= 90% просмотрено)
  const isCompleted = completed ?? (finalDuration > 0 && currentTime >= finalDuration * 0.9)

  // Если duration не известен, сохраняем существующий из БД (не затираем нулём)
  let existingDuration = 0
  if (finalDuration === 0) {
    const existing = await db.userWatchProgress.findUnique({
      where: {
        libraryItemId_episodeNumber: {
          libraryItemId: libraryItem.id,
          episodeNumber: Number(episodeNumber),
        },
      },
      select: { duration: true },
    })
    if (existing?.duration && existing.duration > 0) {
      existingDuration = existing.duration
    }
  }
  const durationToSave = finalDuration > 0 ? finalDuration : existingDuration

  // Conflict resolution: если клиент передал updatedAt, проверяем не устарела ли запись
  if (clientUpdatedAt) {
    const existingForConflict = await db.userWatchProgress.findUnique({
      where: {
        libraryItemId_episodeNumber: {
          libraryItemId: libraryItem.id,
          episodeNumber: Number(episodeNumber),
        },
      },
      select: { updatedAt: true },
    })

    if (existingForConflict && new Date(clientUpdatedAt) < existingForConflict.updatedAt) {
      return NextResponse.json({ ok: true, skipped: true })
    }
  }

  // Upsert прогресс (durationToSave = инференс из эпизода или существующей записи)
  await db.userWatchProgress.upsert({
    where: {
      libraryItemId_episodeNumber: {
        libraryItemId: libraryItem.id,
        episodeNumber: Number(episodeNumber),
      },
    },
    create: {
      libraryItemId: libraryItem.id,
      episodeNumber: Number(episodeNumber),
      currentTime: Number(currentTime),
      duration: durationToSave,
      audioTrackIndex: Number(audioTrackIndex ?? 0),
      subtitleTrackIndex: Number(subtitleTrackIndex ?? -1),
      completed: isCompleted,
    },
    update: {
      currentTime: Number(currentTime),
      // Не затираем duration нулём если уже есть значение > 0
      ...(durationToSave > 0 ? { duration: durationToSave } : {}),
      audioTrackIndex: Number(audioTrackIndex ?? 0),
      subtitleTrackIndex: Number(subtitleTrackIndex ?? -1),
      completed: isCompleted,
    },
  })

  // Инвалидируем кэш "продолжить просмотр"
  await invalidate(`user:${user.id}:continue`)

  // Инкрементальное обновление viewCount (количество уникальных зрителей)
  // Пересчитываем для конкретного аниме — быстрый запрос
  try {
    const uniqueViewers = await prisma.userLibraryItem.count({
      where: {
        animeId,
        watchProgress: { some: {} },
      },
    })
    await prisma.anime.update({
      where: { id: animeId },
      data: { viewCount: uniqueViewers },
    })
  } catch {
    // Не критично — пересчитаем при recalc-stats
  }

  return NextResponse.json({ ok: true })
}
