/**
 * Excel/CSV парсер для импорта данных
 *
 * Поддерживает:
 * - Парсинг .xlsx и .csv файлов
 * - Автоопределение и ручной маппинг колонок
 * - Валидация данных (email, phone, дубликаты)
 */

import * as XLSX from 'xlsx'

/**
 * Маппинг колонок CSV/Excel на поля модели
 */
export interface ColumnMapping {
  name?: string
  email?: string
  phone?: string
  role?: string
  [key: string]: string | undefined
}

/**
 * Ошибка валидации строки
 */
export interface ValidationError {
  row: number
  field: string
  message: string
  value?: unknown
}

/**
 * Опции парсинга
 */
export interface ParseOptions {
  /** Ручной маппинг колонок (если не задан, используется автоопределение) */
  mapping?: ColumnMapping
  /** Список обязательных колонок */
  requiredColumns?: string[]
  /** Включить валидацию данных */
  validate?: boolean
}

/**
 * Результат успешного парсинга
 */
export interface ParseSuccess {
  success: true
  /** Массив распарсенных строк */
  rows: Record<string, unknown>[]
  /** Заголовки колонок из файла */
  headers: string[]
  /** Обнаруженный маппинг колонок */
  detectedMapping?: ColumnMapping
  /** Предупреждения (не критичные) */
  warnings?: string[]
  /** Ошибки валидации строк */
  validationErrors?: ValidationError[]
}

/**
 * Результат неудачного парсинга
 */
export interface ParseFailure {
  success: false
  /** Текст ошибки */
  error: string
}

/**
 * Результат парсинга файла
 */
export type ParseResult = ParseSuccess | ParseFailure

/**
 * Список известных колонок для автоопределения
 */
const KNOWN_COLUMNS: Record<string, string[]> = {
  name: ['name', 'fullname', 'full_name', 'имя', 'фио'],
  email: ['email', 'e-mail', 'emailaddress', 'email_address', 'почта'],
  phone: ['phone', 'phonenumber', 'phone_number', 'телефон', 'номер'],
  role: ['role', 'роль'],
}

/**
 * Валидные роли пользователей
 */
const VALID_ROLES = ['STUDENT', 'INSTRUCTOR', 'SCHOOL_ADMIN', 'OWNER']

/**
 * Парсит Excel/CSV файл и возвращает данные
 *
 * @param buffer - Буфер содержимого файла
 * @param filename - Имя файла (для определения типа)
 * @param options - Опции парсинга
 * @returns Результат парсинга с данными или ошибкой
 */
export async function parseExcelFile(
  buffer: Buffer,
  filename: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  try {
    // Проверка пустого файла
    if (buffer.length === 0) {
      return { success: false, error: 'Файл пуст' }
    }

    // Определение типа файла
    const extension = filename.split('.').pop()?.toLowerCase()
    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      return { success: false, error: 'Неподдерживаемый формат файла. Поддерживаются: .xlsx, .xls, .csv' }
    }

    let workbook: XLSX.WorkBook

    // Парсинг CSV с учётом BOM
    if (extension === 'csv') {
      let content = buffer.toString('utf-8')

      // Удаление UTF-8 BOM если присутствует
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.substring(1)
      }

      workbook = XLSX.read(content, { type: 'string' })
    } else {
      // Парсинг XLSX/XLS
      workbook = XLSX.read(buffer, { type: 'buffer' })
    }

    // Получение первого листа
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return { success: false, error: 'Файл не содержит листов' }
    }

    const worksheet = workbook.Sheets[firstSheetName]
    if (!worksheet) {
      return { success: false, error: 'Не удалось прочитать лист' }
    }

    // Конвертация в JSON
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

    if (data.length === 0) {
      return { success: false, error: 'Файл не содержит данных' }
    }

    // Извлечение заголовков
    const headers = Object.keys(data[0] || {})

    // Предупреждения
    const warnings: string[] = []

    // Проверка на большой файл
    if (data.length > 1000) {
      warnings.push(`Файл содержит более 1000 строк (${data.length}). Импорт может занять время.`)
    }

    // Автоопределение или применение ручного маппинга
    let mapping: ColumnMapping = options.mapping || {}
    const detectedMapping: ColumnMapping = {}

    if (!options.mapping) {
      // Автоопределение колонок
      for (const [field, aliases] of Object.entries(KNOWN_COLUMNS)) {
        const found = headers.find((h) => aliases.includes(h.toLowerCase()))
        if (found) {
          detectedMapping[field] = found
          mapping[field] = found
        }
      }
    } else {
      // Используем ручной маппинг
      mapping = options.mapping
    }

    // Валидация обязательных колонок
    if (options.requiredColumns) {
      const missingColumns = options.requiredColumns.filter((col) => !mapping[col])
      if (missingColumns.length > 0) {
        return {
          success: false,
          error: `Отсутствуют обязательные колонки: ${missingColumns.join(', ')}`,
        }
      }
    }

    // Предупреждение о неизвестных колонках
    const knownHeaders = Object.values(mapping)
    const unknownHeaders = headers.filter((h) => !knownHeaders.includes(h))
    if (unknownHeaders.length > 0) {
      unknownHeaders.forEach((h) => warnings.push(`Неизвестная колонка: ${h}`))
    }

    // Валидация данных
    const validationErrors: ValidationError[] = []

    if (options.validate) {
      const seenEmails = new Set<string>()
      const seenPhones = new Set<string>()

      data.forEach((row, index) => {
        // Получаем значения через маппинг
        const nameColumn = mapping.name
        const emailColumn = mapping.email
        const phoneColumn = mapping.phone
        const roleColumn = mapping.role

        const name = nameColumn ? (row[nameColumn] as string) : undefined
        const email = emailColumn ? (row[emailColumn] as string) : undefined
        const phone = phoneColumn ? (row[phoneColumn] as string) : undefined
        const role = roleColumn ? (row[roleColumn] as string) : undefined

        // Валидация имени
        if (!name || name.trim() === '') {
          validationErrors.push({
            row: index,
            field: 'name',
            message: 'Имя обязательно для заполнения',
            value: name,
          })
        }

        // Валидация email
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            validationErrors.push({
              row: index,
              field: 'email',
              message: 'Неверный формат email адреса',
              value: email,
            })
          } else if (seenEmails.has(email)) {
            validationErrors.push({
              row: index,
              field: 'email',
              message: `Дубликат email: ${email}`,
              value: email,
            })
          } else {
            seenEmails.add(email)
          }
        }

        // Валидация телефона
        if (phone) {
          const phoneRegex = /^\+7\d{10}$/
          if (!phoneRegex.test(phone)) {
            validationErrors.push({
              row: index,
              field: 'phone',
              message: 'Неверный формат телефона. Ожидается: +7XXXXXXXXXX',
              value: phone,
            })
          } else if (seenPhones.has(phone)) {
            validationErrors.push({
              row: index,
              field: 'phone',
              message: `Дубликат телефона: ${phone}`,
              value: phone,
            })
          } else {
            seenPhones.add(phone)
          }
        }

        // Валидация роли
        if (role && !VALID_ROLES.includes(role)) {
          validationErrors.push({
            row: index,
            field: 'role',
            message: `Недопустимая роль: ${role}. Допустимые значения: ${VALID_ROLES.join(', ')}`,
            value: role,
          })
        }
      })
    }

    // Маппинг данных на нужные поля
    const mappedRows = data.map((row) => {
      const mapped: Record<string, unknown> = {}
      for (const [field, column] of Object.entries(mapping)) {
        if (column && row[column] !== undefined) {
          let value = row[column]

          // Преобразование phone в строку если это число
          if (field === 'phone' && typeof value === 'number') {
            value = `+${value}`
          }

          mapped[field] = value
        }
      }
      return mapped
    })

    return {
      success: true,
      rows: mappedRows,
      headers,
      detectedMapping: Object.keys(detectedMapping).length > 0 ? detectedMapping : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: `Ошибка парсинга файла: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
