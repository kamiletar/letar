/**
 * Тесты для хуков useImageUpload и useImagePreview.
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { useImagePreview, useImageUpload } from '../use-image-upload'

// Мок глобального fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useImageUpload', () => {
  const createMockFile = (name = 'test.jpg'): File => {
    return new File(['content'], name, { type: 'image/jpeg' })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('должен загрузить файл успешно', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'img-123', url: '/api/files/img-123' }),
      })

      const onSuccess = vi.fn()
      const { result } = renderHook(() => useImageUpload({ category: 'MANDALA', onSuccess }))

      const file = createMockFile()

      await act(async () => {
        await result.current.uploadFile(file)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })
      expect(onSuccess).toHaveBeenCalledWith({
        id: 'img-123',
        url: '/api/files/img-123',
      })
      expect(result.current.lastUpload).toEqual({
        id: 'img-123',
        url: '/api/files/img-123',
      })
    })

    it('должен вызвать onError при ошибке сервера', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Файл слишком большой' }),
      })

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      const file = createMockFile()
      let thrownError: Error | null = null

      await act(async () => {
        try {
          await result.current.uploadFile(file)
        } catch (e) {
          thrownError = e as Error
        }
      })

      expect(thrownError).not.toBeNull()
      expect(thrownError?.message).toBe('Файл слишком большой')
      expect(onError).toHaveBeenCalledWith('Файл слишком большой')
    })

    it('должен использовать дефолтное сообщение об ошибке', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      const file = createMockFile()
      let thrownError: Error | null = null

      await act(async () => {
        try {
          await result.current.uploadFile(file)
        } catch (e) {
          thrownError = e as Error
        }
      })

      expect(thrownError).not.toBeNull()
      expect(thrownError?.message).toBe('Ошибка загрузки')
      expect(onError).toHaveBeenCalledWith('Ошибка загрузки')
    })

    it('должен обработать сетевую ошибку', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const onError = vi.fn()
      const { result } = renderHook(() => useImageUpload({ onError }))

      const file = createMockFile()
      let thrownError: Error | null = null

      await act(async () => {
        try {
          await result.current.uploadFile(file)
        } catch (e) {
          thrownError = e as Error
        }
      })

      expect(thrownError).not.toBeNull()
      expect(thrownError?.message).toBe('Network error')
      expect(onError).toHaveBeenCalledWith('Network error')
    })

    it('должен передать категорию в FormData', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test', url: '/test' }),
      })

      const { result } = renderHook(() => useImageUpload({ category: 'PRODUCT' }))

      const file = createMockFile()

      await act(async () => {
        await result.current.uploadFile(file)
      })

      const call = mockFetch.mock.calls[0]
      const formData = call[1].body as FormData

      expect(formData.get('category')).toBe('PRODUCT')
      expect(formData.get('file')).toBe(file)
    })

    it('должен использовать категорию OTHER по умолчанию', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test', url: '/test' }),
      })

      const { result } = renderHook(() => useImageUpload({}))

      const file = createMockFile()

      await act(async () => {
        await result.current.uploadFile(file)
      })

      const call = mockFetch.mock.calls[0]
      const formData = call[1].body as FormData

      expect(formData.get('category')).toBe('OTHER')
    })
  })

  describe('lastUpload', () => {
    it('должен начинать с null', () => {
      const { result } = renderHook(() => useImageUpload({}))

      expect(result.current.lastUpload).toBeNull()
    })

    it('должен обновляться после успешной загрузки', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'uploaded-1', url: '/api/files/uploaded-1' }),
      })

      const { result } = renderHook(() => useImageUpload({}))

      expect(result.current.lastUpload).toBeNull()

      await act(async () => {
        await result.current.uploadFile(createMockFile())
      })

      expect(result.current.lastUpload).toEqual({
        id: 'uploaded-1',
        url: '/api/files/uploaded-1',
      })
    })
  })

  describe('интеграция с useFileDragDrop', () => {
    it('должен иметь dragHandlers', () => {
      const { result } = renderHook(() => useImageUpload({}))

      expect(result.current.dragHandlers).toBeDefined()
      expect(result.current.dragHandlers.onDragOver).toBeInstanceOf(Function)
      expect(result.current.dragHandlers.onDragLeave).toBeInstanceOf(Function)
      expect(result.current.dragHandlers.onDrop).toBeInstanceOf(Function)
    })

    it('должен иметь handleFileSelect', () => {
      const { result } = renderHook(() => useImageUpload({}))

      expect(result.current.handleFileSelect).toBeInstanceOf(Function)
    })

    it('должен иметь isDragging и isUploading', () => {
      const { result } = renderHook(() => useImageUpload({}))

      expect(result.current.isDragging).toBe(false)
      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('disabled', () => {
    it('должен передать disabled в useFileDragDrop', () => {
      const { result } = renderHook(() => useImageUpload({ disabled: true }))

      // При disabled=true, onDragOver не должен менять isDragging
      act(() => {
        result.current.dragHandlers.onDragOver({
          preventDefault: vi.fn(),
        } as unknown as React.DragEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })
  })
})

describe('useImagePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен вернуть null для пустого value', () => {
    const { result } = renderHook(() => useImagePreview({ value: '' }))

    expect(result.current.previewUrl).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('должен использовать value напрямую если это /api/files/ URL', () => {
    const { result } = renderHook(() => useImagePreview({ value: '/api/files/img-123' }))

    expect(result.current.previewUrl).toBe('/api/files/img-123')
    expect(result.current.isLoading).toBe(false)
  })

  it('должен использовать value напрямую если это http URL', () => {
    const { result } = renderHook(() => useImagePreview({ value: 'https://example.com/image.jpg' }))

    expect(result.current.previewUrl).toBe('https://example.com/image.jpg')
    expect(result.current.isLoading).toBe(false)
  })

  it('должен загрузить URL по Image ID', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ url: '/api/files/resolved-url' }),
    })

    const { result } = renderHook(() => useImagePreview({ value: 'cuid123456' }))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.previewUrl).toBe('/api/files/resolved-url')
    expect(mockFetch).toHaveBeenCalledWith('/api/images/cuid123456')
  })

  it('должен вернуть null при ошибке загрузки', async () => {
    mockFetch.mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useImagePreview({ value: 'invalid-id' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.previewUrl).toBeNull()
  })

  it('должен обновить previewUrl при изменении value', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ url: '/api/files/first' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ url: '/api/files/second' }),
      })

    const { result, rerender } = renderHook((props: { value: string }) => useImagePreview(props), {
      initialProps: { value: 'id-1' },
    })

    await waitFor(() => {
      expect(result.current.previewUrl).toBe('/api/files/first')
    })

    rerender({ value: 'id-2' })

    await waitFor(() => {
      expect(result.current.previewUrl).toBe('/api/files/second')
    })
  })

  it('должен сбросить previewUrl при пустом value', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ url: '/api/files/test' }),
    })

    const { result, rerender } = renderHook((props: { value: string }) => useImagePreview(props), {
      initialProps: { value: 'id-1' },
    })

    await waitFor(() => {
      expect(result.current.previewUrl).toBe('/api/files/test')
    })

    rerender({ value: '' })

    expect(result.current.previewUrl).toBeNull()
  })
})
