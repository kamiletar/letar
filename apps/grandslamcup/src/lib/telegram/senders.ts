/**
 * Отправка сообщений в Telegram-каналы городов.
 * Все сообщения включают InlineKeyboard кнопки вместо текстовых ссылок.
 */

import { InlineKeyboard, InputFile } from 'grammy'

import { prisma } from '@/lib/db'

import type { SendResult } from './bot'
import { getChatIdForMatch, getTelegramBot } from './bot'
import { matchUrl as buildMatchUrl, scheduleUrl as buildScheduleUrl, SITE_URL } from './helpers'
import { getMatchCity, loadMatchData } from './match-data'
import { formatMatchAnnouncement } from './messages/announcement'
import { formatHalfTimeResult } from './messages/half-time'
import { formatTodayReminders } from './messages/reminders'
import { formatMatchResult } from './messages/result'
import { formatWeeklySchedule } from './messages/schedule'
import { formatTourSummary } from './messages/tour-summary'
import { generateAnnouncementPoster, generateResultPoster, generateSchedulePoster } from './poster'
import { trackTelegramMessage } from './track-message'

const SEND_OPTIONS = { parse_mode: 'HTML' as const, link_preview_options: { is_disabled: true } }

/** Вспомогательная: получить citySlug и matchUrl для кнопок */
async function getMatchContext(matchId: string) {
  const match = await loadMatchData(matchId)
  if (!match) { return null }
  const city = getMatchCity(match)
  const citySlug = city?.slug ?? ''
  return {
    matchUrl: buildMatchUrl(matchId, citySlug),
    venueUrl: match.venue?.latitude && match.venue?.longitude
      ? `https://yandex.ru/maps/?pt=${match.venue.longitude},${match.venue.latitude}&z=17&l=map`
      : null,
    citySlug,
  }
}

/** Отправить анонс матча в канал города */
export async function sendMatchAnnouncement(matchId: string): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  const chatId = await getChatIdForMatch(matchId)
  if (!chatId) {
    return { success: false, error: 'У города не настроен Telegram-канал' }
  }

  const text = await formatMatchAnnouncement(matchId)
  if (!text) {
    return { success: false, error: 'Не удалось сформировать анонс' }
  }

  const ctx = await getMatchContext(matchId)
  const keyboard = new InlineKeyboard().url('📋 Подробнее', ctx?.matchUrl ?? `${SITE_URL}`)
  if (ctx?.venueUrl) {
    keyboard.url('📍 Где играют', ctx.venueUrl)
  }

  try {
    const poster = await generateAnnouncementPoster(matchId).catch(() => null)
    if (poster) {
      const msg = await bot.api.sendPhoto(chatId, new InputFile(poster, 'announcement.png'), {
        caption: text,
        ...SEND_OPTIONS,
        reply_markup: keyboard,
      })
      trackTelegramMessage({ messageId: msg.message_id, chatId: String(chatId), type: 'announcement', matchId })
    } else {
      const msg = await bot.api.sendMessage(chatId, text, { ...SEND_OPTIONS, reply_markup: keyboard })
      trackTelegramMessage({ messageId: msg.message_id, chatId: String(chatId), type: 'announcement', matchId })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Отправить промежуточный итог тайма */
export async function sendHalfTimeResult(matchId: string, half: number): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  const chatId = await getChatIdForMatch(matchId)
  if (!chatId) {
    return { success: false, error: 'У города не настроен Telegram-канал' }
  }

  const text = await formatHalfTimeResult(matchId, half)
  if (!text) {
    return { success: false, error: 'Не удалось сформировать итог тайма' }
  }

  const ctx = await getMatchContext(matchId)
  const keyboard = new InlineKeyboard().url('📋 Подробнее', ctx?.matchUrl ?? `${SITE_URL}`)

  try {
    await bot.api.sendMessage(chatId, text, { ...SEND_OPTIONS, reply_markup: keyboard })
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Отправить финальный результат */
export async function sendMatchResult(matchId: string): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  const chatId = await getChatIdForMatch(matchId)
  if (!chatId) {
    return { success: false, error: 'У города не настроен Telegram-канал' }
  }

  const text = await formatMatchResult(matchId)
  if (!text) {
    return { success: false, error: 'Не удалось сформировать результат' }
  }

  const ctx = await getMatchContext(matchId)
  const keyboard = new InlineKeyboard().url('📊 Полный протокол', ctx?.matchUrl ?? `${SITE_URL}`)

  try {
    const poster = await generateResultPoster(matchId).catch(() => null)
    if (poster) {
      const msg = await bot.api.sendPhoto(chatId, new InputFile(poster, 'result.png'), {
        caption: text,
        ...SEND_OPTIONS,
        reply_markup: keyboard,
      })
      trackTelegramMessage({ messageId: msg.message_id, chatId: String(chatId), type: 'result', matchId })
    } else {
      const msg = await bot.api.sendMessage(chatId, text, { ...SEND_OPTIONS, reply_markup: keyboard })
      trackTelegramMessage({ messageId: msg.message_id, chatId: String(chatId), type: 'result', matchId })
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Отправить еженедельное расписание для всех городов */
export async function sendWeeklyScheduleAll(): Promise<SendResult[]> {
  const bot = await getTelegramBot()
  if (!bot) {
    return [{ success: false, error: 'Telegram-бот не настроен или выключен' }]
  }

  const cities = await prisma.city.findMany({ where: { telegramChatId: { not: null } } })
  const results: SendResult[] = []

  for (const city of cities) {
    const text = await formatWeeklySchedule(city.id)
    if (!text) {
      continue
    }

    const keyboard = new InlineKeyboard().url('📅 Все матчи', buildScheduleUrl(city.slug))

    try {
      // Пытаемся отправить с постером расписания
      const poster = await generateSchedulePoster(city.id).catch(() => null)
      if (poster) {
        await bot.api.sendPhoto(city.telegramChatId!, new InputFile(poster, 'schedule.png'), {
          caption: text,
          ...SEND_OPTIONS,
          reply_markup: keyboard,
        })
      } else {
        await bot.api.sendMessage(city.telegramChatId!, text, { ...SEND_OPTIONS, reply_markup: keyboard })
      }
      results.push({ success: true })
    } catch (err) {
      results.push({
        success: false,
        error: `${city.name}: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return results
}

/** Отправить утренние напоминания для всех городов */
export async function sendTodayRemindersAll(): Promise<SendResult[]> {
  const bot = await getTelegramBot()
  if (!bot) {
    return [{ success: false, error: 'Telegram-бот не настроен или выключен' }]
  }

  const cities = await prisma.city.findMany({ where: { telegramChatId: { not: null } } })
  const results: SendResult[] = []

  for (const city of cities) {
    const messages = await formatTodayReminders(city.id)
    for (const text of messages) {
      const keyboard = new InlineKeyboard().url('📅 Расписание', buildScheduleUrl(city.slug))
      try {
        await bot.api.sendMessage(city.telegramChatId!, text, { ...SEND_OPTIONS, reply_markup: keyboard })
        results.push({ success: true })
      } catch (err) {
        results.push({
          success: false,
          error: `${city.name}: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }
  }

  return results
}

/** Отправить итоги тура в канал города */
export async function sendTourSummary(tourId: string): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  const result = await formatTourSummary(tourId)
  if (!result) {
    return { success: false, error: 'Не удалось сформировать итоги тура' }
  }

  // Получаем chatId города через tour → round → season → city
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      round: { include: { season: { include: { city: { select: { telegramChatId: true, slug: true } } } } } },
    },
  })
  const chatId = tour?.round?.season?.city?.telegramChatId
  if (!chatId) {
    return { success: false, error: 'У города не настроен Telegram-канал' }
  }

  const keyboard = new InlineKeyboard().url('📊 Таблица', buildScheduleUrl(result.citySlug))

  try {
    await bot.api.sendMessage(chatId, result.text, { ...SEND_OPTIONS, reply_markup: keyboard })
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Отправить ссылку на Mini App голосования (при старте матча) */
export async function sendVotingLink(matchId: string): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  const chatId = await getChatIdForMatch(matchId)
  if (!chatId) {
    return { success: false, error: 'У города не настроен Telegram-канал' }
  }

  const ctx = await getMatchContext(matchId)
  const audienceUrl = `${SITE_URL}/match/${matchId}/audience`

  // WebApp кнопка открывает страницу голосования прямо в Telegram
  const keyboard = new InlineKeyboard()
    .webApp('🗳 Голосовать', audienceUrl)
    .row()
    .url('📋 На сайте', ctx?.matchUrl ?? `${SITE_URL}`)

  try {
    await bot.api.sendMessage(chatId, '🔴 <b>Матч начался!</b>\n\nГолосуйте за поэтов прямо в Telegram:', {
      ...SEND_OPTIONS,
      reply_markup: keyboard,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Тестовое сообщение в указанный канал */
export async function sendTestMessage(chatId: string): Promise<SendResult> {
  const bot = await getTelegramBot()
  if (!bot) {
    return { success: false, error: 'Telegram-бот не настроен или выключен' }
  }

  try {
    await bot.api.sendMessage(chatId, '✅ Тестовое сообщение от КБС-бота. Интеграция работает!')
    return { success: true }
  } catch (err) {
    return { success: false, error: `Ошибка Telegram: ${err instanceof Error ? err.message : String(err)}` }
  }
}
