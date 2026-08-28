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
 * Проверяет тип и размер файла, не оборачивая причину в `NextResponse`.
 *
 * Общее ядро для `validateFile` (один файл → готовый `NextResponse`) и
 * `extractAndValidateFiles` (много файлов → список причин пропуска для
 * вызывающего кода, без множества независимых `NextResponse`).
 */
function checkFile(file: File, options: FileValidationOptions): { valid: true } | { valid: false; reason: string } {
  const { allowedTypes } = options
  if (allowedTypes) {
    const isAllowed = Array.isArray(allowedTypes)
      ? allowedTypes.includes(file.type)
      : file.type.startsWith(allowedTypes)

    if (!isAllowed) {
      const expected = Array.isArray(allowedTypes) ? allowedTypes.join(', ') : allowedTypes + '*'
      return { valid: false, reason: `Недопустимый тип файла: ${file.type}. Ожидается: ${expected}` }
    }
  }

  if (file.size > options.maxSize) {
    const maxMB = (options.maxSize / 1024 / 1024).toFixed(0)
    const fileMB = (file.size / 1024 / 1024).toFixed(2)
    return { valid: false, reason: `Размер файла (${fileMB}MB) превышает максимум ${maxMB}MB` }
  }

  return { valid: true }
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

  const check = checkFile(file, options)
  if (!check.valid) {
    return { valid: false, error: NextResponse.json({ error: check.reason }, { status: 400 }) }
  }

  return { valid: true }
}

/**
 * Извлекает файл из FormData и валидирует.
 *
 * `formData` в успешном результате возвращается наряду с `file` — часть роутов
 * (grandslamcup) читает из неё дополнительные поля формы тем же вызовом, без
 * повторного `request.formData()` (второй вызов на уже прочитанном `Request` бросает).
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
  options: FileValidationOptions,
): Promise<
  { file: File; formData: FormData; error?: never } | { file?: never; formData?: never; error: NextResponse }
> {
  try {
    const formData = await request.formData()
    const file = formData.get(fieldName) as File | null

    const validation = validateFile(file, options)
    if (!validation.valid) {
      // Когда valid=false, error всегда определён
      return { error: validation.error as NextResponse }
    }

    // Когда validation прошла, file гарантированно существует
    return { file: file as File, formData }
  } catch {
    return {
      error: NextResponse.json({ error: 'Ошибка при разборе данных формы' }, { status: 400 }),
    }
  }
}

/** Причина, по которой один из файлов в `extractAndValidateFiles` не прошёл валидацию. */
export interface FileValidationFailure {
  /** Позиция в списке `formData.getAll(fieldName)` */
  index: number
  /** Имя файла (или строковое представление значения, если это не File) */
  name: string
  reason: string
}

/**
 * Извлекает несколько файлов из FormData (`formData.getAll(fieldName)`) и валидирует
 * каждый по отдельности.
 *
 * В отличие от `extractAndValidateFile`, невалидные файлы не прерывают всю операцию —
 * они попадают в `failures` с причиной, а обработка продолжается для остальных.
 * Вызывающий код сам решает, что делать со `failures` (отклонить весь запрос, показать
 * пользователю частичный успех, залогировать и пропустить).
 *
 * @example
 * ```ts
 * const { files, failures, error } = await extractAndValidateFiles(request, 'files', {
 *   maxSize: 5 * 1024 * 1024,
 *   allowedTypes: 'image/',
 * })
 * if (error) return error
 * if (failures.length) console.warn('Пропущены файлы:', failures)
 * // files: File[] — только прошедшие валидацию
 * ```
 */
export async function extractAndValidateFiles(
  request: Request,
  fieldName: string,
  options: FileValidationOptions,
): Promise<
  | { files: File[]; formData: FormData; failures: FileValidationFailure[]; error?: never }
  | { files?: never; formData?: never; failures?: never; error: NextResponse }
> {
  try {
    const formData = await request.formData()
    const entries = formData.getAll(fieldName)

    const files: File[] = []
    const failures: FileValidationFailure[] = []

    entries.forEach((entry, index) => {
      if (!(entry instanceof File)) {
        failures.push({ index, name: String(entry), reason: 'Значение не является файлом' })
        return
      }

      const check = checkFile(entry, options)
      if (!check.valid) {
        failures.push({ index, name: entry.name, reason: check.reason })
        return
      }

      files.push(entry)
    })

    return { files, formData, failures }
  } catch {
    return {
      error: NextResponse.json({ error: 'Ошибка при разборе данных формы' }, { status: 400 }),
    }
  }
}
