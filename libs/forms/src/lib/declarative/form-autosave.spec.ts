import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FormAutosaveConfig, useFormAutosave } from './form-autosave'

// Мок form объект
function createMockForm(values: Record<string, unknown> = { name: 'test' }) {
  return {
    state: { values },
  }
}

describe('useFormAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Мок fetch
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'draft-1' }),
      }),
    )
    // Мок localStorage
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('инициализация', () => {
    it('начинает со статусом idle', () => {
      const form = createMockForm()
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      expect(result.current.status).toBe('idle')
      expect(result.current.lastSavedAt).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('предоставляет saveNow и loadDraft функции', () => {
      const form = createMockForm()
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      expect(typeof result.current.saveNow).toBe('function')
      expect(typeof result.current.loadDraft).toBe('function')
    })
  })

  describe('saveNow', () => {
    it('отправляет данные формы на сервер', async () => {
      const form = createMockForm({ name: 'John', email: 'john@test.com' })
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(fetch).toHaveBeenCalledWith('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@test.com' }),
      })
    })

    it('обновляет статус на saved при успехе', async () => {
      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('saved')
      expect(result.current.lastSavedAt).toBeInstanceOf(Date)
    })

    it('обновляет статус на error при неудаче', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toContain('500')
    })

    it('не сохраняет повторно если данные не изменились', async () => {
      const form = createMockForm({ name: 'same' })
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      // Первый вызов — сохраняет
      await act(async () => {
        await result.current.saveNow()
      })
      expect(fetch).toHaveBeenCalledTimes(1)

      // Второй вызов с теми же данными — пропускает
      await act(async () => {
        await result.current.saveNow()
      })
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('использует кастомный HTTP метод', async () => {
      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = { endpoint: '/api/drafts', method: 'PUT' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(fetch).toHaveBeenCalledWith('/api/drafts', expect.objectContaining({ method: 'PUT' }))
    })

    it('добавляет draftId в URL', async () => {
      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        draftId: 'app-123',
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(fetch).toHaveBeenCalledWith('/api/drafts?draftId=app-123', expect.anything())
    })

    it('вызывает onSave callback при успехе', async () => {
      const onSave = vi.fn()
      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        onSave,
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSave).toHaveBeenCalledWith({ id: 'draft-1' })
    })

    it('вызывает onError callback при ошибке', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const onError = vi.fn()
      const form = createMockForm({ name: 'test' })
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        onError,
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(result.current.status).toBe('error')
    })
  })

  describe('loadDraft', () => {
    it('загружает черновик с сервера', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ name: 'saved-name', email: 'saved@test.com' }),
        }),
      )

      const form = createMockForm()
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        draftId: 'draft-1',
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      let draft: Record<string, unknown> | null = null
      await act(async () => {
        draft = await result.current.loadDraft()
      })

      expect(draft).toEqual({ name: 'saved-name', email: 'saved@test.com' })
    })

    it('возвращает null без draftId', async () => {
      const form = createMockForm()
      const config: FormAutosaveConfig = { endpoint: '/api/drafts' }

      const { result } = renderHook(() => useFormAutosave(form, config))

      let draft: Record<string, unknown> | null = null
      await act(async () => {
        draft = await result.current.loadDraft()
      })

      expect(draft).toBeNull()
    })
  })

  describe('localStorage fallback', () => {
    it('сохраняет в localStorage при ошибке сети', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const form = createMockForm({ name: 'offline-data' })
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        draftId: 'draft-1',
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('autosave:draft-1', JSON.stringify({ name: 'offline-data' }))
    })

    it('очищает localStorage при успешном сохранении', async () => {
      const form = createMockForm({ name: 'synced' })
      const config: FormAutosaveConfig = {
        endpoint: '/api/drafts',
        draftId: 'draft-1',
      }

      const { result } = renderHook(() => useFormAutosave(form, config))

      await act(async () => {
        await result.current.saveNow()
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('autosave:draft-1')
    })
  })
})
