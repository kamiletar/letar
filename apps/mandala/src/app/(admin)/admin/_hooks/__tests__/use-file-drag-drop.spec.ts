/**
 * Тесты для хука useFileDragDrop.
 */

import { act, renderHook } from '@testing-library/react'
import { useFileDragDrop } from '../use-file-drag-drop'

describe('useFileDragDrop', () => {
  const createMockFile = (type: string, name = 'test.jpg'): File => {
    return new File(['content'], name, { type })
  }

  const createMockDragEvent = (files: File[]): React.DragEvent => {
    return {
      preventDefault: vi.fn(),
      dataTransfer: { files },
    } as unknown as React.DragEvent
  }

  const createMockInputEvent = (files: File[]): React.ChangeEvent<HTMLInputElement> => {
    return {
      target: {
        files,
        value: 'C:\\fakepath\\test.jpg',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>
  }

  describe('начальное состояние', () => {
    it('должен начинать с isDragging=false', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      expect(result.current.isDragging).toBe(false)
    })

    it('должен начинать с isUploading=false', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      expect(result.current.isUploading).toBe(false)
    })

    it('должен начинать с error=null', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      expect(result.current.error).toBeNull()
    })
  })

  describe('drag события', () => {
    it('должен установить isDragging=true при onDragOver', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      const event = {
        preventDefault: vi.fn(),
      } as unknown as React.DragEvent

      act(() => {
        result.current.dragHandlers.onDragOver(event)
      })

      expect(result.current.isDragging).toBe(true)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('должен установить isDragging=false при onDragLeave', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      act(() => {
        result.current.dragHandlers.onDragOver({
          preventDefault: vi.fn(),
        } as unknown as React.DragEvent)
      })

      expect(result.current.isDragging).toBe(true)

      act(() => {
        result.current.dragHandlers.onDragLeave({
          preventDefault: vi.fn(),
        } as unknown as React.DragEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })

    it('не должен установить isDragging=true если disabled', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn(), disabled: true }))

      act(() => {
        result.current.dragHandlers.onDragOver({
          preventDefault: vi.fn(),
        } as unknown as React.DragEvent)
      })

      expect(result.current.isDragging).toBe(false)
    })
  })

  describe('onDrop', () => {
    it('должен вызвать onUpload при drop валидного файла', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).toHaveBeenCalledWith(file)
      expect(result.current.error).toBeNull()
    })

    it('должен показать ошибку для невалидного типа файла', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('application/pdf', 'document.pdf')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
      expect(result.current.error).toBe('Файл должен быть изображением')
    })

    it('должен показать ошибку для аудио типа', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'audio/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(result.current.error).toBe('Файл должен быть аудио')
    })

    it('должен загрузить только первый файл если multiple=false', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*', multiple: false }))

      const file1 = createMockFile('image/jpeg', 'file1.jpg')
      const file2 = createMockFile('image/jpeg', 'file2.jpg')
      const event = createMockDragEvent([file1, file2])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).toHaveBeenCalledTimes(1)
      expect(onUpload).toHaveBeenCalledWith(file1)
    })

    it('должен загрузить все файлы если multiple=true', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*', multiple: true }))

      const file1 = createMockFile('image/jpeg', 'file1.jpg')
      const file2 = createMockFile('image/jpeg', 'file2.jpg')
      const event = createMockDragEvent([file1, file2])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).toHaveBeenCalledTimes(2)
      expect(onUpload).toHaveBeenCalledWith(file1)
      expect(onUpload).toHaveBeenCalledWith(file2)
    })

    it('не должен обрабатывать drop если disabled', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload, disabled: true }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
    })

    it('не должен обрабатывать drop без файлов', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload }))

      const event = createMockDragEvent([])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
    })
  })

  describe('handleFileSelect', () => {
    it('должен вызвать onUpload при выборе файла', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockInputEvent([file])

      await act(async () => {
        result.current.handleFileSelect(event)
      })

      expect(onUpload).toHaveBeenCalledWith(file)
    })

    it('должен сбросить input value после выбора', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockInputEvent([file])

      await act(async () => {
        result.current.handleFileSelect(event)
      })

      expect(event.target.value).toBe('')
    })

    it('не должен обрабатывать если disabled', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload, disabled: true }))

      const file = createMockFile('image/jpeg')
      const event = createMockInputEvent([file])

      await act(async () => {
        result.current.handleFileSelect(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
    })

    it('не должен обрабатывать без файлов', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload }))

      const event = {
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>

      await act(async () => {
        result.current.handleFileSelect(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
    })
  })

  describe('состояние загрузки', () => {
    it('должен установить isUploading=true во время загрузки', async () => {
      let resolveUpload: () => void
      const onUpload = vi.fn().mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolveUpload = resolve
        })
      })

      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      // Начинаем загрузку
      act(() => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(result.current.isUploading).toBe(true)

      // Завершаем загрузку
      await act(async () => {
        resolveUpload?.()
      })

      expect(result.current.isUploading).toBe(false)
    })

    it('должен показать ошибку при неудачной загрузке', async () => {
      const onUpload = vi.fn().mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('должен очистить ошибку', async () => {
      const onUpload = vi.fn().mockRejectedValue(new Error('Error'))

      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/*' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(result.current.error).toBe('Error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('setIsUploading', () => {
    it('должен позволить установить isUploading вручную', () => {
      const { result } = renderHook(() => useFileDragDrop({ onUpload: vi.fn() }))

      act(() => {
        result.current.setIsUploading(true)
      })

      expect(result.current.isUploading).toBe(true)

      act(() => {
        result.current.setIsUploading(false)
      })

      expect(result.current.isUploading).toBe(false)
    })
  })

  describe('валидация типов', () => {
    it('должен принимать точное совпадение типа', async () => {
      const onUpload = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/png' }))

      const file = createMockFile('image/png')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
    })

    it('должен отклонить несовпадающий точный тип', async () => {
      const onUpload = vi.fn()
      const { result } = renderHook(() => useFileDragDrop({ onUpload, acceptTypes: 'image/png' }))

      const file = createMockFile('image/jpeg')
      const event = createMockDragEvent([file])

      await act(async () => {
        result.current.dragHandlers.onDrop(event)
      })

      expect(onUpload).not.toHaveBeenCalled()
      // acceptTypes начинается с 'image' → сообщение 'Файл должен быть изображением'
      expect(result.current.error).toBe('Файл должен быть изображением')
    })
  })
})
