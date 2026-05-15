/**
 * Утилиты валидации файлов для upload routes.
 * Паттерн аналогичен driving-school.
 */

import { NextResponse } from 'next/server'

export interface FileValidationOptions {
  /** Максимальный размер файла в байтах */
  maxSize: number
  /** Допустимые MIME-типы или префикс ('image/') */
  allowedTypes?: string[] | string
}

/**
 * Извлекает файл из FormData и валидирует
 */
export async function extractAndValidateFile(
  request: Request,
  fieldName: string,
  options: FileValidationOptions
): Promise<
  { file: File; formData: FormData; error?: never } | { file?: never; formData?: never; error: NextResponse }
> {
  try {
    const formData = await request.formData()
    const file = formData.get(fieldName) as File | null

    if (!file) {
      return { error: NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 }) }
    }

    // Проверка типа
    const { allowedTypes } = options
    if (allowedTypes) {
      const isAllowed = Array.isArray(allowedTypes)
        ? allowedTypes.includes(file.type)
        : file.type.startsWith(allowedTypes)

      if (!isAllowed) {
        return { error: NextResponse.json({ error: `Недопустимый тип файла: ${file.type}` }, { status: 400 }) }
      }
    }

    // Проверка размера
    if (file.size > options.maxSize) {
      const maxMB = (options.maxSize / 1024 / 1024).toFixed(0)
      const fileMB = (file.size / 1024 / 1024).toFixed(2)
      return {
        error: NextResponse.json(
          { error: `Размер файла (${fileMB}MB) превышает максимум ${maxMB}MB` },
          { status: 400 }
        ),
      }
    }

    return { file, formData }
  } catch {
    return { error: NextResponse.json({ error: 'Ошибка при разборе данных формы' }, { status: 400 }) }
  }
}
