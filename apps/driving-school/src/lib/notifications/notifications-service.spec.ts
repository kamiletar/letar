/**
 * Тесты для бизнес-логики уведомлений
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - Создание уведомлений в БД
 * - Отправка push-уведомлений через Web Push API
 * - Управление подписками на push
 * - Настройки уведомлений пользователя
 * - Фильтрация уведомлений по настройкам
 */

import type { NotificationType } from '@letar/driving-school-db/prisma'
import {
  createNotification,
  type CreateNotificationResult,
  type GetNotificationsResult,
  type GetSettingsResult,
  getUserNotifications,
  getUserNotificationSettings,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type MarkReadResult,
  type NotificationData,
  type NotificationSettingsData,
  type NotificationsRepository,
  type PushSubscriptionData,
  type SendNotificationResult,
  sendNotificationToUser,
  sendPushNotification,
  type SendPushResult,
  shouldSendNotification,
  type SubscribePushResult,
  subscribeToPush,
  unsubscribeFromPush,
  type UnsubscribePushResult,
  updateNotificationSettings,
} from './notifications-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<NotificationsRepository> = {}): NotificationsRepository => ({
  createNotification: vi.fn().mockResolvedValue({ id: 'notification-1' }),
  getNotificationById: vi.fn().mockResolvedValue(null),
  updateNotification: vi.fn().mockResolvedValue(undefined),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  markAllAsRead: vi.fn().mockResolvedValue({ count: 0 }),
  getPushSubscriptionsByUser: vi.fn().mockResolvedValue([]),
  createPushSubscription: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  getPushSubscriptionByEndpoint: vi.fn().mockResolvedValue(null),
  getNotificationSettings: vi.fn().mockResolvedValue(null),
  upsertNotificationSettings: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// === Тестовые данные ===

const mockNotification: NotificationData = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'LESSON_CREATED' as NotificationType,
  title: 'Новое занятие',
  body: 'Вам назначено занятие на 15 января в 14:00',
  data: { lessonId: 'lesson-1' },
  isRead: false,
  readAt: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
}

const mockPushSubscription: PushSubscriptionData = {
  id: 'subscription-1',
  userId: 'user-1',
  endpoint: 'https://fcm.googleapis.com/fcm/send/xxx',
  p256dh: 'public-key-xxx',
  auth: 'auth-secret-xxx',
  userAgent: 'Mozilla/5.0',
  createdAt: new Date('2025-01-01T00:00:00Z'),
}

const mockSettings: NotificationSettingsData = {
  id: 'settings-1',
  userId: 'user-1',
  pushEnabled: true,
  emailEnabled: true,
  telegramEnabled: false,
  reminderHours: 24,
  lessonReminders: true,
  lessonChanges: true,
  penaltyAlerts: true,
  marketingEmails: false,
  updatedAt: new Date('2025-01-01T00:00:00Z'),
}

// === Тесты ===

describe('Notifications Service', () => {
  describe('createNotification', () => {
    it('должен создавать уведомление в БД', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-1' })
      const repo = createMockRepository({
        createNotification: createMock,
      })

      const result = await createNotification({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        data: { lessonId: 'lesson-1' },
        repo,
      })

      expect(result.success).toBe(true)
      expect((result as CreateNotificationResult & { success: true }).notificationId).toBe('notification-1')
      expect(createMock).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        data: { lessonId: 'lesson-1' },
      })
    })

    it('должен создавать уведомление без data', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-2' })
      const repo = createMockRepository({
        createNotification: createMock,
      })

      const result = await createNotification({
        userId: 'user-1',
        type: 'INSTRUCTOR_RETURNED',
        title: 'Инструктор вернулся',
        body: 'Инструктор Иван Иванов вернулся и готов к занятиям',
        repo,
      })

      expect(result.success).toBe(true)
      expect(createMock).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'INSTRUCTOR_RETURNED',
        title: 'Инструктор вернулся',
        body: 'Инструктор Иван Иванов вернулся и готов к занятиям',
        data: undefined,
      })
    })
  })

  describe('sendPushNotification', () => {
    it('должен отправлять push на все подписки пользователя', async () => {
      const sendMock = vi.fn().mockResolvedValue({ success: true })
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        getPushSubscriptionsByUser: vi
          .fn()
          .mockResolvedValue([
            mockPushSubscription,
            { ...mockPushSubscription, id: 'subscription-2', endpoint: 'https://example.com/push2' },
          ]),
      })

      const result = await sendPushNotification({
        userId: 'user-1',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        data: { lessonId: 'lesson-1' },
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendPushResult & { success: true }).sentCount).toBe(2)
      expect(sendMock).toHaveBeenCalledTimes(2)
    })

    it('должен возвращать 0 если нет подписок', async () => {
      const sendMock = vi.fn()
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([]),
      })

      const result = await sendPushNotification({
        userId: 'user-1',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendPushResult & { success: true }).sentCount).toBe(0)
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('должен продолжать отправку при ошибке одной подписки', async () => {
      const sendMock = vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'expired' })
        .mockResolvedValueOnce({ success: true })
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        getPushSubscriptionsByUser: vi
          .fn()
          .mockResolvedValue([
            mockPushSubscription,
            { ...mockPushSubscription, id: 'subscription-2', endpoint: 'https://example.com/push2' },
          ]),
      })

      const result = await sendPushNotification({
        userId: 'user-1',
        title: 'Тест',
        body: 'Тестовое сообщение',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendPushResult & { success: true }).sentCount).toBe(1)
      expect((result as SendPushResult & { success: true }).failedCount).toBe(1)
    })
  })

  describe('sendNotificationToUser', () => {
    it('должен создавать уведомление и отправлять push если включён', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-1' })
      const sendMock = vi.fn().mockResolvedValue({ success: true })
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        createNotification: createMock,
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const result = await sendNotificationToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendNotificationResult & { success: true }).notificationId).toBe('notification-1')
      expect((result as SendNotificationResult & { success: true }).pushSent).toBe(true)
      expect(createMock).toHaveBeenCalled()
      expect(sendMock).toHaveBeenCalled()
    })

    it('не должен отправлять push если pushEnabled = false', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-1' })
      const sendMock = vi.fn()
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        createNotification: createMock,
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, pushEnabled: false }),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const result = await sendNotificationToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendNotificationResult & { success: true }).pushSent).toBe(false)
      expect(createMock).toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('не должен отправлять напоминание если lessonReminders = false', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-1' })
      const sendMock = vi.fn()
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        createNotification: createMock,
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, lessonReminders: false }),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const result = await sendNotificationToUser({
        userId: 'user-1',
        type: 'LESSON_REMINDER',
        title: 'Напоминание',
        body: 'Занятие через 24 часа',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendNotificationResult & { success: true }).skipped).toBe(true)
      expect(createMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('должен использовать дефолтные настройки если нет настроек пользователя', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'notification-1' })
      const sendMock = vi.fn().mockResolvedValue({ success: true })
      const pushProvider = { sendNotification: sendMock }
      const repo = createMockRepository({
        createNotification: createMock,
        getNotificationSettings: vi.fn().mockResolvedValue(null),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const result = await sendNotificationToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        pushProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendNotificationResult & { success: true }).pushSent).toBe(true)
    })
  })

  describe('markNotificationAsRead', () => {
    it('должен помечать уведомление как прочитанное', async () => {
      const updateMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getNotificationById: vi.fn().mockResolvedValue(mockNotification),
        updateNotification: updateMock,
      })

      const result = await markNotificationAsRead('notification-1', repo)

      expect(result.success).toBe(true)
      expect(updateMock).toHaveBeenCalledWith('notification-1', {
        isRead: true,
        readAt: expect.any(Date),
      })
    })

    it('должен возвращать ошибку если уведомление не найдено', async () => {
      const repo = createMockRepository({
        getNotificationById: vi.fn().mockResolvedValue(null),
      })

      const result = await markNotificationAsRead('unknown-notification', repo)

      expect(result.success).toBe(false)
      expect((result as MarkReadResult & { success: false }).error).toBe('NOTIFICATION_NOT_FOUND')
    })

    it('должен возвращать успех если уведомление уже прочитано', async () => {
      const updateMock = vi.fn()
      const repo = createMockRepository({
        getNotificationById: vi.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
        updateNotification: updateMock,
      })

      const result = await markNotificationAsRead('notification-1', repo)

      expect(result.success).toBe(true)
      expect(updateMock).not.toHaveBeenCalled()
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('должен помечать все уведомления пользователя как прочитанные', async () => {
      const markAllMock = vi.fn().mockResolvedValue({ count: 5 })
      const repo = createMockRepository({
        markAllAsRead: markAllMock,
      })

      const result = await markAllNotificationsAsRead('user-1', repo)

      expect(result.success).toBe(true)
      expect((result as MarkReadResult & { success: true }).markedCount).toBe(5)
      expect(markAllMock).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getUserNotifications', () => {
    it('должен возвращать уведомления пользователя', async () => {
      const repo = createMockRepository({
        getNotificationsByUser: vi
          .fn()
          .mockResolvedValue([
            mockNotification,
            { ...mockNotification, id: 'notification-2', type: 'LESSON_CONFIRMED' },
          ]),
      })

      const result = await getUserNotifications('user-1', { limit: 20 }, repo)

      expect(result.success).toBe(true)
      expect((result as GetNotificationsResult & { success: true }).notifications).toHaveLength(2)
    })

    it('должен фильтровать только непрочитанные', async () => {
      const getMock = vi.fn().mockResolvedValue([mockNotification])
      const repo = createMockRepository({
        getNotificationsByUser: getMock,
      })

      await getUserNotifications('user-1', { unreadOnly: true }, repo)

      expect(getMock).toHaveBeenCalledWith('user-1', { limit: 50, unreadOnly: true })
    })
  })

  describe('subscribeToPush', () => {
    it('должен создавать новую подписку', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 'subscription-1' })
      const repo = createMockRepository({
        getPushSubscriptionByEndpoint: vi.fn().mockResolvedValue(null),
        createPushSubscription: createMock,
      })

      const result = await subscribeToPush({
        userId: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/new',
        p256dh: 'new-key',
        auth: 'new-auth',
        userAgent: 'Chrome',
        repo,
      })

      expect(result.success).toBe(true)
      expect((result as SubscribePushResult & { success: true }).subscriptionId).toBe('subscription-1')
    })

    it('должен возвращать существующую подписку если endpoint уже есть', async () => {
      const repo = createMockRepository({
        getPushSubscriptionByEndpoint: vi.fn().mockResolvedValue(mockPushSubscription),
      })

      const result = await subscribeToPush({
        userId: 'user-1',
        endpoint: mockPushSubscription.endpoint,
        p256dh: 'key',
        auth: 'auth',
        repo,
      })

      expect(result.success).toBe(true)
      expect((result as SubscribePushResult & { success: true }).subscriptionId).toBe('subscription-1')
      expect((result as SubscribePushResult & { success: true }).alreadyExists).toBe(true)
    })
  })

  describe('unsubscribeFromPush', () => {
    it('должен удалять подписку по endpoint', async () => {
      const deleteMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        getPushSubscriptionByEndpoint: vi.fn().mockResolvedValue(mockPushSubscription),
        deletePushSubscription: deleteMock,
      })

      const result = await unsubscribeFromPush(mockPushSubscription.endpoint, repo)

      expect(result.success).toBe(true)
      expect(deleteMock).toHaveBeenCalledWith('subscription-1')
    })

    it('должен возвращать ошибку если подписка не найдена', async () => {
      const repo = createMockRepository({
        getPushSubscriptionByEndpoint: vi.fn().mockResolvedValue(null),
      })

      const result = await unsubscribeFromPush('unknown-endpoint', repo)

      expect(result.success).toBe(false)
      expect((result as UnsubscribePushResult & { success: false }).error).toBe('SUBSCRIPTION_NOT_FOUND')
    })
  })

  describe('getUserNotificationSettings', () => {
    it('должен возвращать настройки пользователя', async () => {
      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
      })

      const result = await getUserNotificationSettings('user-1', repo)

      expect(result.success).toBe(true)
      expect((result as GetSettingsResult & { success: true }).settings).toEqual(mockSettings)
    })

    it('должен возвращать дефолтные настройки если нет записи', async () => {
      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(null),
      })

      const result = await getUserNotificationSettings('user-1', repo)

      expect(result.success).toBe(true)
      const settings = (result as GetSettingsResult & { success: true }).settings
      expect(settings.pushEnabled).toBe(true)
      expect(settings.emailEnabled).toBe(true)
      expect(settings.telegramEnabled).toBe(false)
      expect(settings.lessonReminders).toBe(true)
    })
  })

  describe('updateNotificationSettings', () => {
    it('должен обновлять настройки пользователя', async () => {
      const upsertMock = vi.fn().mockResolvedValue(undefined)
      const repo = createMockRepository({
        upsertNotificationSettings: upsertMock,
      })

      const result = await updateNotificationSettings(
        'user-1',
        {
          pushEnabled: false,
          lessonReminders: false,
        },
        repo
      )

      expect(result.success).toBe(true)
      expect(upsertMock).toHaveBeenCalledWith('user-1', {
        pushEnabled: false,
        lessonReminders: false,
      })
    })
  })

  describe('shouldSendNotification', () => {
    it('должен разрешать отправку LESSON_CREATED если lessonChanges = true', () => {
      const result = shouldSendNotification('LESSON_CREATED', mockSettings)
      expect(result).toBe(true)
    })

    it('должен запрещать отправку LESSON_REMINDER если lessonReminders = false', () => {
      const result = shouldSendNotification('LESSON_REMINDER', { ...mockSettings, lessonReminders: false })
      expect(result).toBe(false)
    })

    it('должен запрещать отправку PENALTY_CHARGED если penaltyAlerts = false', () => {
      const result = shouldSendNotification('PENALTY_CHARGED', { ...mockSettings, penaltyAlerts: false })
      expect(result).toBe(false)
    })

    it('должен разрешать отправку INVITATION_RECEIVED всегда', () => {
      const result = shouldSendNotification('INVITATION_RECEIVED', {
        ...mockSettings,
        lessonReminders: false,
        lessonChanges: false,
        penaltyAlerts: false,
      })
      expect(result).toBe(true)
    })

    it('должен разрешать LESSON_CONFIRMED если lessonChanges = true', () => {
      const result = shouldSendNotification('LESSON_CONFIRMED', mockSettings)
      expect(result).toBe(true)
    })

    it('должен разрешать LESSON_CANCELLED если lessonChanges = true', () => {
      const result = shouldSendNotification('LESSON_CANCELLED', mockSettings)
      expect(result).toBe(true)
    })

    it('должен запрещать LESSON_NEEDS_RESCHEDULE если lessonChanges = false', () => {
      const result = shouldSendNotification('LESSON_NEEDS_RESCHEDULE', { ...mockSettings, lessonChanges: false })
      expect(result).toBe(false)
    })
  })
})
