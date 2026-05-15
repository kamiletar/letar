import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormPersistence } from './form-persistence'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface TestFormData {
  name: string
  email: string
}

const STORAGE_PREFIX = 'form-persistence:'
const TEST_KEY = 'test-form'
const STORAGE_KEY = `${STORAGE_PREFIX}${TEST_KEY}`

describe('useFormPersistence', () => {
  beforeEach(() => {
    // Очищаем localStorage перед каждым тестом
    localStorage.clear()
  })

  describe('initial state', () => {
    it('возвращает пустое состояние когда нет сохранённых данных', () => {
      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.hasSavedData).toBe(false)
      expect(result.current.savedData).toBeNull()
      expect(result.current.isDialogOpen).toBe(false)
      expect(result.current.shouldRestore).toBe(false)
    })

    it('загружает сохранённые данные из localStorage', () => {
      const savedData: TestFormData = { name: 'John', email: 'john@test.com' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      // useEffect выполняется синхронно в тестовом окружении
      expect(result.current.hasSavedData).toBe(true)
      expect(result.current.savedData).toEqual(savedData)
      expect(result.current.isDialogOpen).toBe(true)
    })

    it('удаляет невалидный JSON из localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json')

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.hasSavedData).toBe(false)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('saveValues', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('сохраняет значения в localStorage с debounce', () => {
      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY, debounceMs: 100 }), {
        wrapper: TestWrapper,
      })

      const data: TestFormData = { name: 'Test', email: 'test@test.com' }

      act(() => {
        result.current.saveValues(data)
      })

      // До истечения debounce данные не должны быть сохранены
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

      // Ждём истечения debounce
      act(() => {
        vi.advanceTimersByTime(100)
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      expect(stored.data).toEqual(data)
      expect(stored.version).toBe(1)
      expect(typeof stored.savedAt).toBe('number')
    })

    it('использует debounce по умолчанию 500мс', () => {
      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      act(() => {
        result.current.saveValues({ name: 'Test', email: 'test@test.com' })
      })

      act(() => {
        vi.advanceTimersByTime(400)
      })

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })

    it('не сохраняет когда диалог открыт', () => {
      const savedData: TestFormData = { name: 'Old', email: 'old@test.com' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY, debounceMs: 100 }), {
        wrapper: TestWrapper,
      })

      // Диалог должен быть открыт
      expect(result.current.isDialogOpen).toBe(true)

      act(() => {
        result.current.saveValues({ name: 'New', email: 'new@test.com' })
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Должны остаться старые данные

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(savedData)
    })

    it('отменяет pending сохранение при clearSavedData', () => {
      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY, debounceMs: 500 }), {
        wrapper: TestWrapper,
      })

      act(() => {
        result.current.saveValues({ name: 'Test', email: 'test@test.com' })
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        result.current.clearSavedData()
      })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Данные не должны быть сохранены
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('clearSavedData', () => {
    it('очищает данные из localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Test', email: 'test@test.com' }))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.hasSavedData).toBe(true)

      act(() => {
        result.current.clearSavedData()
      })

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(result.current.hasSavedData).toBe(false)
      expect(result.current.savedData).toBeNull()
    })
  })

  describe('acceptRestore', () => {
    it('возвращает сохранённые данные и закрывает диалог', () => {
      const savedData: TestFormData = { name: 'Saved', email: 'saved@test.com' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.isDialogOpen).toBe(true)

      let restoredData: TestFormData | null = null
      act(() => {
        restoredData = result.current.acceptRestore()
      })

      expect(restoredData).toEqual(savedData)
      expect(result.current.isDialogOpen).toBe(false)
      expect(result.current.shouldRestore).toBe(true)
    })
  })

  describe('rejectRestore', () => {
    it('очищает данные и закрывает диалог', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Test', email: 'test@test.com' }))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.isDialogOpen).toBe(true)

      act(() => {
        result.current.rejectRestore()
      })

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(result.current.isDialogOpen).toBe(false)
      expect(result.current.hasSavedData).toBe(false)
    })
  })

  describe('markRestoreComplete', () => {
    it('сбрасывает shouldRestore и очищает данные', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Test', email: 'test@test.com' }))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.isDialogOpen).toBe(true)

      act(() => {
        result.current.acceptRestore()
      })

      expect(result.current.shouldRestore).toBe(true)

      act(() => {
        result.current.markRestoreComplete()
      })

      expect(result.current.shouldRestore).toBe(false)
      expect(result.current.hasSavedData).toBe(false)
    })
  })

  describe('closeDialog', () => {
    it('закрывает диалог без изменения данных', () => {
      const savedData: TestFormData = { name: 'Test', email: 'test@test.com' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: TEST_KEY }), {
        wrapper: TestWrapper,
      })

      expect(result.current.isDialogOpen).toBe(true)

      act(() => {
        result.current.closeDialog()
      })

      expect(result.current.isDialogOpen).toBe(false)
      // Данные должны остаться
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(savedData))
      expect(result.current.hasSavedData).toBe(true)
    })
  })

  describe('storage key', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('использует префикс для ключа', () => {
      const { result } = renderHook(() => useFormPersistence<TestFormData>({ key: 'my-form' }), {
        wrapper: TestWrapper,
      })

      act(() => {
        result.current.saveValues({ name: 'Test', email: 'test@test.com' })
      })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(localStorage.getItem('form-persistence:my-form')).not.toBeNull()
    })
  })
})
