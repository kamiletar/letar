import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getStudentProfile, updateStudentProfileAction } from '../update-student-profile.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    studentProfile: {
      update: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: { id: 'session-1' },
    user: { id: 'user-student-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('../../_schemas/student-profile.schema', () => ({
  UpdateStudentProfileSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
}))

// === Тесты ===

describe('update-student-profile.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateStudentProfileAction', () => {
    it('успешно обновляет профиль ученика', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.studentProfile.update.mockResolvedValue({})

      const result = await updateStudentProfileAction({
        name: 'Иван Иванов',
        phone: '+79991234567',
        preferredAreas: ['Центр'],
        noteForInstructor: 'Занимаюсь по вечерам',
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-student-1' },
          data: expect.objectContaining({
            name: 'Иван Иванов',
            phone: '+79991234567',
          }),
        })
      )
      expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-student-1' },
          data: expect.objectContaining({
            preferredAreas: ['Центр'],
            noteForInstructor: 'Занимаюсь по вечерам',
          }),
        })
      )
    })

    it('возвращает ошибку если не авторизован', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await updateStudentProfileAction({ name: 'Тест' } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('войти в систему')
      }
    })

    it('возвращает ошибку если нет профиля ученика', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: null,
      })

      const result = await updateStudentProfileAction({ name: 'Тест' } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найден')
      }
    })

    it('возвращает ошибку при невалидных данных', async () => {
      const { UpdateStudentProfileSchema } = await import('../../_schemas/student-profile.schema')
      vi.mocked(UpdateStudentProfileSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      } as never)

      const result = await updateStudentProfileAction({} as never)

      expect(result).toEqual({ success: false, error: 'Некорректные данные' })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.user.update.mockRejectedValue(new Error('DB error'))

      const result = await updateStudentProfileAction({ name: 'Тест' } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Произошла ошибка')
      }
    })
  })

  describe('getStudentProfile', () => {
    it('возвращает профиль ученика', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        name: 'Иван',
        phone: '+79991234567',
        studentProfile: {
          preferredAreas: ['Центр', 'Север'],
          noteForInstructor: 'Заметка',
        },
      })

      const result = await getStudentProfile()

      expect(result).not.toBeNull()
      if (result) {
        expect(result.name).toBe('Иван')
        expect(result.phone).toBe('+79991234567')
        expect(result.preferredAreas).toEqual(['Центр', 'Север'])
        expect(result.noteForInstructor).toBe('Заметка')
      }
    })

    it('возвращает null если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getStudentProfile()

      expect(result).toBeNull()
    })

    it('возвращает null если нет профиля ученика', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        studentProfile: null,
      })

      const result = await getStudentProfile()

      expect(result).toBeNull()
    })
  })
})
