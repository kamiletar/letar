/**
 * Оркестратор уведомлений - отправляет через все каналы
 *
 * Объединяет:
 * - Push-уведомления (Web Push API)
 * - Email-уведомления (SMTP)
 * - Telegram-уведомления (Bot API)
 *
 * Учитывает настройки пользователя для каждого канала
 */

import { type EmailProvider, sendEmailToUser } from '@/lib/email'
import type { InlineKeyboard } from '@/lib/telegram'
import { notifyUserViaTelegram } from '@/lib/telegram'
import type { NotificationType, UserRole } from '@letar/driving-school-db/prisma'
import {
  createNotification,
  type NotificationSettingsData,
  type NotificationsRepository,
  type PushProvider,
  sendPushNotification,
  shouldSendNotification,
} from './notifications-service'

// === Типы ===

// Тип функции отправки Telegram-сообщения
type SendMessageFn = (
  chatId: bigint,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboard }; parse_mode?: string }
) => Promise<{ message_id: number }>

export interface TelegramApi {
  sendMessage: SendMessageFn
}

// Общий тип пользователя для оркестратора
interface UserData {
  id: string
  name: string | null
  email: string | null
  role: UserRole
}

// Общий тип связи Telegram
interface TelegramLinkData {
  id: string
  userId: string
  telegramId: bigint
  username: string | null
  firstName: string | null
  linkedAt: Date
}

/**
 * Репозиторий оркестратора объединяет методы всех подсистем
 */
export interface OrchestratorRepository extends NotificationsRepository {
  // Методы для email и telegram (общий getUserById)
  getUserById: (id: string) => Promise<UserData | null>
  // Методы для telegram
  getTelegramLinkByUserId: (userId: string) => Promise<TelegramLinkData | null>
}

export interface OrchestratorProviders {
  push?: PushProvider
  email?: EmailProvider
  telegram?: TelegramApi
}

export interface NotifyUserParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  repo: OrchestratorRepository
  providers: OrchestratorProviders
  appUrl?: string
}

export interface NotifyUserResult {
  success: boolean
  notificationId?: string
  channels: {
    push: { sent: boolean; error?: string }
    email: { sent: boolean; error?: string; skipped?: boolean; reason?: string }
    telegram: { sent: boolean; error?: string }
  }
}

// === Дефолтные настройки ===

const DEFAULT_SETTINGS: Omit<NotificationSettingsData, 'id' | 'userId' | 'updatedAt'> = {
  pushEnabled: true,
  emailEnabled: true,
  telegramEnabled: false,
  reminderHours: 24,
  lessonReminders: true,
  lessonChanges: true,
  penaltyAlerts: true,
  marketingEmails: false,
}

// === Функции ===

/**
 * Отправляет уведомление пользователю через все доступные каналы
 *
 * Порядок:
 * 1. Создаёт уведомление в БД
 * 2. Отправляет push (если включён)
 * 3. Отправляет email (если включён)
 * 4. Отправляет Telegram (если привязан и включён)
 */
export async function notifyUser(params: NotifyUserParams): Promise<NotifyUserResult> {
  const { userId, type, title, body, data, repo, providers, appUrl } = params

  const result: NotifyUserResult = {
    success: false,
    channels: {
      push: { sent: false },
      email: { sent: false },
      telegram: { sent: false },
    },
  }

  // Получаем настройки пользователя
  const userSettings = await repo.getNotificationSettings(userId)
  const settings = userSettings ?? DEFAULT_SETTINGS

  // Проверяем, нужно ли отправлять уведомление
  if (!shouldSendNotification(type, settings)) {
    result.success = true
    result.channels.push.error = 'NOTIFICATION_FILTERED'
    result.channels.email.skipped = true
    result.channels.email.reason = 'NOTIFICATION_FILTERED'
    result.channels.telegram.error = 'NOTIFICATION_FILTERED'
    return result
  }

  // 1. Создаём уведомление в БД
  try {
    const createResult = await createNotification({
      userId,
      type,
      title,
      body,
      data,
      repo,
    })

    if (createResult.success) {
      result.notificationId = createResult.notificationId
    }
  } catch (error) {
    console.error('[Orchestrator] Failed to create notification:', error)
  }

  // 2. Отправляем push
  if (providers.push && settings.pushEnabled) {
    try {
      const pushResult = await sendPushNotification({
        userId,
        title,
        body,
        data,
        repo,
        pushProvider: providers.push,
      })

      if (pushResult.success) {
        result.channels.push.sent = pushResult.sentCount > 0
      } else {
        result.channels.push.error = pushResult.error
      }
    } catch (error) {
      result.channels.push.error = error instanceof Error ? error.message : 'PUSH_ERROR'
    }
  } else if (!settings.pushEnabled) {
    result.channels.push.error = 'PUSH_DISABLED'
  }

  // 3. Отправляем email
  if (providers.email && settings.emailEnabled) {
    try {
      const emailResult = await sendEmailToUser({
        userId,
        type,
        title,
        body,
        data,
        repo,
        emailProvider: providers.email,
        appUrl,
      })

      if (emailResult.success) {
        result.channels.email.sent = emailResult.sent
        result.channels.email.skipped = emailResult.skipped
        result.channels.email.reason = emailResult.reason
      } else {
        result.channels.email.error = emailResult.error
      }
    } catch (error) {
      result.channels.email.error = error instanceof Error ? error.message : 'EMAIL_ERROR'
    }
  } else if (!settings.emailEnabled) {
    result.channels.email.skipped = true
    result.channels.email.reason = 'EMAIL_DISABLED'
  }

  // 4. Отправляем Telegram
  if (providers.telegram && settings.telegramEnabled) {
    try {
      // notifyUserViaTelegram использует TelegramNotifyRepository,
      // который содержит только getTelegramLinkByUserId — OrchestratorRepository совместим
      const telegramResult = await notifyUserViaTelegram({
        userId,
        text: `${title}\n\n${body}`,
        repo,
        sendMessage: providers.telegram.sendMessage,
      })

      if (telegramResult.success) {
        result.channels.telegram.sent = true
      } else {
        result.channels.telegram.error = telegramResult.error
      }
    } catch (error) {
      result.channels.telegram.error = error instanceof Error ? error.message : 'TELEGRAM_ERROR'
    }
  } else if (!settings.telegramEnabled) {
    result.channels.telegram.error = 'TELEGRAM_DISABLED'
  }

  // Успех, если хотя бы один канал сработал
  result.success =
    result.channels.push.sent || result.channels.email.sent || result.channels.telegram.sent || !!result.notificationId

  return result
}
