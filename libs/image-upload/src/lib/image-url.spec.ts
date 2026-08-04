/**
 * Тесты резолверов URL — они закрывают обе схемы хранения изображений:
 * «Image в БД» (ответ `{id}`) и «файл на диске» (ответ `{url}`).
 */

import {
  createDirectUrlResolver,
  createEndpointUrlResolver,
  createMetadataUrlResolver,
  createUploadResponseResolver,
  isImageUrl,
} from './image-url'

const createMockFile = (name = 'test.jpg'): File => new File(['content'], name, { type: 'image/jpeg' })

describe('isImageUrl', () => {
  it.each([
    '/api/files/a.jpg',
    'https://cdn.example.com/a.jpg',
    'http://localhost/a.jpg',
    'data:image/png;base64,AA',
    'blob:http://localhost/x',
  ])(
    'считает ссылкой %s',
    (value) => {
      expect(isImageUrl(value)).toBe(true)
    },
  )

  it.each(['cuid123456', 'abc-def', ''])('не считает ссылкой идентификатор %s', (value) => {
    expect(isImageUrl(value)).toBe(false)
  })
})

describe('createDirectUrlResolver', () => {
  it('возвращает значение как есть', () => {
    const resolve = createDirectUrlResolver()

    expect(resolve('/api/files/houses/1.jpg')).toBe('/api/files/houses/1.jpg')
  })

  it('возвращает null для пустого значения', () => {
    const resolve = createDirectUrlResolver()

    expect(resolve('')).toBeNull()
  })
})

describe('createEndpointUrlResolver', () => {
  it('собирает ссылку из идентификатора', () => {
    const resolve = createEndpointUrlResolver()

    expect(resolve('img-123')).toBe('/api/images/img-123')
  })

  it('учитывает свой эндпоинт', () => {
    const resolve = createEndpointUrlResolver('/media')

    expect(resolve('img-123')).toBe('/media/img-123')
  })

  it('не трогает значение, которое уже является ссылкой', () => {
    const resolve = createEndpointUrlResolver()

    expect(resolve('/api/files/a.jpg')).toBe('/api/files/a.jpg')
  })

  it('возвращает null для пустого значения', () => {
    const resolve = createEndpointUrlResolver()

    expect(resolve('')).toBeNull()
  })
})

describe('createMetadataUrlResolver', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  it('запрашивает метаданные и достаёт ссылку', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ url: '/api/files/resolved.jpg' }) })

    const resolve = createMetadataUrlResolver()

    await expect(resolve('cuid123456')).resolves.toBe('/api/files/resolved.jpg')
    expect(mockFetch).toHaveBeenCalledWith('/api/images/cuid123456')
  })

  it('не ходит на сервер, если значение уже ссылка', async () => {
    const resolve = createMetadataUrlResolver()

    await expect(resolve('/api/files/a.jpg')).resolves.toBe('/api/files/a.jpg')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('читает ссылку из указанного поля', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ href: '/api/files/b.jpg' }) })

    const resolve = createMetadataUrlResolver({ urlField: 'href' })

    await expect(resolve('cuid123456')).resolves.toBe('/api/files/b.jpg')
  })

  it('возвращает null, если ссылки в ответе нет', async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({ error: 'Не найдено' }) })

    const resolve = createMetadataUrlResolver()

    await expect(resolve('cuid123456')).resolves.toBeNull()
  })
})

describe('createUploadResponseResolver', () => {
  it('использует ссылку из ответа — схема «файл на диске»', () => {
    const resolve = createUploadResponseResolver()

    expect(resolve({ url: '/api/files/houses/1.jpg' }, createMockFile())).toEqual({
      id: '',
      url: '/api/files/houses/1.jpg',
      filename: 'test.jpg',
    })
  })

  it('собирает ссылку из идентификатора — схема «Image в БД»', () => {
    const resolve = createUploadResponseResolver()

    expect(resolve({ id: 'img-123' }, createMockFile())).toEqual({
      id: 'img-123',
      url: '/api/images/img-123',
      filename: 'test.jpg',
    })
  })

  it('ссылка из ответа приоритетнее шаблона', () => {
    const resolve = createUploadResponseResolver()

    expect(resolve({ id: 'img-123', url: '/api/files/real.jpg' }, createMockFile()).url).toBe('/api/files/real.jpg')
  })

  it('понимает поле imageId', () => {
    const resolve = createUploadResponseResolver()

    expect(resolve({ imageId: 'img-9' }, createMockFile())).toMatchObject({
      id: 'img-9',
      url: '/api/images/img-9',
    })
  })

  it('учитывает свой imageEndpoint', () => {
    const resolve = createUploadResponseResolver({ imageEndpoint: '/media' })

    expect(resolve({ id: 'img-1' }, createMockFile()).url).toBe('/media/img-1')
  })

  it('берёт filename из ответа, если сервер его прислал', () => {
    const resolve = createUploadResponseResolver()

    expect(resolve({ id: 'x', filename: 'server-name.webp' }, createMockFile()).filename).toBe('server-name.webp')
  })

  it('бросает понятную ошибку, если ответ пустой', () => {
    const resolve = createUploadResponseResolver()

    expect(() => resolve({}, createMockFile())).toThrow(/не содержит ни идентификатора, ни ссылки/)
  })
})
