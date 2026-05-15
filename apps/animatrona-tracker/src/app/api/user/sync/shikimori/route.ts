/**
 * POST /api/user/sync/shikimori — Импорт аниме-списка из Shikimori
 *
 * 1. Достаёт accessToken из Account (providerId=shikimori)
 * 2. Обновляет токен если просрочен
 * 3. Загружает user_rates из Shikimori API
 * 4. Маппит shikimori target_id → Anime.shikimoriId
 * 5. Upsert UserLibraryItem с watchStatus и userRating
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { invalidate } from '@/lib/redis'
import { getShikimoriUserRates, mapShikimoriStatus, refreshShikimoriToken } from '@/lib/shikimori'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // 1. Найти Shikimori аккаунт пользователя
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'shikimori' },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
    },
  })

  if (!account?.accessToken) {
    return NextResponse.json({ error: 'Shikimori аккаунт не привязан. Войдите через Shikimori.' }, { status: 400 })
  }

  // 2. Обновить токен если просрочен
  let accessToken = account.accessToken
  if (account.accessTokenExpiresAt && new Date(account.accessTokenExpiresAt) < new Date()) {
    if (!account.refreshToken) {
      return NextResponse.json({ error: 'Токен Shikimori истёк. Войдите через Shikimori повторно.' }, { status: 400 })
    }

    try {
      const tokens = await refreshShikimoriToken(account.refreshToken)
      accessToken = tokens.access_token

      // Обновить токены в БД
      await prisma.account.update({
        where: { id: account.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      })
    } catch (err) {
      console.error('[shikimori-sync] Ошибка обновления токена:', err)
      return NextResponse.json({ error: 'Не удалось обновить токен Shikimori. Войдите повторно.' }, { status: 400 })
    }
  }

  // 3. Загрузить user_rates из Shikimori
  let rates
  try {
    rates = await getShikimoriUserRates(accessToken)
  } catch (err) {
    console.error('[shikimori-sync] Ошибка получения списка:', err)
    return NextResponse.json({ error: 'Не удалось загрузить список из Shikimori' }, { status: 502 })
  }

  // 4. Маппим shikimori target_id → наши аниме
  const shikimoriIds = rates.map((r) => r.target_id)
  const ourAnime = await prisma.anime.findMany({
    where: {
      shikimoriId: { in: shikimoriIds },
      status: 'PUBLISHED',
    },
    select: { id: true, shikimoriId: true },
  })

  const animeByShikimoriId = new Map<number, string>()
  for (const a of ourAnime) {
    if (a.shikimoriId) {
      animeByShikimoriId.set(a.shikimoriId, a.id)
    }
  }

  // 5. Upsert UserLibraryItem
  let imported = 0
  let skipped = 0
  let notFound = 0

  for (const rate of rates) {
    const animeId = animeByShikimoriId.get(rate.target_id)
    if (!animeId) {
      notFound++
      continue
    }

    const watchStatus = mapShikimoriStatus(rate.status)
    const userRating = rate.score // 0-10, 0 = нет оценки

    try {
      await prisma.userLibraryItem.upsert({
        where: { userId_animeId: { userId, animeId } },
        create: {
          userId,
          animeId,
          watchStatus,
          userRating,
        },
        update: {
          watchStatus,
          ...(userRating > 0 ? { userRating } : {}),
        },
      })
      imported++
    } catch {
      skipped++
    }
  }

  // 6. Инвалидируем кэш профиля
  await invalidate(`profile:${userId}:*`, `user:${userId}:*`)

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    notFound,
    total: rates.length,
  })
}
