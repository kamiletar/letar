/**
 * Сервис для управления уведомлениями
 *
 * Бизнес-логика:
 * - Создание уведомлений в БД
 * - Отправка push-уведомлений через Web Push API
 * - Управление подписками на push
 * - Настройки уведомлений пользователя
 * - Фильтрация уведомлений по настройкам
 */

import type { NotificationType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface NotificationData {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

export interface PushSubscriptionData {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: Date
}

export interface NotificationSettingsData {
  id: string
  userId: string
  pushEnabled: boolean
  emailEnabled: boolean
  telegramEnabled: boolean
  reminderHours: number
  lessonReminders: boolean
  lessonChanges: boolean
  penaltyAlerts: boolean
  marketingEmails: boolean
  updatedAt: Date
}

export interface PushProvider {
  sendNotification: (subscription: PushSubscriptionData, payload: PushPayload) => Promise<{ success: boolean }>
}

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface NotificationsRepository {
  createNotification: (data: {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: Record<string, unknown>
  }) => Promise<{ id: string }>
  getNotificationById: (id: string) => Promise<NotificationData | null>
  updateNotification: (id: string, data: { isRead?: boolean; readAt?: Date }) => Promise<void>
  getNotificationsByUser: (
    userId: string,
    options: { limit?: number; unreadOnly?: boolean }
  ) => Promise<NotificationData[]>
  markAllAsRead: (userId: string) => Promise<{ count: number }>
  getPushSubscriptionsByUser: (userId: string) => Promise<PushSubscriptionData[]>
  createPushSubscription: (data: {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string
  }) => Promise<{ id: string }>
  deletePushSubscription: (id: string) => Promise<void>
  getPushSubscriptionByEndpoint: (endpoint: string) => Promise<PushSubscriptionData | null>
  getNotificationSettings: (userId: string) => Promise<NotificationSettingsData | null>
  upsertNotificationSettings: (userId: string, data: Partial<NotificationSettingsData>) => Promise<void>
}

// === Результаты ===

export type CreateNotificationResult = { success: true; notificationId: string } | { success: false; error: string }

export type SendPushResult =
  | { success: true; sentCount: number; failedCount: number }
  | { success: false; error: string }

export type SendNotificationResult =
  | { success: true; notificationId: string; pushSent: boolean; skipped?: boolean }
  | { success: false; error: string }

export type MarkReadResult =
  | { success: true; markedCount?: number }
  | { success: false; error: 'NOTIFICATION_NOT_FOUND' }

export type GetNotificationsResult =
  | { success: true; notifications: NotificationData[] }
  | { success: false; error: string }

export type SubscribePushResult =
  | { success: true; subscriptionId: string; alreadyExists?: boolean }
  | { success: false; error: string }

export type UnsubscribePushResult = { success: true } | { success: false; error: 'SUBSCRIPTION_NOT_FOUND' }

export type GetSettingsResult = { success: true; settings: NotificationSettingsData }

export type UpdateSettingsResult = { success: true } | { success: false; error: string }

// === Константы ===

// Дефолтные настройки уведомлений
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

// Типы уведомлений, которые всегда отправляются (критичные)
const ALWAYS_SEND_TYPES: NotificationType[] = [
  'INVITATION_RECEIVED',
  'STUDENT_TRANSFER',
  'SCHOOL_INVITE',
  'SURVEY_SENT',
]

// Типы уведомлений, связанные с изменениями занятий
const LESSON_CHANGE_TYPES: NotificationType[] = [
  'LESSON_CREATED',
  'LESSON_CONFIRMED',
  'LESSON_CANCELLED',
  'LESSON_NEEDS_RESCHEDULE',
]

// === Функции ===

/**
 * Проверяет, нужно ли отправлять уведомление данного типа на основе настроек
 */
export function shouldSendNotification(
  type: NotificationType,
  settings: Omit<NotificationSettingsData, 'id' | 'userId' | 'updatedAt'>
): boolean {
  // Критичные уведомления отправляются всегда
  if (ALWAYS_SEND_TYPES.includes(type)) {
    return true
  }

  // Уведомления инструктора о возвращении всегда отправляются
  if (type === 'INSTRUCTOR_RETURNED') {
    return true
  }

  // Напоминания о занятиях
  if (type === 'LESSON_REMINDER') {
    return settings.lessonReminders
  }

  // Изменения занятий
  if (LESSON_CHANGE_TYPES.includes(type)) {
    return settings.lessonChanges
  }

  // Штрафы
  if (type === 'PENALTY_CHARGED') {
    return settings.penaltyAlerts
  }

  // По умолчанию отправляем
  return true
}

/**
 * Создаёт уведомление в БД
 */
export async function createNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  repo: NotificationsRepository
}): Promise<CreateNotificationResult> {
  const { userId, type, title, body, data, repo } = params

  const notification = await repo.createNotification({
    userId,
    type,
    title,
    body,
    data,
  })

  return {
    success: true,
    notificationId: notification.id,
  }
}

/**
 * Отправляет push-уведомление на все подписки пользователя
 */
export async function sendPushNotification(params: {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  repo: NotificationsRepository
  pushProvider: PushProvider
}): Promise<SendPushResult> {
  const { userId, title, body, data, repo, pushProvider } = params

  // Получаем все подписки пользователя
  const subscriptions = await repo.getPushSubscriptionsByUser(userId)

  if (subscriptions.length === 0) {
    return { success: true, sentCount: 0, failedCount: 0 }
  }

  const payload: PushPayload = { title, body, data }

  let sentCount = 0
  let failedCount = 0

  // Отправляем на каждую подписку
  for (const subscription of subscriptions) {
    const result = await pushProvider.sendNotification(subscription, payload)
    if (result.success) {
      sentCount++
    } else {
      failedCount++
    }
  }

  return { success: true, sentCount, failedCount }
}

/**
 * Создаёт уведомление и отправляет push с учётом настроек пользователя
 */
export async function sendNotificationToUser(params: {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  repo: NotificationsRepository
  pushProvider: PushProvider
}): Promise<SendNotificationResult> {
  const { userId, type, title, body, data, repo, pushProvider } = params

  // Получаем настройки пользователя
  const userSettings = await repo.getNotificationSettings(userId)
  const settings = userSettings ?? DEFAULT_SETTINGS

  // Проверяем, нужно ли отправлять уведомление
  if (!shouldSendNotification(type, settings)) {
    return {
      success: true,
      notificationId: '',
      pushSent: false,
      skipped: true,
    }
  }

  // Создаём уведомление в БД
  const createResult = await createNotification({
    userId,
    type,
    title,
    body,
    data,
    repo,
  })

  if (!createResult.success) {
    return { success: false, error: 'FAILED_TO_CREATE_NOTIFICATION' }
  }

  // Отправляем push если включён
  let pushSent = false
  if (settings.pushEnabled) {
    const pushResult = await sendPushNotification({
      userId,
      title,
      body,
      data,
      repo,
      pushProvider,
    })
    pushSent = pushResult.success && pushResult.sentCount > 0
  }

  return {
    success: true,
    notificationId: createResult.notificationId,
    pushSent,
  }
}

/**
 * Помечает уведомление как прочитанное
 */
export async function markNotificationAsRead(
  notificationId: string,
  repo: NotificationsRepository
): Promise<MarkReadResult> {
  const notification = await repo.getNotificationById(notificationId)

  if (!notification) {
    return { success: false, error: 'NOTIFICATION_NOT_FOUND' }
  }

  // Если уже прочитано, ничего не делаем
  if (notification.isRead) {
    return { success: true }
  }

  await repo.updateNotification(notificationId, {
    isRead: true,
    readAt: new Date(),
  })

  return { success: true }
}

/**
 * Помечает все уведомления пользователя как прочитанные
 */
export async function markAllNotificationsAsRead(
  userId: string,
  repo: NotificationsRepository
): Promise<MarkReadResult> {
  const result = await repo.markAllAsRead(userId)
  return { success: true, markedCount: result.count }
}

/**
 * Получает уведомления пользователя
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean },
  repo: NotificationsRepository
): Promise<GetNotificationsResult> {
  const notifications = await repo.getNotificationsByUser(userId, {
    limit: options.limit ?? 50,
    unreadOnly: options.unreadOnly,
  })

  return { success: true, notifications }
}

/**
 * Подписывает пользователя на push-уведомления
 */
export async function subscribeToPush(params: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
  repo: NotificationsRepository
}): Promise<SubscribePushResult> {
  const { userId, endpoint, p256dh, auth, userAgent, repo } = params

  // Проверяем, нет ли уже такой подписки
  const existing = await repo.getPushSubscriptionByEndpoint(endpoint)
  if (existing) {
    return { success: true, subscriptionId: existing.id, alreadyExists: true }
  }

  // Создаём новую подписку
  const subscription = await repo.createPushSubscription({
    userId,
    endpoint,
    p256dh,
    auth,
    userAgent,
  })

  return { success: true, subscriptionId: subscription.id }
}

/**
 * Отписывает пользователя от push-уведомлений
 */
export async function unsubscribeFromPush(
  endpoint: string,
  repo: NotificationsRepository
): Promise<UnsubscribePushResult> {
  const subscription = await repo.getPushSubscriptionByEndpoint(endpoint)

  if (!subscription) {
    return { success: false, error: 'SUBSCRIPTION_NOT_FOUND' }
  }

  await repo.deletePushSubscription(subscription.id)

  return { success: true }
}

/**
 * Получает настройки уведомлений пользователя
 */
export async function getUserNotificationSettings(
  userId: string,
  repo: NotificationsRepository
): Promise<GetSettingsResult> {
  const settings = await repo.getNotificationSettings(userId)

  if (!settings) {
    // Возвращаем дефолтные настройки
    return {
      success: true,
      settings: {
        id: '',
        userId,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      },
    }
  }

  return { success: true, settings }
}

/**
 * Обновляет настройки уведомлений пользователя
 */
export async function updateNotificationSettings(
  userId: string,
  updates: Partial<Omit<NotificationSettingsData, 'id' | 'userId' | 'updatedAt'>>,
  repo: NotificationsRepository
): Promise<UpdateSettingsResult> {
  await repo.upsertNotificationSettings(userId, updates)
  return { success: true }
}
