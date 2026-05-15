/**
 * Утилиты безопасности файлов.
 *
 * - Проверка MIME-типа по magic bytes (не по расширению)
 * - Удаление EXIF-метаданных через Canvas API
 * - Санитизация имени файла (защита от path traversal)
 */

// Сигнатуры файлов (magic bytes)
const MIME_SIGNATURES: Array<{ bytes: number[]; mime: string }> = [
  // Изображения
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // RIFF (WebP контейнер)
  // Документы
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  // Архивы
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' },
]

/**
 * Конфигурация безопасности файлов
 */
export interface FileSecurityConfig {
  /** Максимальный размер файла (строка: '10MB', '500KB' или число в байтах) */
  maxSize?: string | number
  /** Разрешённые MIME-типы (проверяются по magic bytes, не по расширению) */
  allowedTypes?: string[]
  /** Удалить EXIF-метаданные из изображений (Canvas re-encode) */
  stripMetadata?: boolean
  /** Переименовать файл (UUID, защита от path traversal) */
  renameFile?: boolean
}

/**
 * Результат проверки безопасности файла
 */
export interface FileSecurityResult {
  /** Файл прошёл проверку */
  valid: boolean
  /** Обработанный файл (может быть изменён: EXIF удалён, имя заменено) */
  file: File
  /** Причина отклонения */
  reason?: string
}

/**
 * Парсит строку размера файла в байты.
 *
 * @example parseFileSize('10MB') // 10485760
 * @example parseFileSize('500KB') // 512000
 * @example parseFileSize(1024) // 1024
 */
export function parseFileSize(size: string | number): number {
  if (typeof size === 'number') return size

  const match = size.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i)
  if (!match) {
    throw new Error(`Invalid file size format: "${size}". Use "10MB", "500KB", etc.`)
  }

  const value = Number.parseFloat(match[1])
  const unit = match[2].toUpperCase()

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }

  return Math.floor(value * multipliers[unit])
}

/**
 * Определяет MIME-тип файла по magic bytes (первые 8 байт).
 * Возвращает null если сигнатура не распознана.
 */
export async function detectMimeType(file: File): Promise<string | null> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  for (const sig of MIME_SIGNATURES) {
    if (sig.bytes.every((b, i) => bytes[i] === b)) {
      return sig.mime
    }
  }

  return null
}

/**
 * Проверяет MIME-тип файла по magic bytes.
 * Если тип не определён — проверяет по file.type (fallback на расширение).
 */
export async function validateMimeType(
  file: File,
  allowedTypes: string[]
): Promise<{ valid: boolean; detectedMime: string | null; reason?: string }> {
  const detectedMime = await detectMimeType(file)

  // Используем определённый MIME или file.type как fallback
  const mimeToCheck = detectedMime ?? file.type

  if (!mimeToCheck) {
    return { valid: false, detectedMime, reason: 'Unable to determine file type' }
  }

  // Проверяем с учётом wildcard (image/*)
  const isAllowed = allowedTypes.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const category = allowed.split('/')[0]
      return mimeToCheck.startsWith(`${category}/`)
    }
    return allowed === mimeToCheck
  })

  if (!isAllowed) {
    return {
      valid: false,
      detectedMime,
      reason: `File type "${mimeToCheck}" is not allowed. Allowed: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true, detectedMime }
}

/**
 * Удаляет EXIF-метаданные из изображения через Canvas re-encode.
 * Для не-изображений возвращает файл без изменений.
 */
export async function stripExifMetadata(file: File): Promise<File> {
  // Пропускаем не-изображения
  if (!file.type.startsWith('image/')) {
    return file
  }

  // SVG не содержит EXIF
  if (file.type === 'image/svg+xml') {
    return file
  }

  return new Promise<File>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(file) // Fallback — возвращаем как есть
        return
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      // Определяем формат вывода
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = outputType === 'image/jpeg' ? 0.92 : undefined

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name, { type: outputType, lastModified: Date.now() }))
        },
        outputType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // Fallback
    }

    img.src = url
  })
}

/**
 * Санитизирует имя файла — заменяет на UUID, сохраняя расширение.
 * Защита от path traversal (../../etc/passwd).
 */
export function sanitizeFileName(file: File): File {
  // Извлекаем только базовое имя без пути (защита от path traversal)
  const baseName = file.name.split(/[/\\]/).pop() ?? file.name
  const lastDot = baseName.lastIndexOf('.')
  const ext = lastDot > 0 ? baseName.slice(lastDot) : ''

  // Генерируем UUID-подобное имя
  const uuid = crypto.randomUUID()
  const safeName = `${uuid}${ext}`

  return new File([file], safeName, { type: file.type, lastModified: file.lastModified })
}

/**
 * Применяет все проверки безопасности к файлу.
 * Возвращает обработанный файл или причину отклонения.
 */
export async function processFileWithSecurity(file: File, config: FileSecurityConfig): Promise<FileSecurityResult> {
  // 1. Проверка размера
  if (config.maxSize) {
    const maxBytes = parseFileSize(config.maxSize)
    if (file.size > maxBytes) {
      return {
        valid: false,
        file,
        reason: `File size ${formatSize(file.size)} exceeds limit ${formatSize(maxBytes)}`,
      }
    }
  }

  // 2. Проверка MIME-типа
  if (config.allowedTypes) {
    const mimeResult = await validateMimeType(file, config.allowedTypes)
    if (!mimeResult.valid) {
      return { valid: false, file, reason: mimeResult.reason }
    }
  }

  let processedFile = file

  // 3. Удаление EXIF
  if (config.stripMetadata) {
    processedFile = await stripExifMetadata(processedFile)
  }

  // 4. Переименование
  if (config.renameFile) {
    processedFile = sanitizeFileName(processedFile)
  }

  return { valid: true, file: processedFile }
}

/**
 * Форматирует размер файла для отображения в сообщениях об ошибках.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
