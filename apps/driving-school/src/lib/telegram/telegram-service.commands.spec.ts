/**
 * Тесты для команд Telegram-бота
 *
 * Покрывает:
 * - Команда /start (handleStartCommand)
 * - Команда /lessons (handleLessonsCommand)
 * - Команда /schedule (handleScheduleCommand)
 * - Команда /help (handleHelpCommand)
 * - Inline-кнопки (handleConfirmLesson, handleRejectLesson)
 * - Форматирование сообщений
 */

import type { LessonStatus } from '@letar/driving-school-db/prisma'
import {
  formatHelpMessage,
  formatLessonListMessage,
  formatLessonMessage,
  formatScheduleMessage,
  formatWelcomeMessage,
  handleConfirmLesson,
  handleHelpCommand,
  handleLessonsCommand,
  handleRejectLesson,
  handleScheduleCommand,
  handleStartCommand,
} from './telegram-service'
import {
  createMockRepo,
  mockInstructor,
  mockLesson,
  mockLinkToken,
  mockSlot,
  mockTelegramLink,
  mockUser,
} from './telegram-service.mocks'

// === Тесты: Команды бота ===

describe('handleStartCommand', () => {
  it('должен привязать новый аккаунт', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
      getUserById: vi.fn().mockResolvedValue(mockUser),
    })

    const result = await handleStartCommand({
      token: 'abc123',
      telegramId: BigInt(123456789),
      username: 'ivanov',
      firstName: 'Иван',
      repo,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.message).toContain('Иван')
    }
  })

  it('должен вернуть сообщение если уже привязан', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
      getUserById: vi.fn().mockResolvedValue(mockUser),
    })

    const result = await handleStartCommand({
      token: 'abc123',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(true)
    // Обновление связи, не ошибка
  })

  it('должен вернуть сообщение если токен невалидный', async () => {
    const repo = createMockRepo()

    const result = await handleStartCommand({
      token: 'invalid',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBeDefined()
    }
  })
})

describe('handleLessonsCommand', () => {
  it('должен вернуть список ближайших занятий ученика', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
      getUserById: vi.fn().mockResolvedValue(mockUser),
      getUpcomingLessonsByStudentId: vi.fn().mockResolvedValue([mockLesson]),
    })

    const result = await handleLessonsCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lessons).toHaveLength(1)
    }
  })

  it('должен вернуть список ближайших занятий инструктора', async () => {
    const instructorLink = { ...mockTelegramLink, userId: 'instructor-1' }
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(instructorLink),
      getUserById: vi.fn().mockResolvedValue(mockInstructor),
      getUpcomingLessonsByInstructorId: vi.fn().mockResolvedValue([mockLesson]),
    })

    const result = await handleLessonsCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lessons).toHaveLength(1)
    }
  })

  it('должен вернуть сообщение если нет занятий', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
      getUserById: vi.fn().mockResolvedValue(mockUser),
      getUpcomingLessonsByStudentId: vi.fn().mockResolvedValue([]),
    })

    const result = await handleLessonsCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.lessons).toHaveLength(0)
      expect(result.message).toBeDefined()
    }
  })

  it('должен вернуть ошибку если не привязан', async () => {
    const repo = createMockRepo()

    const result = await handleLessonsCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_LINKED')
    }
  })
})

describe('handleScheduleCommand', () => {
  it('должен вернуть расписание инструктора', async () => {
    const instructorLink = { ...mockTelegramLink, userId: 'instructor-1' }
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(instructorLink),
      getUserById: vi.fn().mockResolvedValue(mockInstructor),
      getUpcomingSlotsByInstructorId: vi.fn().mockResolvedValue([mockSlot]),
    })

    const result = await handleScheduleCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.slots).toHaveLength(1)
    }
  })

  it('должен вернуть ошибку если не инструктор', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
      getUserById: vi.fn().mockResolvedValue(mockUser), // STUDENT
    })

    const result = await handleScheduleCommand({ telegramId: BigInt(123456789), repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_INSTRUCTOR')
    }
  })
})

describe('handleHelpCommand', () => {
  it('должен вернуть справку', () => {
    const result = handleHelpCommand()

    expect(result.message).toContain('/start')
    expect(result.message).toContain('/lessons')
    expect(result.message).toContain('/help')
  })
})

// === Тесты: Inline-кнопки ===

describe('handleConfirmLesson', () => {
  it('должен подтвердить занятие', async () => {
    const pendingLesson = { ...mockLesson, status: 'PENDING' as LessonStatus }
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue({
        ...mockTelegramLink,
        userId: 'instructor-1',
      }),
      getLessonById: vi.fn().mockResolvedValue(pendingLesson),
    })

    const result = await handleConfirmLesson({
      lessonId: 'lesson-1',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.updateLessonStatus).toHaveBeenCalledWith('lesson-1', 'CONFIRMED')
  })

  it('должен вернуть ошибку если занятие не найдено', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await handleConfirmLesson({
      lessonId: 'invalid',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('LESSON_NOT_FOUND')
    }
  })

  it('должен вернуть ошибку если уже подтверждено', async () => {
    const confirmedLesson = { ...mockLesson, status: 'CONFIRMED' as LessonStatus }
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue({
        ...mockTelegramLink,
        userId: 'instructor-1',
      }),
      getLessonById: vi.fn().mockResolvedValue(confirmedLesson),
    })

    const result = await handleConfirmLesson({
      lessonId: 'lesson-1',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('ALREADY_CONFIRMED')
    }
  })
})

describe('handleRejectLesson', () => {
  it('должен отклонить занятие', async () => {
    const pendingLesson = { ...mockLesson, status: 'PENDING' as LessonStatus }
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue({
        ...mockTelegramLink,
        userId: 'instructor-1',
      }),
      getLessonById: vi.fn().mockResolvedValue(pendingLesson),
    })

    const result = await handleRejectLesson({
      lessonId: 'lesson-1',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.updateLessonStatus).toHaveBeenCalledWith('lesson-1', 'CANCELLED')
  })

  it('должен вернуть ошибку если занятие не найдено', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await handleRejectLesson({
      lessonId: 'invalid',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('LESSON_NOT_FOUND')
    }
  })
})

// === Тесты: Форматирование сообщений ===

describe('formatLessonMessage', () => {
  it('должен форматировать сообщение о занятии', () => {
    const message = formatLessonMessage(mockLesson)

    expect(message).toContain('10.12.2025')
    expect(message).toContain('10:00')
    expect(message).toContain('Иван Иванов')
  })
})

describe('formatLessonListMessage', () => {
  it('должен форматировать список занятий', () => {
    const message = formatLessonListMessage([mockLesson])

    expect(message).toContain('10.12.2025')
  })
})

describe('formatScheduleMessage', () => {
  it('должен форматировать расписание', () => {
    const message = formatScheduleMessage([mockSlot])

    expect(message).toContain('10.12.2025')
    expect(message).toContain('10:00')
  })
})

describe('formatWelcomeMessage', () => {
  it('должен форматировать приветствие', () => {
    const message = formatWelcomeMessage(mockUser)

    expect(message).toContain('Иван Иванов')
    expect(message).toContain('привязан')
  })
})

describe('formatHelpMessage', () => {
  it('должен форматировать справку', () => {
    const message = formatHelpMessage()

    expect(message).toContain('/start')
    expect(message).toContain('/lessons')
    expect(message).toContain('/schedule')
    expect(message).toContain('/help')
  })
})
