/**
 * Личные сообщения в Telegram (не в каналы, а в личный чат пользователя).
 * Требует привязки telegramChatId через /start link_{userId}.
 *
 * @module senders-personal
 */

import { InlineKeyboard } from 'grammy'

import { prisma } from '@/lib/db'

import type { SendResult } from './bot'
import { getTelegramBot } from './bot'
import { SITE_URL } from './helpers'
import { loadMatchData } from './match-data'

/** Отправить напоминание тренеру: "Заявите состав на матч через 24 часа" */
export async function sendCoachLineupReminder(matchId: string): Promise<SendResult[]> {
  const bot = await getTelegramBot()
  if (!bot) {
    return [{ success: false, error: 'Telegram-бот не настроен или выключен' }]
  }

  const match = await loadMatchData(matchId)
  if (!match) {
    return [{ success: false, error: 'Матч не найден' }]
  }

  // Находим тренеров обеих команд (через PlayerTeamSeason → Player → User)
  const teamIds = [match.homeTeamId, match.awayTeamId].filter(Boolean)
  const coaches = await prisma.playerTeamSeason.findMany({
    where: {
      teamSeasonId: { in: teamIds },
      role: { in: ['COACH', 'ASSISTANT_COACH'] },
      leftAt: null,
    },
    include: {
      player: {
        include: {
          user: { select: { telegramChatId: true, name: true } },
        },
      },
      teamSeason: { include: { team: { select: { name: true } } } },
    },
  })

  // Проверяем какие команды НЕ заявили состав
  const results: SendResult[] = []

  for (const coach of coaches) {
    const chatId = coach.player.user?.telegramChatId
    if (!chatId) { continue }

    // Проверяем: заявлен ли состав этой команды?
    const lineup = await prisma.matchLineup.findFirst({
      where: { matchId, teamSeasonId: coach.teamSeasonId },
    })
    if (lineup) { continue // Состав уже заявлен — не напоминаем
     }

    const teamName = coach.teamSeason.team.name
    const dateStr = match.scheduledAt
      ? new Date(match.scheduledAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
      })
      : ''

    const text = [
      `⚠️ <b>Напоминание:</b> заявите состав!`,
      '',
      `Матч: <b>${match.homeTeam.team.name}</b> — <b>${match.awayTeam.team.name}</b>`,
      dateStr ? `📅 ${dateStr}` : '',
      '',
      `Команда <b>${teamName}</b> ещё не заявила состав.`,
      'Дедлайн — за 6 часов до матча.',
    ]
      .filter(Boolean)
      .join('\n')

    const keyboard = new InlineKeyboard().url('📋 Заявить состав', `${SITE_URL}/coach`)

    try {
      await bot.api.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
      results.push({ success: true })
    } catch (err) {
      results.push({
        success: false,
        error: `${coach.player.name}: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return results
}
