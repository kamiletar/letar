/**
 * Telegram-бот для публикации в каналы городов.
 *
 * Barrel re-export — потребители продолжают импортировать из '@/lib/telegram'.
 */

// Инфраструктура
export { getTelegramBot } from './bot'
export type { SendResult } from './bot'

// Форматирование сообщений
export { formatMatchAnnouncement } from './messages/announcement'
export { formatHalfTimeResult } from './messages/half-time'
export { formatTodayReminders } from './messages/reminders'
export { formatMatchResult } from './messages/result'
export { formatWeeklySchedule } from './messages/schedule'

// Отправка
export {
  sendHalfTimeResult,
  sendMatchAnnouncement,
  sendMatchResult,
  sendTestMessage,
  sendTodayRemindersAll,
  sendWeeklyScheduleAll,
} from './senders'
