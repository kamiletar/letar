/**
 * Утилиты валидации файлов для upload routes
 */

import { NextResponse } from 'next/server'

export interface FileValidationOptions {
  /** Максимальный размер файла в байтах */
  maxSize: number
  /** Допустимые MIME-типы (например ['image/jpeg', 'image/png']) или префикс ('image/') */
  allowedTypes?: string[] | string
}

export interface FileValidationResult {
  valid: boolean
  error?: NextResponse
}

/**
 * Валидирует файл из FormData
 *
 * @example
 * ```ts
 * const validation = validateFile(file, { maxSize: 5 * 1024 * 1024, allowedTypes: 'image/' })
 * if (!validation.valid) return validation.error
 * ```
 */
export function validateFile(file: File | null, options: FileValidationOptions): FileValidationResult {
  if (!file) {
    return {
      valid: false,
      error: NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 }),
    }
  }

  // Проверка типа файла
  const { allowedTypes } = options
  if (allowedTypes) {
    const isAllowed = Array.isArray(allowedTypes)
      ? allowedTypes.includes(file.type)
      : file.type.startsWith(allowedTypes)

    if (!isAllowed) {
      const expected = Array.isArray(allowedTypes) ? allowedTypes.join(', ') : allowedTypes + '*'
      return {
        valid: false,
        error: NextResponse.json(
          { error: `Недопустимый тип файла: ${file.type}. Ожидается: ${expected}` },
          { status: 400 }
        ),
      }
    }
  }

  // Проверка размера файла
  if (file.size > options.maxSize) {
    const maxMB = (options.maxSize / 1024 / 1024).toFixed(0)
    const fileMB = (file.size / 1024 / 1024).toFixed(2)
    return {
      valid: false,
      error: NextResponse.json({ error: `Размер файла (${fileMB}MB) превышает максимум ${maxMB}MB` }, { status: 400 }),
    }
  }

  return { valid: true }
}

/**
 * Извлекает файл из FormData и валидирует
 *
 * @example
 * ```ts
 * const { file, error } = await extractAndValidateFile(request, 'file', { maxSize: 5 * 1024 * 1024 })
 * if (error) return error
 * ```
 */
export async function extractAndValidateFile(
  request: Request,
  fieldName: string,
  options: FileValidationOptions
): Promise<{ file: File; error?: never } | { file?: never; error: NextResponse }> {
  try {
    const formData = await request.formData()
    const file = formData.get(fieldName) as File | null

    const validation = validateFile(file, options)
    if (!validation.valid) {
      // Когда valid=false, error всегда определён
      return { error: validation.error as NextResponse }
    }

    // Когда validation прошла, file гарантированно существует
    return { file: file as File }
  } catch {
    return {
      error: NextResponse.json({ error: 'Ошибка при разборе данных формы' }, { status: 400 }),
    }
  }
}
