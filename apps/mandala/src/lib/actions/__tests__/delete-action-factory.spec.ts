/**
 * Тесты для фабрики delete actions.
 *
 * Тестируем createDeleteAction с моками авторизации и БД.
 */

import { createDeleteAction } from '../delete-action-factory'

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

describe('createDeleteAction', () => {
  let mockDb: { mandala: { delete: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      mandala: {
        delete: vi.fn(),
      },
    }

    mockAssertAdminAuth.mockResolvedValue({ db: mockDb })
  })

  it('должен создать action с правильной конфигурацией', () => {
    const action = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')

    expect(action).toBeTypeOf('function')
  })

  it('должен удалить запись и сделать redirect при успехе', async () => {
    const action = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')

    mockDb.mandala.delete.mockResolvedValue({ id: 'mandala-123' })

    await action('mandala-123')

    expect(mockDb.mandala.delete).toHaveBeenCalledWith({
      where: { id: 'mandala-123' },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/mandalas')
  })

  it('должен выбросить ошибку при неудачном удалении', async () => {
    const action = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')

    mockDb.mandala.delete.mockRejectedValue(new Error('Record not found'))

    await expect(action('non-existent')).rejects.toThrow('Не удалось удалить мандалу')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('должен проверить авторизацию перед удалением', async () => {
    mockAssertAdminAuth.mockRejectedValue(new Error('Unauthorized'))

    const action = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')

    await expect(action('mandala-123')).rejects.toThrow('Unauthorized')
    expect(mockDb.mandala.delete).not.toHaveBeenCalled()
  })

  it('должен работать с разными моделями', async () => {
    const productDb = { product: { delete: vi.fn().mockResolvedValue({ id: 'prod-1' }) } }
    mockAssertAdminAuth.mockResolvedValue({ db: productDb })

    const deleteProduct = createDeleteAction('product', '/admin/products', 'товар')
    await deleteProduct('prod-1')

    expect(productDb.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/products')
  })

  it('должен работать с contentPage', async () => {
    const contentDb = { contentPage: { delete: vi.fn().mockResolvedValue({ id: 'page-1' }) } }
    mockAssertAdminAuth.mockResolvedValue({ db: contentDb })

    const deletePage = createDeleteAction('contentPage', '/admin/content-pages', 'страницу')
    await deletePage('page-1')

    expect(contentDb.contentPage.delete).toHaveBeenCalledWith({ where: { id: 'page-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/content-pages')
  })

  it('должен работать с order', async () => {
    const orderDb = { order: { delete: vi.fn().mockResolvedValue({ id: 'order-1' }) } }
    mockAssertAdminAuth.mockResolvedValue({ db: orderDb })

    const deleteOrder = createDeleteAction('order', '/admin/orders', 'заказ')
    await deleteOrder('order-1')

    expect(orderDb.order.delete).toHaveBeenCalledWith({ where: { id: 'order-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/admin/orders')
  })

  it('должен сохранять причину ошибки в cause', async () => {
    const originalError = new Error('P2025: Record not found')
    mockDb.mandala.delete.mockRejectedValue(originalError)

    const action = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')

    try {
      await action('non-existent')
      expect.fail('Должен был выбросить ошибку')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Не удалось удалить мандалу')
      expect((error as Error).cause).toBe(originalError)
    }
  })
})
