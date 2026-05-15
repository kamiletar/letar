// Парсинг Excel файлов

import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import * as XLSX from 'xlsx'
import type { ColumnMapping, ImportDataType, ImportRow, ParsedRow, ParseResult, SystemField } from './types'
import { INSTRUCTOR_FIELDS, STUDENT_FIELDS } from './types'

// Валидные категории прав
const VALID_CATEGORIES: LicenseCategory[] = [
  'M',
  'A1',
  'A',
  'B1',
  'B',
  'C1',
  'C',
  'D1',
  'D',
  'BE',
  'CE',
  'C1E',
  'DE',
  'D1E',
  'Tm',
  'Tb',
]

// Парсинг Excel/CSV файла
export function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Получаем данные как массив массивов
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (data.length === 0) {
    return { headers: [], rows: [] }
  }

  // Первая строка — заголовки
  const headers = (data[0] as unknown as string[]).map((h) => String(h || '').trim())

  // Остальные строки — данные
  const rows = data.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    const rowArray = row as unknown as string[]
    headers.forEach((header, index) => {
      obj[header] = String(rowArray[index] || '').trim()
    })
    return obj
  })

  // Фильтруем пустые строки
  const nonEmptyRows = rows.filter((row) => Object.values(row).some((v) => v !== ''))

  return { headers, rows: nonEmptyRows }
}

// Получение полей для типа данных
export function getFieldsForType(dataType: ImportDataType): SystemField[] {
  return dataType === 'students' ? STUDENT_FIELDS : INSTRUCTOR_FIELDS
}

// Автоматическое определение маппинга колонок
export function autoDetectMapping(headers: string[], dataType: ImportDataType): ColumnMapping[] {
  const fields = getFieldsForType(dataType)
  const mappings: ColumnMapping[] = []

  // Словарь синонимов для полей
  const synonyms: Record<string, string[]> = {
    name: ['имя', 'фио', 'name', 'full name', 'fullname', 'ученик', 'инструктор', 'преподаватель'],
    email: ['email', 'почта', 'e-mail', 'электронная почта', 'mail'],
    phone: ['телефон', 'phone', 'тел', 'тел.', 'мобильный', 'mobile'],
    category: ['категория', 'category', 'права', 'кат'],
    categories: ['категории', 'categories', 'права', 'кат'],
    bio: ['описание', 'bio', 'biography', 'о себе', 'about'],
  }

  for (const field of fields) {
    const fieldSynonyms = synonyms[field.key] || [field.key]

    // Ищем совпадение в заголовках
    const matchedHeader = headers.find((header) => {
      const headerLower = header.toLowerCase()
      return fieldSynonyms.some(
        (syn) =>
          headerLower === syn.toLowerCase() ||
          headerLower.includes(syn.toLowerCase()) ||
          syn.toLowerCase().includes(headerLower)
      )
    })

    if (matchedHeader) {
      mappings.push({
        fileColumn: matchedHeader,
        systemField: field.key,
      })
    }
  }

  return mappings
}

// Валидация email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Нормализация телефона
function normalizePhone(phone: string): string {
  // Убираем всё кроме цифр
  const digits = phone.replace(/\D/g, '')

  // Если начинается с 8, меняем на 7
  if (digits.startsWith('8') && digits.length === 11) {
    return '+7' + digits.slice(1)
  }

  // Если 10 цифр (без кода страны), добавляем +7
  if (digits.length === 10) {
    return '+7' + digits
  }

  // Если 11 цифр и начинается с 7
  if (digits.length === 11 && digits.startsWith('7')) {
    return '+' + digits
  }

  return phone
}

// Парсинг категории
function parseCategory(value: string): LicenseCategory | undefined {
  const upper = value.toUpperCase().trim()
  if (VALID_CATEGORIES.includes(upper as LicenseCategory)) {
    return upper as LicenseCategory
  }
  return undefined
}

// Парсинг списка категорий
function parseCategories(value: string): LicenseCategory[] {
  // Разделители: запятая, точка с запятой, пробел
  const parts = value.split(/[,;/\s]+/).filter(Boolean)
  const categories: LicenseCategory[] = []

  for (const part of parts) {
    const cat = parseCategory(part)
    if (cat && !categories.includes(cat)) {
      categories.push(cat)
    }
  }

  return categories
}

// Парсинг строки данных
function parseRow<T extends ImportRow>(
  row: Record<string, string>,
  mapping: ColumnMapping[],
  fields: SystemField[],
  rowIndex: number
): ParsedRow<T> {
  const errors: string[] = []
  const data: Record<string, unknown> = {}

  for (const field of fields) {
    // Находим маппинг для поля
    const columnMapping = mapping.find((m) => m.systemField === field.key)

    if (!columnMapping) {
      if (field.required) {
        errors.push(`Не указано обязательное поле "${field.label}"`)
      }
      continue
    }

    const rawValue = row[columnMapping.fileColumn] || ''

    if (!rawValue && field.required) {
      errors.push(`Пустое значение обязательного поля "${field.label}"`)
      continue
    }

    if (!rawValue) {
      continue
    }

    // Валидация и преобразование в зависимости от типа
    switch (field.type) {
      case 'email':
        if (!isValidEmail(rawValue)) {
          errors.push(`Некорректный email: ${rawValue}`)
        } else {
          data[field.key] = rawValue.toLowerCase()
        }
        break

      case 'phone':
        data[field.key] = normalizePhone(rawValue)
        break

      case 'category': {
        const cat = parseCategory(rawValue)
        if (!cat && rawValue) {
          errors.push(`Некорректная категория: ${rawValue}`)
        } else {
          data[field.key] = cat
        }
        break
      }

      case 'categories': {
        const cats = parseCategories(rawValue)
        if (cats.length === 0 && rawValue) {
          errors.push(`Не удалось распознать категории: ${rawValue}`)
        } else {
          data[field.key] = cats
        }
        break
      }

      default:
        data[field.key] = rawValue
    }
  }

  return {
    rowIndex,
    data: data as T,
    errors,
    isValid: errors.length === 0,
  }
}

// Основная функция парсинга
export function parseImportData<T extends ImportRow>(
  buffer: ArrayBuffer,
  dataType: ImportDataType,
  customMapping?: ColumnMapping[]
): ParseResult<T> {
  try {
    const { headers, rows } = parseExcelFile(buffer)

    if (headers.length === 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        headers: [],
        error: 'Файл пустой или не содержит заголовков',
      }
    }

    if (rows.length === 0) {
      return {
        success: false,
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        headers,
        error: 'Файл не содержит данных (только заголовки)',
      }
    }

    // Определяем маппинг
    const mapping = customMapping || autoDetectMapping(headers, dataType)
    const fields = getFieldsForType(dataType)

    // Проверяем, что есть маппинг для всех обязательных полей
    const requiredFields = fields.filter((f) => f.required)
    const mappedFields = mapping.map((m) => m.systemField)
    const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f.key))

    if (missingRequired.length > 0) {
      return {
        success: false,
        rows: [],
        totalRows: rows.length,
        validRows: 0,
        invalidRows: rows.length,
        headers,
        error: `Не найдены колонки для обязательных полей: ${missingRequired.map((f) => f.label).join(', ')}`,
      }
    }

    // Парсим каждую строку
    const parsedRows = rows.map((row, index) => parseRow<T>(row, mapping, fields, index + 2)) // +2: строка 1 = заголовки, нумерация с 1

    const validRows = parsedRows.filter((r) => r.isValid).length
    const invalidRows = parsedRows.filter((r) => !r.isValid).length

    return {
      success: true,
      rows: parsedRows,
      totalRows: parsedRows.length,
      validRows,
      invalidRows,
      headers,
    }
  } catch (error) {
    return {
      success: false,
      rows: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      headers: [],
      error: error instanceof Error ? error.message : 'Ошибка при чтении файла',
    }
  }
}
