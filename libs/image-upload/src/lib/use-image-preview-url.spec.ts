/**
 * Тесты для хука useImagePreviewUrl.
 *
 * Обобщение хука useImagePreview из apps/mandala (2026-08-04): там резолвер
 * метаданных был зашит в хук, здесь он подключается опцией.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { createMetadataUrlResolver } from './image-url'
import { useImagePreviewUrl } from './use-image-preview-url'

const mockFetch = vi.fn()

describe('useImagePreviewUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  describe('резолвер по умолчанию', () => {
    it('должен вернуть null для пустого value', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: '' }))

      expect(result.current.previewUrl).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('должен вернуть null для undefined', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: undefined }))

      expect(result.current.previewUrl).toBeNull()
    })

    it('собирает ссылку из идентификатора синхронно, без состояния загрузки', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: 'img-123' }))

      expect(result.current.previewUrl).toBe('/api/images/img-123')
      expect(result.current.isLoading).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('учитывает свой imageEndpoint', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: 'img-123', imageEndpoint: '/media' }))

      expect(result.current.previewUrl).toBe('/media/img-123')
    })

    it('должен использовать value напрямую, если это уже ссылка', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: '/api/files/img-123' }))

      expect(result.current.previewUrl).toBe('/api/files/img-123')
      expect(result.current.isLoading).toBe(false)
    })

    it('должен использовать value напрямую, если это http URL', () => {
      const { result } = renderHook(() => useImagePreviewUrl({ value: 'https://example.com/image.jpg' }))

      expect(result.current.previewUrl).toBe('https://example.com/image.jpg')
    })
  })

  describe('резолвер метаданных', () => {
    const resolveImageUrl = createMetadataUrlResolver()

    it('должен загрузить URL по Image ID', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ url: '/api/files/resolved-url' }) })

      const { result } = renderHook(() => useImagePreviewUrl({ value: 'cuid123456', resolveImageUrl }))

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.previewUrl).toBe('/api/files/resolved-url')
      expect(mockFetch).toHaveBeenCalledWith('/api/images/cuid123456')
    })

    it('должен вернуть null при ошибке загрузки', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'))

      const { result } = renderHook(() => useImagePreviewUrl({ value: 'invalid-id', resolveImageUrl }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.previewUrl).toBeNull()
    })

    it('должен обновить previewUrl при изменении value', async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ url: '/api/files/first' }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ url: '/api/files/second' }) })

      const { result, rerender } = renderHook(
        (props: { value: string }) => useImagePreviewUrl({ ...props, resolveImageUrl }),
        {
          initialProps: { value: 'id-1' },
        },
      )

      await waitFor(() => {
        expect(result.current.previewUrl).toBe('/api/files/first')
      })

      rerender({ value: 'id-2' })

      await waitFor(() => {
        expect(result.current.previewUrl).toBe('/api/files/second')
      })
    })

    it('должен сбросить previewUrl при пустом value', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ url: '/api/files/test' }) })

      const { result, rerender } = renderHook(
        (props: { value: string }) => useImagePreviewUrl({ ...props, resolveImageUrl }),
        {
          initialProps: { value: 'id-1' },
        },
      )

      await waitFor(() => {
        expect(result.current.previewUrl).toBe('/api/files/test')
      })

      rerender({ value: '' })

      expect(result.current.previewUrl).toBeNull()
    })

    it('не перезапрашивает ссылку из-за inline-стрелки в пропсах', async () => {
      mockFetch.mockResolvedValue({ json: () => Promise.resolve({ url: '/api/files/stable' }) })

      const { result, rerender } = renderHook(() =>
        useImagePreviewUrl({ value: 'id-1', resolveImageUrl: createMetadataUrlResolver() })
      )

      await waitFor(() => {
        expect(result.current.previewUrl).toBe('/api/files/stable')
      })

      rerender()
      rerender()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('свой резолвер', () => {
    it('поддерживает синхронный резолвер приложения', () => {
      const { result } = renderHook(() =>
        useImagePreviewUrl({
          value: 'houses/1.jpg',
          resolveImageUrl: (value) => `https://cdn.example.com/${value}`,
        })
      )

      expect(result.current.previewUrl).toBe('https://cdn.example.com/houses/1.jpg')
      expect(result.current.isLoading).toBe(false)
    })
  })
})
