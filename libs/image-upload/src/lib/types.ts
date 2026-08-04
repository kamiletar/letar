/**
 * Общие типы библиотеки загрузки изображений.
 *
 * Вынесены в отдельный модуль, чтобы резолверы URL (`image-url.ts`) и хук
 * загрузки (`use-image-upload.ts`) могли ссылаться друг на друга без цикла.
 */

/**
 * Категории, которые встречаются чаще всего.
 *
 * Список намеренно открыт: приложение вправе передать любую свою строку
 * (`'HOUSE'`, `'MANDALA'`, `'PASSPORT'`), а подсказки IDE подставляют
 * известные значения. Предметная область конкретного приложения в этот
 * union не добавляется.
 */
export type KnownImageCategory = 'PRODUCT' | 'THUMBNAIL' | 'AVATAR' | 'OTHER'

/** Категория изображения — известная либо произвольная строка приложения. */
export type ImageCategory = KnownImageCategory | (string & Record<never, never>)

/** Статус файла в очереди загрузки. */
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

/** Успешно загруженное изображение. */
export interface UploadedImage {
  /** Идентификатор изображения на стороне сервера */
  id: string
  /** Готовая ссылка для отображения */
  url: string
  /** Имя исходного файла */
  filename?: string
}

/** Файл в очереди загрузки. */
export interface UploadingFile {
  /** Локальный ID для отслеживания до появления серверного */
  localId: string
  /** Исходный файл */
  file: File
  /** Blob-URL для мгновенного локального превью */
  previewUrl: string
  /** Статус загрузки */
  status: UploadStatus
  /** ID изображения после успешной загрузки */
  imageId?: string
  /** Ссылка на изображение после успешной загрузки */
  url?: string
  /** Текст ошибки */
  error?: string
}

/**
 * Превращает сохранённое значение (ID или уже готовую ссылку) в URL для `<img>`.
 *
 * Синхронный результат применяется сразу, без промежуточного состояния
 * загрузки; промис — с показом спиннера. `null` означает «показывать нечего».
 */
export type ImageUrlResolver = (value: string) => string | null | Promise<string | null>

/**
 * Превращает тело ответа эндпоинта загрузки в {@link UploadedImage}.
 *
 * Позволяет подключить сервер с любой схемой ответа, не меняя библиотеку.
 */
export type UploadResponseResolver = (data: Record<string, unknown>, file: File) => UploadedImage
