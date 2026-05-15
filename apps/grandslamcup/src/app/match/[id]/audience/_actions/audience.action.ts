'use server'

/**
 * Server action для зрительского голосования
 *
 * Зритель оценивает текст и подачу (1-5) каждого поэта.
 * Не влияет на результат матча.
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent } from '@/lib/sse/broadcast'
import { verifyTelegramInitData } from '@/lib/telegram/verify-init-data'
import { cookies } from 'next/headers'
import { v4 as uuid } from 'uuid'
import { z } from 'zod/v4'

const VoteSchema = z
  .object({
    matchId: z.string(),
    performanceId: z.string(),
    textScore: z.number().int().min(1).max(5),
    deliveryScore: z.number().int().min(1).max(5),
    name: z.string().max(50).optional(),
    /// Сырая строка initData из window.Telegram.WebApp.initData (если открыто в Mini App)
    telegramInitData: z.string().optional(),
  })
  .strip()

export async function submitAudienceVoteAction(input: unknown) {
  const parsed = VoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Неверные данные' }
  }

  const { matchId, performanceId, textScore, deliveryScore, name, telegramInitData } = parsed.data

  // Если зритель пришёл из Telegram Mini App — валидируем initData по HMAC
  // и привязываем sessionToken к Telegram-userId (защита от накрутки одним человеком
  // через несколько вкладок и от ботов).
  let telegramUserId: number | null = null
  if (telegramInitData) {
    const verified = await verifyTelegramInitData(telegramInitData)
    if (!verified.ok) {
      return { error: `Telegram: ${verified.error ?? 'не удалось верифицировать'}` }
    }
    telegramUserId = verified.user?.id ?? null
  }

  // Получаем или создаём токен зрителя.
  // Для Telegram-пользователей — детерминированный токен на основе их ID,
  // чтобы один человек не мог проголосовать дважды переоткрытием Mini App.
  const cookieStore = await cookies()
  let sessionToken: string
  if (telegramUserId !== null) {
    sessionToken = `tg:${telegramUserId}`
  } else {
    sessionToken = cookieStore.get('audience_token')?.value ?? uuid()
    if (!cookieStore.get('audience_token')) {
      cookieStore.set('audience_token', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 часа
        path: '/',
      })
    }
  }

  // Проверяем что матч и перформанс существуют
  const performance = await prisma.playerPerformance.findUnique({
    where: { id: performanceId },
    select: { matchId: true },
  })
  if (!performance || performance.matchId !== matchId) {
    return { error: 'Выступление не найдено' }
  }

  // Upsert — обновляем если зритель уже голосовал
  try {
    await prisma.audienceVote.upsert({
      where: {
        performanceId_sessionToken: { performanceId, sessionToken },
      },
      create: { matchId, performanceId, sessionToken, name, textScore, deliveryScore },
      update: { textScore, deliveryScore, name },
    })
  } catch {
    return { error: 'Ошибка при сохранении голоса' }
  }

  // Broadcast статистику зрительского голосования для проектора
  try {
    const stats = await prisma.audienceVote.aggregate({
      where: { performanceId },
      _avg: { textScore: true, deliveryScore: true },
      _count: true,
    })
    broadcastMatchEvent(matchId, 'audience:voted', {
      performanceId,
      count: stats._count,
      avgText: stats._avg.textScore ? Math.round(stats._avg.textScore * 10) / 10 : 0,
      avgDelivery: stats._avg.deliveryScore ? Math.round(stats._avg.deliveryScore * 10) / 10 : 0,
    })
  } catch {
    // Ошибка broadcast не блокирует голосование
  }

  return { success: true }
}
