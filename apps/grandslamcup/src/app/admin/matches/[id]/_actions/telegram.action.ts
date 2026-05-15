'use server'

/**
 * Server actions для публикации матча в Telegram
 */

import { adminGuard } from '@/lib/action-guard'
import { sendHalfTimeResult, sendMatchAnnouncement, sendMatchResult } from '@/lib/telegram'
import type { ActionResult } from '@/lib/types'

/** Опубликовать анонс матча в Telegram-канал города */
export const publishAnnouncementAction = adminGuard(async (matchId: string): Promise<ActionResult> => {
  const result = await sendMatchAnnouncement(matchId)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Неизвестная ошибка' }
  }

  return { success: true }
})

/** Опубликовать промежуточный итог тайма */
export const publishHalfTimeAction = adminGuard(async (matchId: string, half: number): Promise<ActionResult> => {
  const result = await sendHalfTimeResult(matchId, half)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Неизвестная ошибка' }
  }

  return { success: true }
})

/** Опубликовать финальный результат матча */
export const publishResultAction = adminGuard(async (matchId: string): Promise<ActionResult> => {
  const result = await sendMatchResult(matchId)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Неизвестная ошибка' }
  }

  return { success: true }
})
