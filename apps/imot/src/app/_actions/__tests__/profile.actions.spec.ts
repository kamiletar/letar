import { beforeEach, describe, expect, it, vi } from 'vitest'

// Моки модулей
const mockUpdate = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { update: (...args: unknown[]) => mockUpdate(...args) },
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/auth-utils', () => ({
  requireAuth: () => mockRequireAuth(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Импортируем после моков
const { updateProfile } = await import('../profile.actions')

describe('updateProfile', () => {
  beforeEach(() => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1', name: 'Тест', role: 'CLIENT' })
    mockUpdate.mockResolvedValue({ id: 'user-1' })
  })

  it('успешно обновляет профиль с валидными данными', async () => {
    const result = await updateProfile({ name: 'Новое Имя' })
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ name: 'Новое Имя' }),
    })
  })

  it('возвращает ошибку при невалидных данных', async () => {
    const result = await updateProfile({ name: 'И' }) // слишком короткое
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('устанавливает phoneNumber в null если не передан', async () => {
    await updateProfile({ name: 'Иван Петров' })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ phoneNumber: null }),
    })
  })

  it('передаёт phoneNumber если задан', async () => {
    await updateProfile({ name: 'Иван', phoneNumber: '+7 999 123-45-67' })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ phoneNumber: '+7 999 123-45-67' }),
    })
  })

  it('возвращает ошибку при сбое БД', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('DB error'))
    const result = await updateProfile({ name: 'Иван Петров' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('ошибка')
  })
})
