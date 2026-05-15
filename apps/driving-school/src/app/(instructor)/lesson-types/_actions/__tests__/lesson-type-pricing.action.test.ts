import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPricingOption,
  deletePricingOption,
  getPricingOptions,
  setPrimaryPricingOption,
  updatePricingOption,
} from '../lesson-type.action'

// === Моки ===

// Определяем моки через vi.hoisted() для избежания hoisting проблем
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    lessonType: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
    },
    pricingOption: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
  }
  return { mockPrisma }
})

// Mock для action-helpers (withInstructor)
// Используем unknown вместо any для лучшей типизации
vi.mock('@/lib/action-helpers', () => ({
  withInstructor: vi.fn((callback: (user: unknown, instructorProfileId: string) => Promise<unknown>) => {
    const mockUser = { id: 'user-instructor-1', role: 'instructor' }
    const mockInstructorProfileId = 'instructor-profile-1'
    return callback(mockUser, mockInstructorProfileId)
  }),
}))

// Mock для db (getEnhancedPrisma и prisma)
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

// Mock для revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тестовые данные ===

const testLessonTypeId = 'lesson-type-123'
const testPricingOptionId = 'pricing-option-123'
const testInstructorProfileId = 'instructor-profile-1'

describe('lesson-type-pricing.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Группа 1: Получение вариантов цен ===

  describe('Группа 1: Получение вариантов цен', () => {
    it('getPricingOptions() — успешное получение списка', async () => {
      // Arrange
      mockPrisma.lessonType.findFirst.mockResolvedValue({
        id: testLessonTypeId,
        instructorId: testInstructorProfileId,
      })

      mockPrisma.pricingOption.findMany.mockResolvedValue([
        {
          id: 'option-1',
          vehicleOwner: 'INSTRUCTOR',
          vehicleId: null,
          lessonsCount: 1,
          pricePerLesson: 2000,
          discountPercent: 0,
          isActive: true,
          isPrimary: true,
          sortOrder: 0,
        },
        {
          id: 'option-2',
          vehicleOwner: 'INSTRUCTOR',
          vehicleId: null,
          lessonsCount: 10,
          pricePerLesson: 1800,
          discountPercent: 10,
          isActive: true,
          isPrimary: false,
          sortOrder: 1,
        },
      ])

      // Act
      const result = await getPricingOptions(testLessonTypeId)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.pricingOptions).toHaveLength(2)
        expect(result.pricingOptions[0].isPrimary).toBe(true)
        expect(result.pricingOptions[0].pricePerLesson).toBe(2000)
      }

      expect(mockPrisma.pricingOption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            lessonTypeId: testLessonTypeId,
            isActive: true,
          },
        })
      )
    })

    it('getPricingOptions() — ошибка если lesson type не принадлежит инструктору', async () => {
      // Arrange
      mockPrisma.lessonType.findFirst.mockResolvedValue(null)

      // Act
      const result = await getPricingOptions(testLessonTypeId)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }

      expect(mockPrisma.pricingOption.findMany).not.toHaveBeenCalled()
    })
  })

  // === Группа 2: Создание варианта цены ===

  describe('Группа 2: Создание варианта цены', () => {
    it('createPricingOption() — успешное создание варианта цены', async () => {
      // Arrange
      mockPrisma.lessonType.findFirst.mockResolvedValue({
        id: testLessonTypeId,
        instructorId: testInstructorProfileId,
      })

      mockPrisma.pricingOption.findFirst.mockResolvedValue(null) // Нет дубликата
      mockPrisma.pricingOption.aggregate.mockResolvedValue({
        _max: { sortOrder: 0 },
      })

      mockPrisma.pricingOption.create.mockResolvedValue({
        id: testPricingOptionId,
        lessonTypeId: testLessonTypeId,
        vehicleOwner: 'INSTRUCTOR',
        vehicleId: null,
        lessonsCount: 1,
        pricePerLesson: 2000,
        discountPercent: 0,
        sortOrder: 1,
        isPrimary: true,
        isActive: true,
      })

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2000')
      formData.set('discountPercent', '0')

      // Act
      const result = await createPricingOption(testLessonTypeId, formData)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.id).toBe(testPricingOptionId)
      }

      expect(mockPrisma.pricingOption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lessonTypeId: testLessonTypeId,
            vehicleOwner: 'INSTRUCTOR',
            lessonsCount: 1,
            pricePerLesson: 2000,
          }),
        })
      )
    })

    it('createPricingOption() — ошибка при дубликате варианта', async () => {
      // Arrange
      mockPrisma.lessonType.findFirst.mockResolvedValue({
        id: testLessonTypeId,
        instructorId: testInstructorProfileId,
      })

      // Дубликат существует
      mockPrisma.pricingOption.findFirst.mockResolvedValue({
        id: 'existing-option',
        lessonTypeId: testLessonTypeId,
        vehicleOwner: 'INSTRUCTOR',
        lessonsCount: 1,
      })

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2000')
      formData.set('discountPercent', '0')

      // Act
      const result = await createPricingOption(testLessonTypeId, formData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже существует')
      }

      expect(mockPrisma.pricingOption.create).not.toHaveBeenCalled()
    })

    it('createPricingOption() — первый вариант становится primary', async () => {
      // Arrange
      mockPrisma.lessonType.findFirst.mockResolvedValue({
        id: testLessonTypeId,
        instructorId: testInstructorProfileId,
      })

      mockPrisma.pricingOption.findFirst
        .mockResolvedValueOnce(null) // Нет дубликата
        .mockResolvedValueOnce(null) // Нет primary варианта

      mockPrisma.pricingOption.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.create.mockResolvedValue({
        id: testPricingOptionId,
        isPrimary: true,
      } as unknown)

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2000')
      formData.set('discountPercent', '0')

      // Act
      await createPricingOption(testLessonTypeId, formData)

      // Assert
      expect(mockPrisma.pricingOption.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPrimary: true, // Первый вариант должен быть primary
          }),
        })
      )
    })
  })

  // === Группа 3: Обновление варианта цены ===

  describe('Группа 3: Обновление варианта цены', () => {
    it('updatePricingOption() — успешное обновление', async () => {
      // Arrange
      mockPrisma.pricingOption.findFirst.mockResolvedValue({
        id: testPricingOptionId,
        lessonTypeId: testLessonTypeId,
        lessonType: {
          instructorId: testInstructorProfileId,
        },
      })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.update.mockResolvedValue({
        id: testPricingOptionId,
        pricePerLesson: 2500,
      } as unknown)

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2500')
      formData.set('discountPercent', '5')

      // Act
      const result = await updatePricingOption(testPricingOptionId, formData)

      // Assert
      expect(result.success).toBe(true)

      expect(mockPrisma.pricingOption.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testPricingOptionId },
          data: expect.objectContaining({
            pricePerLesson: 2500,
            discountPercent: 5,
          }),
        })
      )
    })

    it('updatePricingOption() — ошибка если вариант не принадлежит инструктору', async () => {
      // Arrange
      mockPrisma.pricingOption.findFirst.mockResolvedValue({
        id: testPricingOptionId,
        lessonType: {
          instructorId: 'another-instructor-id', // Другой инструктор!
        },
      })

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2500')
      formData.set('discountPercent', '0')

      // Act
      const result = await updatePricingOption(testPricingOptionId, formData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найден')
      }

      expect(mockPrisma.pricingOption.update).not.toHaveBeenCalled()
    })
  })

  // === Группа 4: Удаление варианта цены ===

  describe('Группа 4: Удаление варианта цены', () => {
    it('deletePricingOption() — успешное удаление (soft delete)', async () => {
      // Arrange
      mockPrisma.pricingOption.findFirst.mockResolvedValue({
        id: testPricingOptionId,
        lessonTypeId: testLessonTypeId,
        isPrimary: false,
        lessonType: {
          instructorId: testInstructorProfileId,
        },
      })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.update.mockResolvedValue({
        id: testPricingOptionId,
        isActive: false,
      } as unknown)

      // Act
      const result = await deletePricingOption(testPricingOptionId)

      // Assert
      expect(result.success).toBe(true)

      // Проверяем soft delete (isActive = false)
      expect(mockPrisma.pricingOption.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testPricingOptionId },
          data: { isActive: false },
        })
      )
    })

    it('deletePricingOption() — если удаляли primary, назначает новый primary', async () => {
      // Arrange
      mockPrisma.pricingOption.findFirst
        .mockResolvedValueOnce({
          id: testPricingOptionId,
          lessonTypeId: testLessonTypeId,
          isPrimary: true, // Удаляем primary!
          lessonType: {
            instructorId: testInstructorProfileId,
          },
        })
        .mockResolvedValueOnce({
          id: 'new-primary-id',
          lessonTypeId: testLessonTypeId,
        })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.update.mockResolvedValue({} as unknown)

      // Act
      await deletePricingOption(testPricingOptionId)

      // Assert
      // Первый update — деактивация текущего
      expect(mockPrisma.pricingOption.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: testPricingOptionId },
          data: { isActive: false },
        })
      )

      // Второй update — назначение нового primary
      expect(mockPrisma.pricingOption.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: 'new-primary-id' },
          data: { isPrimary: true },
        })
      )
    })
  })

  // === Группа 5: Установка primary ===

  describe('Группа 5: Установка primary', () => {
    it('setPrimaryPricingOption() — устанавливает новый primary и сбрасывает старый', async () => {
      // Arrange
      mockPrisma.pricingOption.findFirst.mockResolvedValue({
        id: testPricingOptionId,
        lessonTypeId: testLessonTypeId,
        lessonType: {
          instructorId: testInstructorProfileId,
        },
      })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.updateMany.mockResolvedValue({ count: 2 } as unknown)
      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.update.mockResolvedValue({
        id: testPricingOptionId,
        isPrimary: true,
      } as unknown)

      // Act
      const result = await setPrimaryPricingOption(testPricingOptionId)

      // Assert
      expect(result.success).toBe(true)

      // Проверяем сброс всех isPrimary
      expect(mockPrisma.pricingOption.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lessonTypeId: testLessonTypeId },
          data: { isPrimary: false },
        })
      )

      // Проверяем установку нового primary
      expect(mockPrisma.pricingOption.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testPricingOptionId },
          data: { isPrimary: true },
        })
      )
    })
  })

  // === Группа 6: Access Control ===

  describe('Группа 6: Access Control', () => {
    it('Access control — только инструктор может создавать варианты цен', async () => {
      // Arrange
      const { withInstructor } = await import('@/lib/action-helpers')

      mockPrisma.lessonType.findFirst.mockResolvedValue({
        id: testLessonTypeId,
        instructorId: testInstructorProfileId,
      })

      mockPrisma.pricingOption.findFirst.mockResolvedValue(null)
      mockPrisma.pricingOption.aggregate.mockResolvedValue({
        _max: { sortOrder: 0 },
      })

      // Используем unknown для типовой безопасности вместо any
      mockPrisma.pricingOption.create.mockResolvedValue({
        id: testPricingOptionId,
      } as unknown)

      const formData = new FormData()
      formData.set('vehicleOwner', 'INSTRUCTOR')
      formData.set('lessonsCount', '1')
      formData.set('pricePerLesson', '2000')
      formData.set('discountPercent', '0')

      // Act
      await createPricingOption(testLessonTypeId, formData)

      // Assert
      expect(withInstructor).toHaveBeenCalledWith(expect.any(Function))
    })
  })
})
