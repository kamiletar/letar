/**
 * Тесты для фабрики bulk actions.
 *
 * Тестируем createBulkActions с моками авторизации и БД.
 */

import { createBulkActions } from '../bulk-actions-factory'

// Мок модулей
vi.mock('../with-admin-auth', () => ({
  assertAdminAuth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'
import { assertAdminAuth } from '../with-admin-auth'

const mockAssertAdminAuth = assertAdminAuth as ReturnType<typeof vi.fn>
const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>

describe('createBulkActions', () => {
  let mockDb: {
    mandala: {
      updateMany: ReturnType<typeof vi.fn>
      deleteMany: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      mandala: {
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    }

    mockAssertAdminAuth.mockResolvedValue({ db: mockDb })
  })

  describe('bulkPublish', () => {
    it('должен публиковать записи и вызывать revalidatePath', async () => {
      const { bulkPublish } = createBulkActions('mandala', '/admin/mandalas')

      mockDb.mandala.updateMany.mockResolvedValue({ count: 3 })

      await bulkPublish(['id-1', 'id-2', 'id-3'])

      expect(mockDb.mandala.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2', 'id-3'] } },
        data: { published: true },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/mandalas')
    })

    it('должен пропустить операцию для пустого массива', async () => {
      const { bulkPublish } = createBulkActions('mandala', '/admin/mandalas')

      await bulkPublish([])

      expect(mockAssertAdminAuth).not.toHaveBeenCalled()
      expect(mockDb.mandala.updateMany).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('должен вызвать revalidatePath для нескольких путей', async () => {
      const { bulkPublish } = createBulkActions('mandala', ['/admin/mandalas', '/gallery'])

      mockDb.mandala.updateMany.mockResolvedValue({ count: 1 })

      await bulkPublish(['id-1'])

      expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/mandalas')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/gallery')
    })
  })

  describe('bulkUnpublish', () => {
    it('должен скрывать записи и вызывать revalidatePath', async () => {
      const { bulkUnpublish } = createBulkActions('mandala', '/admin/mandalas')

      mockDb.mandala.updateMany.mockResolvedValue({ count: 2 })

      await bulkUnpublish(['id-1', 'id-2'])

      expect(mockDb.mandala.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2'] } },
        data: { published: false },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/mandalas')
    })

    it('должен пропустить операцию для пустого массива', async () => {
      const { bulkUnpublish } = createBulkActions('mandala', '/admin/mandalas')

      await bulkUnpublish([])

      expect(mockAssertAdminAuth).not.toHaveBeenCalled()
      expect(mockDb.mandala.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('bulkDelete', () => {
    it('должен удалять записи и вызывать revalidatePath', async () => {
      const { bulkDelete } = createBulkActions('mandala', '/admin/mandalas')

      mockDb.mandala.deleteMany.mockResolvedValue({ count: 2 })

      await bulkDelete(['id-1', 'id-2'])

      expect(mockDb.mandala.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2'] } },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/mandalas')
    })

    it('должен пропустить операцию для пустого массива', async () => {
      const { bulkDelete } = createBulkActions('mandala', '/admin/mandalas')

      await bulkDelete([])

      expect(mockAssertAdminAuth).not.toHaveBeenCalled()
      expect(mockDb.mandala.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('авторизация', () => {
    it('bulkPublish должен проверить авторизацию', async () => {
      mockAssertAdminAuth.mockRejectedValue(new Error('Unauthorized'))
      const { bulkPublish } = createBulkActions('mandala', '/admin/mandalas')

      await expect(bulkPublish(['id-1'])).rejects.toThrow('Unauthorized')
    })

    it('bulkUnpublish должен проверить авторизацию', async () => {
      mockAssertAdminAuth.mockRejectedValue(new Error('Forbidden'))
      const { bulkUnpublish } = createBulkActions('mandala', '/admin/mandalas')

      await expect(bulkUnpublish(['id-1'])).rejects.toThrow('Forbidden')
    })

    it('bulkDelete должен проверить авторизацию', async () => {
      mockAssertAdminAuth.mockRejectedValue(new Error('Unauthorized'))
      const { bulkDelete } = createBulkActions('mandala', '/admin/mandalas')

      await expect(bulkDelete(['id-1'])).rejects.toThrow('Unauthorized')
    })
  })

  describe('разные модели', () => {
    it('должен работать с product', async () => {
      const productDb = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          deleteMany: vi.fn(),
        },
      }
      mockAssertAdminAuth.mockResolvedValue({ db: productDb })

      const { bulkPublish } = createBulkActions('product', '/admin/products')
      await bulkPublish(['prod-1'])

      expect(productDb.product.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['prod-1'] } },
        data: { published: true },
      })
    })

    it('должен работать с contentPage', async () => {
      const contentDb = {
        contentPage: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }
      mockAssertAdminAuth.mockResolvedValue({ db: contentDb })

      const { bulkDelete } = createBulkActions('contentPage', '/admin/content-pages')
      await bulkDelete(['page-1'])

      expect(contentDb.contentPage.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['page-1'] } },
      })
    })
  })
})
