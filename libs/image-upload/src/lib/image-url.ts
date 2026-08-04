import type { ImageUrlResolver, UploadedImage, UploadResponseResolver } from './types'

/** Эндпоинт получения изображений по умолчанию. */
export const DEFAULT_IMAGE_ENDPOINT = '/api/images'

/**
 * Значение уже является ссылкой, а не идентификатором?
 *
 * Идентификаторы (cuid/uuid) никогда не начинаются со слэша или схемы,
 * поэтому проверка префикса надёжно разделяет два случая.
 */
export function isImageUrl(value: string): boolean {
  return (
    value.startsWith('/')
    || value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('data:')
    || value.startsWith('blob:')
  )
}

/**
 * Значение уже готовая ссылка — отдать как есть.
 *
 * Схема «файл на диске»: приложение хранит в поле сам URL
 * (`/api/files/houses/1.jpg`), отдельной модели `Image` нет.
 *
 * @example
 * ```tsx
 * <ImageUploadField resolveImageUrl={createDirectUrlResolver()} />
 * ```
 */
export function createDirectUrlResolver(): ImageUrlResolver {
  return (value) => value || null
}

/**
 * Ссылка собирается из идентификатора по шаблону `<endpoint>/<id>`.
 *
 * Схема «Image в БД», где эндпоинт отдаёт сами байты картинки. Поведение по
 * умолчанию — оно же было единственным до появления резолверов.
 */
export function createEndpointUrlResolver(endpoint: string = DEFAULT_IMAGE_ENDPOINT): ImageUrlResolver {
  return (value) => {
    if (!value) {
      return null
    }
    // Готовую ссылку не трогаем — иначе получится `/api/images//api/files/x`
    return isImageUrl(value) ? value : `${endpoint}/${value}`
  }
}

/** Опции {@link createMetadataUrlResolver}. */
export interface MetadataUrlResolverOptions {
  /**
   * Эндпоинт метаданных
   * @default '/api/images'
   */
  endpoint?: string
  /**
   * Поле ответа со ссылкой
   * @default 'url'
   */
  urlField?: string
}

/**
 * Ссылка запрашивается у эндпоинта метаданных: `GET <endpoint>/<id>` → `{ url }`.
 *
 * Схема «Image в БД», где `<endpoint>/<id>` отдаёт **JSON с описанием**, а сами
 * байты лежат по другому адресу. Так устроена mandala: `/api/images/<id>`
 * возвращает `{ id, url, mimeType, ... }`, а картинка живёт на `/api/files/<path>`.
 * Подставить `/api/images/<id>` в `<img src>` в такой схеме нельзя.
 */
export function createMetadataUrlResolver(options: MetadataUrlResolverOptions = {}): ImageUrlResolver {
  const { endpoint = DEFAULT_IMAGE_ENDPOINT, urlField = 'url' } = options

  return async (value) => {
    if (!value) {
      return null
    }

    // Готовая ссылка не требует похода на сервер
    if (isImageUrl(value)) {
      return value
    }

    const response = await fetch(`${endpoint}/${value}`)
    const data = (await response.json()) as Record<string, unknown>
    const url = data[urlField]

    return typeof url === 'string' ? url : null
  }
}

/** Опции {@link createUploadResponseResolver}. */
export interface UploadResponseResolverOptions {
  /**
   * Эндпоинт, из которого собирается ссылка, если сервер её не вернул
   * @default '/api/images'
   */
  imageEndpoint?: string
  /**
   * Поля ответа, в которых искать идентификатор
   * @default ['id', 'imageId']
   */
  idFields?: string[]
  /**
   * Поле ответа со ссылкой
   * @default 'url'
   */
  urlField?: string
}

/**
 * Резолвер ответа эндпоинта загрузки по умолчанию.
 *
 * Понимает обе схемы:
 * - `{ url }` — сервер сам вернул ссылку (файл на диске), она и используется;
 * - `{ id }` — ссылка собирается как `<imageEndpoint>/<id>`.
 *
 * Если сервер вернул и то и другое, ссылка из ответа приоритетнее шаблона.
 */
export function createUploadResponseResolver(options: UploadResponseResolverOptions = {}): UploadResponseResolver {
  const { imageEndpoint = DEFAULT_IMAGE_ENDPOINT, idFields = ['id', 'imageId'], urlField = 'url' } = options

  return (data, file): UploadedImage => {
    const idField = idFields.find((field) => typeof data[field] === 'string' && data[field])
    const id = idField ? (data[idField] as string) : ''

    const rawUrl = data[urlField]
    const url = typeof rawUrl === 'string' && rawUrl ? rawUrl : id ? `${imageEndpoint}/${id}` : ''

    if (!url) {
      throw new Error('Ответ загрузки не содержит ни идентификатора, ни ссылки на изображение')
    }

    const filename = typeof data.filename === 'string' ? data.filename : file.name

    return { id, url, filename }
  }
}
