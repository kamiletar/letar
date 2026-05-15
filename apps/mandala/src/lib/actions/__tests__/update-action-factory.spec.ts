/**
 * Тесты для фабрики update actions.
 *
 * Тестируем createUpdateAction с моками авторизации и БД.
 */

import { z } from 'zod/v4'
import { createUpdateAction } from '../update-action-factory'

// Мок модулей
vi.mock('../with-admin-auth', () => ({
  assertAdminAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { redirect } from 'next/navigation'
import { assertAdminAuth } from '../with-admin-auth'

const mockAssertAdminAuth = assertAdminAuth as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>

// Тестовая схема
const testSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1),
    published: z.boolean().optional(),
  })
  .strip()

describe('createUpdateAction', () => {
  let mockDb: { mandala: { update: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      mandala: {
        update: vi.fn(),
      },
    }

    mockAssertAdminAuth.mockResolvedValue({ db: mockDb })
  })

  it('должен создать action с правильной конфигурацией', () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    expect(action).toBeTypeOf('function')
  })

  it('должен вернуть ошибку при невалидных данных', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    const result = await action('mandala-123', { name: '', slug: '' })

    expect(result).toEqual({
      success: false,
      error: 'Некорректные данные',
    })
    expect(mockDb.mandala.update).not.toHaveBeenCalled()
  })

  it('должен обновить запись и сделать redirect при успехе', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.update.mockResolvedValue({ id: 'mandala-123' })

    await action('mandala-123', { name: 'Обновлённая мандала', slug: 'updated-mandala' })

    expect(mockDb.mandala.update).toHaveBeenCalledWith({
      where: { id: 'mandala-123' },
      data: {
        name: 'Обновлённая мандала',
        slug: 'updated-mandala',
      },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/mandalas/mandala-123')
  })

  it('должен применить transformData перед обновлением', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      transformData: (data) => ({
        ...data,
        slug: data.slug.toLowerCase(),
        updatedAt: new Date('2025-01-01'),
      }),
    })

    mockDb.mandala.update.mockResolvedValue({ id: 'mandala-123' })

    await action('mandala-123', { name: 'Мандала', slug: 'Test-Slug' })

    expect(mockDb.mandala.update).toHaveBeenCalledWith({
      where: { id: 'mandala-123' },
      data: {
        name: 'Мандала',
        slug: 'test-slug',
        updatedAt: new Date('2025-01-01'),
      },
    })
  })

  it('должен обработать ошибку уникальности P2002', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      uniqueField: 'slug',
      uniqueErrorMessage: 'Мандала с таким slug уже существует',
    })

    mockDb.mandala.update.mockRejectedValue({ code: 'P2002' })

    const result = await action('mandala-123', { name: 'Мандала', slug: 'existing-slug' })

    expect(result).toEqual({
      success: false,
      error: 'Мандала с таким slug уже существует',
      field: 'slug',
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('должен использовать дефолтное сообщение для ошибки уникальности', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      uniqueField: 'slug',
    })

    mockDb.mandala.update.mockRejectedValue({ code: 'P2002' })

    const result = await action('mandala-123', { name: 'Мандала', slug: 'existing-slug' })

    expect(result).toEqual({
      success: false,
      error: 'Мандалу с таким slug уже существует',
      field: 'slug',
    })
  })

  it('должен вернуть общую ошибку при неизвестной ошибке БД', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.update.mockRejectedValue(new Error('Database connection failed'))

    const result = await action('mandala-123', { name: 'Мандала', slug: 'test' })

    expect(result).toEqual({
      success: false,
      error: 'Не удалось обновить мандалу. Попробуйте еще раз.',
    })
  })

  it('должен удалять лишние поля через .strip()', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.update.mockResolvedValue({ id: 'mandala-123' })

    await action('mandala-123', {
      name: 'Мандала',
      slug: 'test',
      extraField: 'should be removed',
    } as z.infer<typeof testSchema>)

    expect(mockDb.mandala.update).toHaveBeenCalledWith({
      where: { id: 'mandala-123' },
      data: {
        name: 'Мандала',
        slug: 'test',
      },
    })
  })

  it('должен проверить авторизацию перед обновлением', async () => {
    mockAssertAdminAuth.mockRejectedValue(new Error('Unauthorized'))

    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    await expect(action('mandala-123', { name: 'Мандала', slug: 'test' })).rejects.toThrow('Unauthorized')
    expect(mockDb.mandala.update).not.toHaveBeenCalled()
  })

  it('должен сохранять id при redirect', async () => {
    const action = createUpdateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}/edit`,
      entityName: 'мандалу',
    })

    mockDb.mandala.update.mockResolvedValue({ id: 'mandala-456' })

    await action('mandala-456', { name: 'Мандала', slug: 'test' })

    expect(mockRedirect).toHaveBeenCalledWith('/admin/mandalas/mandala-456/edit')
  })
})
