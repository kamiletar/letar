import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteSlotsAction,
  generateSlotsAction,
  getScheduleSettings,
  updateScheduleSettingsAction,
} from '../schedule-settings.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    scheduleSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    customBreak: {
      findMany: vi.fn(),
    },
    timeSlot: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      findFirst: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  withInstructor: vi.fn((callback: (user: unknown, instructorProfileId: string) => Promise<unknown>) => {
    const mockUser = { id: 'user-instructor-1', roles: ['FREELANCE_INSTRUCTOR'] }
    return callback(mockUser, 'instructor-profile-1')
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('../../_schemas/schedule-settings.schema', () => ({
  ScheduleSettingsFormSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
}))

// === Тестовые данные ===

const testWorkingHours = {
  monday: { open: '09:00', close: '18:00' },
  wednesday: { open: '10:00', close: '17:00' },
}

// === Тесты ===

describe('schedule-settings.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getScheduleSettings', () => {
    it('возвращает настройки расписания', async () => {
      mockPrisma.scheduleSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        instructorId: 'instructor-profile-1',
        workingHours: testWorkingHours,
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 14,
      })

      const result = await getScheduleSettings()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.settings).not.toBeNull()
        expect(result.settings?.lessonDuration).toBe(90)
        expect(result.settings?.breakDuration).toBe(15)
        expect(result.settings?.planningHorizon).toBe(14)
      }
    })

    it('возвращает null если настроек нет', async () => {
      mockPrisma.scheduleSettings.findUnique.mockResolvedValue(null)

      const result = await getScheduleSettings()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.settings).toBeNull()
      }
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.scheduleSettings.findUnique.mockRejectedValue(new Error('DB error'))

      const result = await getScheduleSettings()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNKNOWN_ERROR')
      }
    })
  })

  describe('updateScheduleSettingsAction', () => {
    it('успешно создаёт/обновляет настройки (upsert)', async () => {
      mockPrisma.scheduleSettings.upsert.mockResolvedValue({ id: 'settings-1' })

      const data = {
        workingHours: JSON.stringify(testWorkingHours),
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 14,
      }

      const result = await updateScheduleSettingsAction(data)

      expect(result.success).toBe(true)
      expect(mockPrisma.scheduleSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { instructorId: 'instructor-profile-1' },
        })
      )
    })

    it('возвращает ошибку валидации', async () => {
      const { ScheduleSettingsFormSchema } = await import('../../_schemas/schedule-settings.schema')
      vi.mocked(ScheduleSettingsFormSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      } as never)

      const result = await updateScheduleSettingsAction({} as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('generateSlotsAction', () => {
    it('успешно генерирует слоты', async () => {
      mockPrisma.scheduleSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        instructorId: 'instructor-profile-1',
        workingHours: testWorkingHours,
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 7,
      })
      mockPrisma.customBreak.findMany.mockResolvedValue([])
      mockPrisma.timeSlot.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.timeSlot.createMany.mockResolvedValue({ count: 10 })

      const result = await generateSlotsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.slotsCreated).toBe('number')
      }
    })

    it('возвращает ошибку если настройки не найдены', async () => {
      mockPrisma.scheduleSettings.findUnique.mockResolvedValue(null)

      const result = await generateSlotsAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('сохраните настройки')
      }
    })

    it('возвращает ошибку если нет рабочих часов', async () => {
      mockPrisma.scheduleSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        workingHours: {},
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 7,
      })

      const result = await generateSlotsAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('рабочие часы')
      }
    })
  })

  describe('deleteSlotsAction', () => {
    it('успешно удаляет свободные слоты', async () => {
      mockPrisma.timeSlot.count.mockResolvedValue(3)
      mockPrisma.timeSlot.deleteMany.mockResolvedValue({ count: 15 })

      const result = await deleteSlotsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.deletedCount).toBe(15)
        expect(result.bookedCount).toBe(3)
      }
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.timeSlot.count.mockRejectedValue(new Error('DB error'))

      const result = await deleteSlotsAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Произошла ошибка')
      }
    })
  })
})
