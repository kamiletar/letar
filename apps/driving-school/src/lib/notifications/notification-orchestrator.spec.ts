/**
 * Тесты для оркестратора уведомлений
 */

import { notifyUser, type OrchestratorProviders, type OrchestratorRepository } from './notification-orchestrator'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<OrchestratorRepository> = {}): OrchestratorRepository => ({
  // NotificationsRepository
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
  // Общие методы для email и telegram
  getUserById: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Иван', email: 'ivan@example.com', role: 'STUDENT' }),
  getTelegramLinkByUserId: vi.fn().mockResolvedValue(null),
  ...overrides,
})

// === Мок провайдеров ===

const createMockProviders = (overrides: Partial<OrchestratorProviders> = {}): OrchestratorProviders => ({
  push: {
    sendNotification: vi.fn().mockResolvedValue({ success: true }),
  },
  email: {
    sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  },
  telegram: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
  ...overrides,
})

// === Тестовые данные ===

const mockSettings = {
  id: 'settings-1',
  userId: 'user-1',
  pushEnabled: true,
  emailEnabled: true,
  telegramEnabled: true,
  reminderHours: 24,
  lessonReminders: true,
  lessonChanges: true,
  penaltyAlerts: true,
  marketingEmails: false,
  updatedAt: new Date(),
}

const mockPushSubscription = {
  id: 'subscription-1',
  userId: 'user-1',
  endpoint: 'https://fcm.googleapis.com/fcm/send/xxx',
  p256dh: 'key',
  auth: 'auth',
  userAgent: 'Chrome',
  createdAt: new Date(),
}

const mockTelegramLink = {
  id: 'link-1',
  userId: 'user-1',
  telegramId: BigInt(123456789),
  username: 'ivan',
  firstName: 'Иван',
  linkedAt: new Date(),
}

// === Тесты ===

describe('Notification Orchestrator', () => {
  describe('notifyUser', () => {
    it('должен отправлять через все каналы если все включены', async () => {
      const pushSendMock = vi.fn().mockResolvedValue({ success: true })
      const emailSendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })
      const telegramSendMock = vi.fn().mockResolvedValue({ success: true })

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
        getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
      })

      const providers = createMockProviders({
        push: { sendNotification: pushSendMock },
        email: { sendEmail: emailSendMock },
        telegram: { sendMessage: telegramSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notification-1')
      expect(result.channels.push.sent).toBe(true)
      expect(result.channels.email.sent).toBe(true)
      expect(result.channels.telegram.sent).toBe(true)
    })

    it('должен пропускать push если pushEnabled = false', async () => {
      const pushSendMock = vi.fn()

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, pushEnabled: false }),
      })

      const providers = createMockProviders({
        push: { sendNotification: pushSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.channels.push.sent).toBe(false)
      expect(result.channels.push.error).toBe('PUSH_DISABLED')
      expect(pushSendMock).not.toHaveBeenCalled()
    })

    it('должен пропускать email если emailEnabled = false', async () => {
      const emailSendMock = vi.fn()

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, emailEnabled: false }),
      })

      const providers = createMockProviders({
        email: { sendEmail: emailSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.channels.email.skipped).toBe(true)
      expect(result.channels.email.reason).toBe('EMAIL_DISABLED')
      expect(emailSendMock).not.toHaveBeenCalled()
    })

    it('должен пропускать telegram если telegramEnabled = false', async () => {
      const telegramSendMock = vi.fn()

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, telegramEnabled: false }),
        getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
      })

      const providers = createMockProviders({
        telegram: { sendMessage: telegramSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.channels.telegram.sent).toBe(false)
      expect(result.channels.telegram.error).toBe('TELEGRAM_DISABLED')
      expect(telegramSendMock).not.toHaveBeenCalled()
    })

    it('должен пропускать все каналы если уведомление отфильтровано', async () => {
      const pushSendMock = vi.fn()
      const emailSendMock = vi.fn()
      const telegramSendMock = vi.fn()

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue({
          ...mockSettings,
          lessonReminders: false, // Отключены напоминания
        }),
      })

      const providers = createMockProviders({
        push: { sendNotification: pushSendMock },
        email: { sendEmail: emailSendMock },
        telegram: { sendMessage: telegramSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_REMINDER', // Напоминание - будет отфильтровано
        title: 'Напоминание',
        body: 'Занятие через 24 часа',
        repo,
        providers,
      })

      expect(result.success).toBe(true)
      expect(result.channels.push.error).toBe('NOTIFICATION_FILTERED')
      expect(result.channels.email.skipped).toBe(true)
      expect(result.channels.email.reason).toBe('NOTIFICATION_FILTERED')
      expect(pushSendMock).not.toHaveBeenCalled()
      expect(emailSendMock).not.toHaveBeenCalled()
      expect(telegramSendMock).not.toHaveBeenCalled()
    })

    it('должен использовать дефолтные настройки если нет настроек пользователя', async () => {
      const pushSendMock = vi.fn().mockResolvedValue({ success: true })
      const emailSendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(null),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const providers = createMockProviders({
        push: { sendNotification: pushSendMock },
        email: { sendEmail: emailSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.success).toBe(true)
      expect(result.channels.push.sent).toBe(true)
      expect(result.channels.email.sent).toBe(true)
      // Telegram по умолчанию выключен
      expect(result.channels.telegram.error).toBe('TELEGRAM_DISABLED')
    })

    it('должен быть успешным если хотя бы один канал сработал', async () => {
      const pushSendMock = vi.fn().mockResolvedValue({ success: false, error: 'PUSH_ERROR' })
      const emailSendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })

      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
        getPushSubscriptionsByUser: vi.fn().mockResolvedValue([mockPushSubscription]),
      })

      const providers = createMockProviders({
        push: { sendNotification: pushSendMock },
        email: { sendEmail: emailSendMock },
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers,
      })

      expect(result.success).toBe(true)
      expect(result.channels.push.sent).toBe(false)
      expect(result.channels.email.sent).toBe(true)
    })

    it('должен работать без провайдеров', async () => {
      const repo = createMockRepository({
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
      })

      const result = await notifyUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        providers: {},
      })

      // Успех, потому что создали уведомление в БД
      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notification-1')
    })
  })
})
