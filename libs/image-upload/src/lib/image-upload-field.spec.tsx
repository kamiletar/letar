/**
 * Тесты для ImageUploadField.
 *
 * Покрывают регрессию из d0011d8e: после успешной загрузки превью должно
 * показывать ссылку из ответа сервера сразу, не дожидаясь резолвера.
 */

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { ImageUploadField, type ImageUploadFieldProps } from './image-upload-field'

/** Компонент — контролируемый: хосту нужен свой стейт, иначе value никогда не обновится. */
function Host(props: Omit<ImageUploadFieldProps, 'value' | 'onChange'> & { initialValue?: string | null }) {
  const [value, setValue] = useState<string | null>(props.initialValue ?? null)
  return (
    <ChakraProvider value={defaultSystem}>
      <ImageUploadField {...props} value={value} onChange={setValue} />
    </ChakraProvider>
  )
}

const mockFetch = vi.fn()

const createMockFile = (name = 'test.jpg', type = 'image/jpeg'): File => new File(['content'], name, { type })

const okResponse = (body: Record<string, unknown>) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
})

function uploadFile(container: HTMLElement, file: File = createMockFile()) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

describe('ImageUploadField', () => {
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

  it('показывает превью сразу после загрузки, не дожидаясь резолвера', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/api/files/img-1.jpg' }))

    // Резолвер, который никогда не разрешается — имитирует «отвалившийся» round-trip
    const resolveImageUrl = vi.fn(() => new Promise<string | null>(() => undefined))

    const { container } = render(<Host label="Аватар" resolveImageUrl={resolveImageUrl} />)

    uploadFile(container)

    await waitFor(() => {
      const img = screen.getByAltText('Аватар') as HTMLImageElement
      expect(img.src).toContain('/api/files/img-1.jpg')
    })

    // Показ превью не ждёт результата резолвера — он до сих пор не разрешился
    const img = screen.getByAltText('Аватар') as HTMLImageElement
    expect(img.src).toContain('/api/files/img-1.jpg')
  })

  it('переключается на resolveImageUrl, когда value меняется на другое значение извне', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/api/files/img-1.jpg' }))
    const resolveImageUrl = vi.fn((value: string) => `/resolved/${value}`)

    const { container, rerender } = render(<Host label="Аватар" resolveImageUrl={resolveImageUrl} />)

    uploadFile(container)

    await waitFor(() => {
      const img = screen.getByAltText('Аватар') as HTMLImageElement
      expect(img.src).toContain('/api/files/img-1.jpg')
    })

    // Форма открыта заново (новый инстанс) с другим значением — превью не должно залипнуть на старой ссылке
    rerender(<Host key="reopened" label="Аватар" resolveImageUrl={resolveImageUrl} initialValue="img-2" />)

    await waitFor(() => {
      const img = screen.getByAltText('Аватар') as HTMLImageElement
      expect(img.src).toContain('/resolved/img-2')
    })
  })

  it('сбрасывает just-uploaded ссылку при удалении', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 'img-1', url: '/api/files/img-1.jpg' }))

    const { container } = render(<Host label="Аватар" />)

    uploadFile(container)

    await waitFor(() => {
      expect(screen.getByAltText('Аватар')).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText('Удалить'))

    expect(screen.queryByAltText('Аватар')).toBeNull()
  })
})
