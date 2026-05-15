/**
 * Тесты для хука useAdminForm.
 */

import { act, renderHook } from '@testing-library/react'
import { type FormActionResult, useAdminForm } from '../use-admin-form'

// Мок toaster
vi.mock('@/app/_components/ui/toaster', () => ({
  toaster: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Мок createFormPersistence
vi.mock('../../_helpers', () => ({
  createFormPersistence: vi.fn((entityKey: string, entityId?: string) => ({
    key: entityId ? `${entityKey}:${entityId}` : `${entityKey}:new`,
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  })),
}))

import { toaster } from '@/app/_components/ui/toaster'
import { createFormPersistence } from '../../_helpers'

const mockToaster = toaster as { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> }
const mockCreateFormPersistence = createFormPersistence as ReturnType<typeof vi.fn>

interface TestEntity {
  id: string
  name: string
  slug: string
}

interface TestFormInput {
  name: string
  slug: string
}

describe('useAdminForm', () => {
  const toFormValues = (entity: TestEntity | null | undefined): TestFormInput => {
    if (entity) {
      return { name: entity.name, slug: entity.slug }
    }
    return { name: '', slug: '' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('инициализация', () => {
    it('должен вернуть defaultValues из toFormValues для новой сущности', () => {
      const onSubmit = vi.fn()

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      expect(result.current.defaultValues).toEqual({ name: '', slug: '' })
      expect(result.current.isEditing).toBe(false)
    })

    it('должен вернуть defaultValues из сущности для редактирования', () => {
      const onSubmit = vi.fn()
      const entity: TestEntity = { id: 'test-1', name: 'Test Name', slug: 'test-slug' }

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity,
          toFormValues,
          onSubmit,
        })
      )

      expect(result.current.defaultValues).toEqual({ name: 'Test Name', slug: 'test-slug' })
      expect(result.current.isEditing).toBe(true)
    })

    it('должен создать persistence с entityKey для новой сущности', () => {
      const onSubmit = vi.fn()

      renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'mandala',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      expect(mockCreateFormPersistence).toHaveBeenCalledWith('mandala', undefined)
    })

    it('должен создать persistence с entityKey и id для редактирования', () => {
      const onSubmit = vi.fn()
      const entity: TestEntity = { id: 'entity-123', name: 'Test', slug: 'test' }

      renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'mandala',
          entity,
          toFormValues,
          onSubmit,
        })
      )

      expect(mockCreateFormPersistence).toHaveBeenCalledWith('mandala', 'entity-123')
    })

    it('должен использовать кастомный getId', () => {
      const onSubmit = vi.fn()
      const entity = { customId: 'custom-456', name: 'Test', slug: 'test' }

      renderHook(() =>
        useAdminForm<typeof entity, TestFormInput>({
          entityKey: 'product',
          entity,
          getId: (e) => e.customId,
          toFormValues: (e) => (e ? { name: e.name, slug: e.slug } : { name: '', slug: '' }),
          onSubmit,
        })
      )

      expect(mockCreateFormPersistence).toHaveBeenCalledWith('product', 'custom-456')
    })
  })

  describe('handleSubmit', () => {
    it('должен вызвать onSubmit с данными формы', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: true })
      const formData: TestFormInput = { name: 'New Name', slug: 'new-slug' }

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      await act(async () => {
        await result.current.handleSubmit(formData)
      })

      expect(onSubmit).toHaveBeenCalledWith(formData)
    })

    it('должен показать toaster.error при ошибке', async () => {
      const onSubmit = vi.fn().mockResolvedValue({
        success: false,
        error: 'Произошла ошибка',
      } as FormActionResult)

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      await act(async () => {
        await result.current.handleSubmit({ name: 'Test', slug: 'test' })
      })

      expect(mockToaster.error).toHaveBeenCalledWith({ title: 'Произошла ошибка' })
    })

    it('не должен показывать toaster.error если error не передан', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: false })

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      await act(async () => {
        await result.current.handleSubmit({ name: 'Test', slug: 'test' })
      })

      expect(mockToaster.error).not.toHaveBeenCalled()
    })

    it('должен показать toaster.success при успехе с successMessage', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
          successMessage: 'Сохранено успешно!',
        })
      )

      await act(async () => {
        await result.current.handleSubmit({ name: 'Test', slug: 'test' })
      })

      expect(mockToaster.success).toHaveBeenCalledWith({ title: 'Сохранено успешно!' })
    })

    it('не должен показывать toaster.success без successMessage', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      await act(async () => {
        await result.current.handleSubmit({ name: 'Test', slug: 'test' })
      })

      expect(mockToaster.success).not.toHaveBeenCalled()
    })
  })

  describe('мемоизация', () => {
    it('должен сохранять ссылку на handleSubmit при ререндере', () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: true })

      const { result, rerender } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity: null,
          toFormValues,
          onSubmit,
        })
      )

      const handleSubmit1 = result.current.handleSubmit

      rerender()

      const handleSubmit2 = result.current.handleSubmit

      expect(handleSubmit1).toBe(handleSubmit2)
    })

    it('должен обновлять defaultValues при изменении entity', () => {
      const onSubmit = vi.fn()
      let entity: TestEntity | null = null

      const { result, rerender } = renderHook(() =>
        useAdminForm<TestEntity, TestFormInput>({
          entityKey: 'test',
          entity,
          toFormValues,
          onSubmit,
        })
      )

      expect(result.current.defaultValues).toEqual({ name: '', slug: '' })
      expect(result.current.isEditing).toBe(false)

      entity = { id: 'new-1', name: 'Updated', slug: 'updated' }
      rerender()

      expect(result.current.defaultValues).toEqual({ name: 'Updated', slug: 'updated' })
      expect(result.current.isEditing).toBe(true)
    })
  })
})
