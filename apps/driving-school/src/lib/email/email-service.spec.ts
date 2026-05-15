/**
 * Тесты для email-сервиса уведомлений
 *
 * TDD: Сначала пишем тесты, потом реализацию
 *
 * Бизнес-логика:
 * - Отправка email-уведомлений через SMTP
 * - Фильтрация по настройкам пользователя
 * - Форматирование контента для разных типов уведомлений
 * - HTML и text шаблоны писем
 */

import {
  type EmailProvider,
  type EmailRepository,
  formatEmailContent,
  getEmailSubject,
  type NotificationSettingsData,
  type SendEmailResult,
  sendEmailToUser,
  type UserData,
} from './email-service'

// === Мок репозитория ===

const createMockRepository = (overrides: Partial<EmailRepository> = {}): EmailRepository => ({
  getUserById: vi.fn().mockResolvedValue(null),
  getNotificationSettings: vi.fn().mockResolvedValue(null),
  ...overrides,
})

// === Мок email провайдера ===

const createMockEmailProvider = (overrides: Partial<EmailProvider> = {}): EmailProvider => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  ...overrides,
})

// === Тестовые данные ===

const mockUser: UserData = {
  id: 'user-1',
  name: 'Иван Петров',
  email: 'ivan@example.com',
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

describe('Email Service', () => {
  describe('sendEmailToUser', () => {
    it('должен отправлять email если emailEnabled = true', async () => {
      const sendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие на 15 января в 14:00',
        data: { lessonId: 'lesson-1', instructorName: 'Пётр Сидоров' },
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(true)
      expect(sendMock).toHaveBeenCalledWith({
        to: 'ivan@example.com',
        subject: expect.stringContaining('занятие'),
        html: expect.stringContaining('Иван'),
        text: expect.any(String),
      })
    })

    it('не должен отправлять email если emailEnabled = false', async () => {
      const sendMock = vi.fn()
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, emailEnabled: false }),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(false)
      expect((result as SendEmailResult & { success: true }).skipped).toBe(true)
      expect((result as SendEmailResult & { success: true }).reason).toBe('EMAIL_DISABLED')
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('не должен отправлять email если у пользователя нет email', async () => {
      const sendMock = vi.fn()
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue({ ...mockUser, email: null }),
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(false)
      expect((result as SendEmailResult & { success: true }).reason).toBe('NO_EMAIL')
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('должен возвращать ошибку если пользователь не найден', async () => {
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(null),
      })
      const emailProvider = createMockEmailProvider()

      const result = await sendEmailToUser({
        userId: 'unknown-user',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(false)
      expect((result as SendEmailResult & { success: false }).error).toBe('USER_NOT_FOUND')
    })

    it('не должен отправлять напоминание если lessonReminders = false', async () => {
      const sendMock = vi.fn()
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, lessonReminders: false }),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_REMINDER',
        title: 'Напоминание',
        body: 'Занятие через 24 часа',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(false)
      expect((result as SendEmailResult & { success: true }).skipped).toBe(true)
      expect((result as SendEmailResult & { success: true }).reason).toBe('NOTIFICATION_FILTERED')
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('не должен отправлять изменения занятий если lessonChanges = false', async () => {
      const sendMock = vi.fn()
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, lessonChanges: false }),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CANCELLED',
        title: 'Занятие отменено',
        body: 'Ваше занятие было отменено',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).skipped).toBe(true)
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('не должен отправлять штрафы если penaltyAlerts = false', async () => {
      const sendMock = vi.fn()
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue({ ...mockSettings, penaltyAlerts: false }),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'PENALTY_CHARGED',
        title: 'Начислен штраф',
        body: 'Вам начислен штраф за неявку',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).skipped).toBe(true)
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('всегда должен отправлять критичные уведомления', async () => {
      const sendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue({
          ...mockSettings,
          lessonReminders: false,
          lessonChanges: false,
          penaltyAlerts: false,
        }),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      // INVITATION_RECEIVED - критичное уведомление
      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'INVITATION_RECEIVED',
        title: 'Приглашение',
        body: 'Вы получили приглашение от инструктора',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(true)
      expect(sendMock).toHaveBeenCalled()
    })

    it('должен использовать дефолтные настройки если нет настроек пользователя', async () => {
      const sendMock = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' })
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue(null),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(true)
      expect((result as SendEmailResult & { success: true }).sent).toBe(true)
    })

    it('должен обрабатывать ошибку отправки email', async () => {
      const sendMock = vi.fn().mockResolvedValue({ success: false, error: 'SMTP error' })
      const repo = createMockRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
        getNotificationSettings: vi.fn().mockResolvedValue(mockSettings),
      })
      const emailProvider = createMockEmailProvider({ sendEmail: sendMock })

      const result = await sendEmailToUser({
        userId: 'user-1',
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        repo,
        emailProvider,
      })

      expect(result.success).toBe(false)
      expect((result as SendEmailResult & { success: false }).error).toBe('EMAIL_SEND_FAILED')
    })
  })

  describe('getEmailSubject', () => {
    it('должен возвращать тему для LESSON_CREATED', () => {
      const subject = getEmailSubject('LESSON_CREATED', 'Новое занятие')
      expect(subject).toBe('📚 Новое занятие — НаПрава.РФ')
    })

    it('должен возвращать тему для LESSON_CONFIRMED', () => {
      const subject = getEmailSubject('LESSON_CONFIRMED', 'Занятие подтверждено')
      expect(subject).toBe('✅ Занятие подтверждено — НаПрава.РФ')
    })

    it('должен возвращать тему для LESSON_CANCELLED', () => {
      const subject = getEmailSubject('LESSON_CANCELLED', 'Занятие отменено')
      expect(subject).toBe('❌ Занятие отменено — НаПрава.РФ')
    })

    it('должен возвращать тему для LESSON_REMINDER', () => {
      const subject = getEmailSubject('LESSON_REMINDER', 'Напоминание о занятии')
      expect(subject).toBe('⏰ Напоминание о занятии — НаПрава.РФ')
    })

    it('должен возвращать тему для PENALTY_CHARGED', () => {
      const subject = getEmailSubject('PENALTY_CHARGED', 'Начислен штраф')
      expect(subject).toBe('⚠️ Начислен штраф — НаПрава.РФ')
    })

    it('должен возвращать тему для INVITATION_RECEIVED', () => {
      const subject = getEmailSubject('INVITATION_RECEIVED', 'Приглашение')
      expect(subject).toBe('📨 Приглашение — НаПрава.РФ')
    })

    it('должен возвращать тему для STUDENT_TRANSFER', () => {
      const subject = getEmailSubject('STUDENT_TRANSFER', 'Передача ученика')
      expect(subject).toBe('🔄 Передача ученика — НаПрава.РФ')
    })

    it('должен возвращать тему для SCHOOL_INVITE', () => {
      const subject = getEmailSubject('SCHOOL_INVITE', 'Приглашение в школу')
      expect(subject).toBe('🏫 Приглашение в школу — НаПрава.РФ')
    })

    it('должен возвращать тему для INSTRUCTOR_RETURNED', () => {
      const subject = getEmailSubject('INSTRUCTOR_RETURNED', 'Инструктор вернулся')
      expect(subject).toBe('🎉 Инструктор вернулся — НаПрава.РФ')
    })

    it('должен возвращать тему для LESSON_NEEDS_RESCHEDULE', () => {
      const subject = getEmailSubject('LESSON_NEEDS_RESCHEDULE', 'Требуется перенос')
      expect(subject).toBe('📅 Требуется перенос — НаПрава.РФ')
    })
  })

  describe('formatEmailContent', () => {
    it('должен форматировать HTML контент с именем пользователя', () => {
      const { html, text } = formatEmailContent({
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие на 15 января в 14:00',
        userName: 'Иван',
        data: { instructorName: 'Пётр Сидоров' },
      })

      expect(html).toContain('Иван')
      expect(html).toContain('Новое занятие')
      expect(html).toContain('15 января')
      expect(html).toContain('Пётр Сидоров')
      expect(text).toContain('Иван')
      expect(text).toContain('Новое занятие')
    })

    it('должен добавлять кнопку действия для занятий', () => {
      const { html } = formatEmailContent({
        type: 'LESSON_CREATED',
        title: 'Новое занятие',
        body: 'Вам назначено занятие',
        userName: 'Иван',
        data: { lessonId: 'lesson-1' },
        appUrl: 'https://driving-school.example.com',
      })

      expect(html).toContain('href=')
      expect(html).toContain('Посмотреть')
    })

    it('должен форматировать HTML контент для штрафа', () => {
      const { html, text } = formatEmailContent({
        type: 'PENALTY_CHARGED',
        title: 'Начислен штраф',
        body: 'Вам начислен штраф за позднюю отмену',
        userName: 'Иван',
        data: { penaltyType: 'LATE_CANCEL', amount: 1 },
      })

      expect(html).toContain('штраф')
      expect(text).toContain('штраф')
    })

    it('должен форматировать HTML контент для приглашения', () => {
      const { html, text } = formatEmailContent({
        type: 'INVITATION_RECEIVED',
        title: 'Приглашение от инструктора',
        body: 'Инструктор Пётр Сидоров приглашает вас',
        userName: 'Иван',
        data: { instructorName: 'Пётр Сидоров' },
      })

      expect(html).toContain('приглаша')
      expect(html).toContain('Пётр Сидоров')
      expect(text).toContain('приглаша')
    })

    it('должен добавлять footer с информацией об отписке', () => {
      const { html, text } = formatEmailContent({
        type: 'LESSON_REMINDER',
        title: 'Напоминание',
        body: 'Занятие через 24 часа',
        userName: 'Иван',
      })

      expect(html).toContain('отписаться')
      expect(text).toContain('отписаться')
    })
  })
})
