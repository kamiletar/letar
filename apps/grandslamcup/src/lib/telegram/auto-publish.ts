/**
 * Автопубликация в Telegram при изменении статуса матча.
 *
 * Проверяет настройки TelegramConfig и отправляет сообщение
 * только если соответствующий флаг включён.
 *
 * @module auto-publish
 */

import { prisma } from '@/lib/db'

import { sendHalfTimeResult, sendMatchAnnouncement, sendMatchResult } from './senders'

/** Автопубликация анонса (при заполнении составов обеих команд) */
export async function autoPublishAnnouncement(matchId: string): Promise<void> {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.enabled || !config.autoAnnouncement) { return }

  try {
    await sendMatchAnnouncement(matchId)
  } catch (err) {
    console.error('[auto-publish] Ошибка отправки анонса:', err)
  }
}

/** Автопубликация итога тайма */
export async function autoPublishHalfTime(matchId: string, half: number): Promise<void> {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.enabled || !config.autoHalfTime) { return }

  try {
    await sendHalfTimeResult(matchId, half)
  } catch (err) {
    console.error('[auto-publish] Ошибка отправки итога тайма:', err)
  }
}

/** Автопубликация результата матча */
export async function autoPublishResult(matchId: string): Promise<void> {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.enabled || !config.autoResult) { return }

  try {
    await sendMatchResult(matchId)
  } catch (err) {
    console.error('[auto-publish] Ошибка отправки результата:', err)
  }
}
