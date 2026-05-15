import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getInstructorProfile, updateInstructorProfileAction } from '../update-instructor-profile.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    instructorProfile: {
      update: vi.fn(),
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

vi.mock('@/lib/images', () => ({
  getFileUrl: vi.fn((path: string) => `/uploads/${path}`),
}))

vi.mock('../../_schemas/instructor-profile.schema', () => ({
  UpdateInstructorProfileSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
}))

// === Тесты ===

describe('update-instructor-profile.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateInstructorProfileAction', () => {
    it('успешно обновляет профиль инструктора', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-instructor-1' })
      mockPrisma.instructorProfile.update.mockResolvedValue({ id: 'instructor-profile-1' })

      const data = {
        name: 'Иван Петров',
        phone: '+79991234567',
        bio: 'Опытный инструктор',
        experienceStartDate: new Date('2020-01-01'),
        licenseCategories: ['B', 'C'],
        isPublic: true,
      }

      const result = await updateInstructorProfileAction(data)

      expect(result.success).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-instructor-1' },
          data: expect.objectContaining({
            name: 'Иван Петров',
            phone: '+79991234567',
          }),
        })
      )
      expect(mockPrisma.instructorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-instructor-1' },
        })
      )
    })

    it('возвращает ошибку при невалидных данных', async () => {
      const { UpdateInstructorProfileSchema } = await import('../../_schemas/instructor-profile.schema')
      vi.mocked(UpdateInstructorProfileSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      } as unknown as ReturnType<typeof UpdateInstructorProfileSchema.safeParse>)

      const result = await updateInstructorProfileAction({} as never)

      expect(result).toEqual({ error: 'Некорректные данные' })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('DB error'))

      const result = await updateInstructorProfileAction({ name: 'Тест' } as never)

      expect(result).toEqual({ error: 'Произошла ошибка при сохранении профиля' })
    })

    it('проверяет что withInstructor вызывается', async () => {
      const { withInstructor } = await import('@/lib/action-helpers')

      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.instructorProfile.update.mockResolvedValue({})

      await updateInstructorProfileAction({ name: 'Тест' } as never)

      expect(withInstructor).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe('getInstructorProfile', () => {
    it('успешно возвращает профиль инструктора', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-instructor-1',
        name: 'Иван',
        phone: '+79991234567',
        instructorProfile: {
          bio: 'Опытный',
          experienceStartDate: new Date('2020-01-01'),
          licenseCategories: ['B'],
          workingAreas: null,
          isPublic: true,
          photo: null,
          vehicles: [],
        },
      })

      const result = await getInstructorProfile()

      expect(result).not.toBeNull()
      if (result) {
        expect(result.name).toBe('Иван')
        expect(result.bio).toBe('Опытный')
        expect(result.licenseCategories).toEqual(['B'])
      }
    })

    it('возвращает null если профиль не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getInstructorProfile()

      expect(result).toBeNull()
    })
  })
})
