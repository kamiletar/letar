/**
 * Тесты для фабрики create actions.
 *
 * Тестируем createCreateAction с моками авторизации и БД.
 */

import { z } from 'zod/v4'
import { createCreateAction } from '../create-action-factory'

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
    published: z.boolean().optional().default(false),
  })
  .strip()

describe('createCreateAction', () => {
  let mockDb: { mandala: { create: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      mandala: {
        create: vi.fn(),
      },
    }

    mockAssertAdminAuth.mockResolvedValue({ db: mockDb })
  })

  it('должен создать action с правильной конфигурацией', () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    expect(action).toBeTypeOf('function')
  })

  it('должен вернуть ошибку при невалидных данных', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    const result = await action({ name: '', slug: '' }) // Пустые строки — невалидно

    expect(result).toEqual({
      success: false,
      error: 'Некорректные данные',
    })
    expect(mockDb.mandala.create).not.toHaveBeenCalled()
  })

  it('должен создать запись и сделать redirect при успехе', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.create.mockResolvedValue({ id: 'mandala-123' })

    await action({ name: 'Тестовая мандала', slug: 'test-mandala' })

    expect(mockDb.mandala.create).toHaveBeenCalledWith({
      data: {
        name: 'Тестовая мандала',
        slug: 'test-mandala',
        published: false,
      },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/mandalas/mandala-123')
  })

  it('должен применить transformData перед созданием', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      transformData: (data) => ({
        ...data,
        slug: data.slug.toLowerCase(),
        order: 0,
      }),
    })

    mockDb.mandala.create.mockResolvedValue({ id: 'mandala-123' })

    await action({ name: 'Мандала', slug: 'Test-Slug' })

    expect(mockDb.mandala.create).toHaveBeenCalledWith({
      data: {
        name: 'Мандала',
        slug: 'test-slug', // toLowerCase применён
        published: false,
        order: 0, // Добавлено через transformData
      },
    })
  })

  it('должен обработать ошибку уникальности ZenStack v3 ORM (dbErrorCode 23505)', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      uniqueField: 'slug',
      uniqueErrorMessage: 'Мандала с таким slug уже существует',
    })

    mockDb.mandala.create.mockRejectedValue({ dbErrorCode: '23505' })

    const result = await action({ name: 'Мандала', slug: 'existing-slug' })

    expect(result).toEqual({
      success: false,
      error: 'Мандала с таким slug уже существует',
      field: 'slug',
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('должен использовать дефолтное сообщение для ошибки уникальности', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
      uniqueField: 'slug',
      // uniqueErrorMessage не задан — используется дефолтное
    })

    mockDb.mandala.create.mockRejectedValue({ dbErrorCode: '23505' })

    const result = await action({ name: 'Мандала', slug: 'existing-slug' })

    expect(result).toEqual({
      success: false,
      error: 'Мандалу с таким slug уже существует',
      field: 'slug',
    })
  })

  it('должен вернуть общую ошибку при неизвестной ошибке БД', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.create.mockRejectedValue(new Error('Database connection failed'))

    const result = await action({ name: 'Мандала', slug: 'test' })

    expect(result).toEqual({
      success: false,
      error: 'Не удалось создать мандалу. Попробуйте еще раз.',
    })
  })

  it('должен удалять лишние поля через .strip()', async () => {
    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    mockDb.mandala.create.mockResolvedValue({ id: 'mandala-123' })

    await action({
      name: 'Мандала',
      slug: 'test',
      extraField: 'should be removed',
      anotherField: 123,
    } as z.infer<typeof testSchema>)

    expect(mockDb.mandala.create).toHaveBeenCalledWith({
      data: {
        name: 'Мандала',
        slug: 'test',
        published: false,
        // extraField и anotherField удалены
      },
    })
  })

  it('должен проверить авторизацию перед созданием', async () => {
    mockAssertAdminAuth.mockRejectedValue(new Error('Unauthorized'))

    const action = createCreateAction({
      model: 'mandala',
      schema: testSchema,
      redirectPath: (id) => `/admin/mandalas/${id}`,
      entityName: 'мандалу',
    })

    await expect(action({ name: 'Мандала', slug: 'test' })).rejects.toThrow('Unauthorized')
    expect(mockDb.mandala.create).not.toHaveBeenCalled()
  })
})
