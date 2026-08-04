/**
 * Тесты для хука useImageUpload.
 *
 * Основаны на тестах из apps/mandala (2026-08-04) и дополнены проверками
 * обобщённого контракта URL и состояния очереди.
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import type { DragEvent } from 'react'
import { useImageUpload } from './use-image-upload'

const mockFetch = vi.fn()

const createMockFile = (name = 'test.jpg', type = 'image/jpeg'): File => new File(['content'], name, { type })

const okResponse = (body: Record<string, unknown>) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
})

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    // jsdom не реализует Object URL — они нужны для локального превью
    vi.stubGlobal(
      'URL',
      Object.assign(globalThis.URL, {
        createObjectURL: vi.fn(() => 'blob:preview'),
        revokeObjectURL: vi.fn(),
      }),
    )
  })

  describe('upload', () => {
    it('должен загрузить файл успешно', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'img-123', url: '/api/files/img-123' }))

      const onUploadSuccess = vi.fn()
      const { result } = renderHook(() => useImageUpload({ category: 'MANDALA', onUploadSuccess }))

      const file = createMockFile()

      await act(async () => {
        await result.current.upload(file)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })
      expect(onUploadSuccess).toHaveBeenCalledWith({
        id: 'img-123',
        url: '/api/files/img-123',
        filename: 'test.jpg',
      })
      expect(result.current.lastUpload).toMatchObject({ id: 'img-123', url: '/api/files/img-123' })
    })

    it('должен передать категорию в FormData', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'test', url: '/test' }))

      const { result } = renderHook(() => useImageUpload({ category: 'PRODUCT' }))

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      const formData = mockFetch.mock.calls[0][1].body as FormData

      expect(formData.get('category')).toBe('PRODUCT')
      expect(formData.get('file')).toBeInstanceOf(File)
    })

    it('должен использовать категорию OTHER по умолчанию', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'test', url: '/test' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      const formData = mockFetch.mock.calls[0][1].body as FormData

      expect(formData.get('category')).toBe('OTHER')
    })

    it('должен вернуть null и записать ошибку сервера', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Файл слишком большой' }),
      })

      const onUploadError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onUploadError }))
      const file = createMockFile()

      let uploaded: unknown
      await act(async () => {
        uploaded = await result.current.upload(file)
      })

      expect(uploaded).toBeNull()
      expect(result.current.error).toBe('Файл слишком большой')
      expect(onUploadError).toHaveBeenCalledWith('Файл слишком большой', file)
    })

    it('должен использовать статус ответа, если сервер не прислал текст ошибки', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.error).toBe('Ошибка загрузки: 500')
    })

    it('должен обработать сетевую ошибку', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const onUploadError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onUploadError }))

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.error).toBe('Network error')
      expect(onUploadError).toHaveBeenCalledWith('Network error', expect.any(File))
    })

    it('помечает файл в очереди статусом error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.files).toHaveLength(1)
      expect(result.current.files[0]).toMatchObject({ status: 'error', error: 'Network error' })
    })
  })

  describe('контракт URL', () => {
    it('схема «файл на диске»: берёт url из ответа', async () => {
      mockFetch.mockResolvedValue(okResponse({ url: '/api/files/houses/1.jpg' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.lastUpload?.url).toBe('/api/files/houses/1.jpg')
    })

    it('схема «Image в БД»: собирает url из id', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'img-77' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.lastUpload?.url).toBe('/api/images/img-77')
    })

    it('учитывает свой imageEndpoint', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'img-77' }))

      const { result } = renderHook(() => useImageUpload({ imageEndpoint: '/media' }))

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.lastUpload?.url).toBe('/media/img-77')
    })

    it('позволяет подменить резолвер ответа целиком', async () => {
      mockFetch.mockResolvedValue(okResponse({ data: { key: 'houses/1.jpg' } }))

      const { result } = renderHook(() =>
        useImageUpload({
          resolveUploadResponse: (data) => {
            const key = (data.data as { key: string }).key
            return { id: key, url: `https://cdn.example.com/${key}` }
          },
        })
      )

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.lastUpload).toEqual({
        id: 'houses/1.jpg',
        url: 'https://cdn.example.com/houses/1.jpg',
      })
    })
  })

  describe('валидация', () => {
    it('отклоняет слишком большой файл, не обращаясь к серверу', async () => {
      const { result } = renderHook(() => useImageUpload({ maxSize: 10 }))

      const big = new File([new Uint8Array(100)], 'big.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.upload(big)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.error).toBe('Файл слишком большой (макс. 0MB)')
    })

    it('отклоняет неподдерживаемый формат', async () => {
      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile('doc.pdf', 'application/pdf'))
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.error).toBe('Неподдерживаемый формат файла')
    })
  })

  describe('uploadMany', () => {
    it('возвращает только успешно загруженные файлы', async () => {
      mockFetch
        .mockResolvedValueOnce(okResponse({ id: 'a', url: '/a.jpg' }))
        .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })

      const { result } = renderHook(() => useImageUpload())

      let uploaded: unknown[] = []
      await act(async () => {
        uploaded = await result.current.uploadMany([createMockFile('a.jpg'), createMockFile('b.jpg')])
      })

      expect(uploaded).toHaveLength(1)
      expect(uploaded[0]).toMatchObject({ id: 'a', url: '/a.jpg' })
    })

    it('держит isUploading до завершения ПОСЛЕДНЕГО файла', async () => {
      // Регрессия: раньше isUploading гас по завершении первого файла,
      // потому что каждый upload сбрасывал общий флаг в своём finally
      const pending: Array<(value: unknown) => void> = []
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            pending.push(resolve)
          }),
      )

      const { result } = renderHook(() => useImageUpload())

      let done!: Promise<unknown>
      act(() => {
        done = result.current.uploadMany([createMockFile('a.jpg'), createMockFile('b.jpg')])
      })

      await waitFor(() => expect(pending).toHaveLength(2))
      expect(result.current.isUploading).toBe(true)

      await act(async () => {
        pending[0](okResponse({ id: 'a', url: '/a.jpg' }))
      })

      expect(result.current.isUploading).toBe(true)

      await act(async () => {
        pending[1](okResponse({ id: 'b', url: '/b.jpg' }))
        await done
      })

      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('getUploadedImages', () => {
    it('отдаёт реальные ссылки, а не собранные по шаблону', async () => {
      // Регрессия: раньше метод игнорировал url из ответа и всегда
      // склеивал `/api/images/<id>` — в схеме «файл на диске» это битая ссылка
      mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/api/files/real.jpg' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.getUploadedImages()).toEqual([
        { id: 'img-1', url: '/api/files/real.jpg', filename: 'test.jpg' },
      ])
    })
  })

  describe('интеграция с drag-n-drop', () => {
    it('должен иметь dragHandlers', () => {
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.dragHandlers.onDragOver).toBeInstanceOf(Function)
      expect(result.current.dragHandlers.onDragLeave).toBeInstanceOf(Function)
      expect(result.current.dragHandlers.onDrop).toBeInstanceOf(Function)
    })

    it('должен иметь handleFileSelect', () => {
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.handleFileSelect).toBeInstanceOf(Function)
    })

    it('должен начинать с isDragging=false и isUploading=false', () => {
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.isDragging).toBe(false)
      expect(result.current.isUploading).toBe(false)
    })

    it('загружает файл, брошенный в зону', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'dropped', url: '/dropped.jpg' }))

      const { result } = renderHook(() => useImageUpload())

      const event = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [createMockFile()] },
      } as unknown as DragEvent

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      await waitFor(() => {
        expect(result.current.lastUpload).toMatchObject({ id: 'dropped' })
      })
    })

    it('не реагирует на drop, если disabled', async () => {
      const { result } = renderHook(() => useImageUpload({ disabled: true }))

      const event = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [createMockFile()] },
      } as unknown as DragEvent

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('clearError очищает ошибку', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      expect(result.current.error).toBe('Network error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('очередь файлов', () => {
    it('removeFile убирает файл и освобождает blob URL', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/a.jpg' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      const { localId } = result.current.files[0]

      act(() => {
        result.current.removeFile(localId)
      })

      expect(result.current.files).toHaveLength(0)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    })

    it('clearFiles очищает очередь', async () => {
      mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/a.jpg' }))

      const { result } = renderHook(() => useImageUpload())

      await act(async () => {
        await result.current.upload(createMockFile())
      })

      act(() => {
        result.current.clearFiles()
      })

      expect(result.current.files).toHaveLength(0)
    })
  })
})
