// Типы данных для импорта/экспорта Excel

import type { LicenseCategory } from '@letar/driving-school-db/prisma'

// Строковые роли для импорта (маппинг из SchoolMemberRole enum)
export type ImportRole = 'owner' | 'super_manager' | 'manager' | 'instructor' | 'theory_instructor' | 'member'

// Тип импортируемых данных
export type ImportDataType = 'students' | 'instructors'

// Поля для импорта учеников
export interface StudentImportRow {
  name: string
  email: string
  phone?: string
  category?: LicenseCategory
}

// Поля для импорта инструкторов
export interface InstructorImportRow {
  name: string
  email: string
  phone?: string
  categories?: LicenseCategory[]
  bio?: string
}

// Общий тип для строки импорта
export type ImportRow = StudentImportRow | InstructorImportRow

// Результат парсинга строки
export interface ParsedRow<T extends ImportRow> {
  rowIndex: number
  data: T
  errors: string[]
  isValid: boolean
}

// Результат парсинга файла
export interface ParseResult<T extends ImportRow> {
  success: boolean
  rows: ParsedRow<T>[]
  totalRows: number
  validRows: number
  invalidRows: number
  headers: string[]
  error?: string
}

// Маппинг колонок
export interface ColumnMapping {
  fileColumn: string
  systemField: string
}

// Конфигурация полей системы
export interface SystemField {
  key: string
  label: string
  required: boolean
  type: 'string' | 'email' | 'phone' | 'category' | 'categories'
}

// Определения полей для каждого типа данных
export const STUDENT_FIELDS: SystemField[] = [
  { key: 'name', label: 'ФИО', required: true, type: 'string' },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'phone', label: 'Телефон', required: false, type: 'phone' },
  { key: 'category', label: 'Категория прав', required: false, type: 'category' },
]

export const INSTRUCTOR_FIELDS: SystemField[] = [
  { key: 'name', label: 'ФИО', required: true, type: 'string' },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'phone', label: 'Телефон', required: false, type: 'phone' },
  { key: 'categories', label: 'Категории прав', required: false, type: 'categories' },
  { key: 'bio', label: 'Описание', required: false, type: 'string' },
]

// Результат импорта
export interface ImportResult {
  success: boolean
  imported: number
  updated: number
  skipped: number
  errors: Array<{
    rowIndex: number
    error: string
  }>
}

// Опции импорта
export interface ImportOptions {
  updateExisting: boolean // Обновлять существующие записи
  skipErrors: boolean // Пропускать строки с ошибками
  sendInvites: boolean // Отправить приглашения новым пользователям
}

// Роль для импортируемых пользователей
export const IMPORT_ROLES: Record<ImportDataType, ImportRole> = {
  students: 'member',
  instructors: 'instructor',
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

// Тип экспортируемых данных
export type ExportDataType = 'students' | 'instructors' | 'lessons' | 'stats'

// Формат экспорта
export type ExportFormat = 'xlsx' | 'ods' | 'csv'

// Базовый интерфейс для строки экспорта (с index signature для совместимости с Record<string, unknown>)
export interface ExportRow {
  [key: string]: string
}

// Строка экспорта ученика
export interface StudentExportRow extends ExportRow {
  name: string
  email: string
  phone: string
  category: string
  joinedAt: string
}

// Строка экспорта инструктора
export interface InstructorExportRow extends ExportRow {
  name: string
  email: string
  phone: string
  categories: string
  bio: string
  joinedAt: string
}

// Строка экспорта занятия
export interface LessonExportRow extends ExportRow {
  date: string
  time: string
  studentName: string
  studentEmail: string
  instructorName: string
  instructorEmail: string
  status: string
  lessonType: string
  category: string
}

// Строка экспорта статистики
export interface StatsExportRow extends ExportRow {
  metric: string
  value: string
}

// Фильтры для экспорта
export interface ExportFilters {
  // Для занятий
  dateFrom?: Date
  dateTo?: Date
  status?: string[]
  instructorId?: string
  // Для учеников/инструкторов
  category?: LicenseCategory
}

// Результат экспорта
export interface ExportResult {
  success: boolean
  filename: string
  mimeType: string
  buffer: ArrayBuffer
  rowCount: number
}

// Метаданные для листа Excel
export interface ExportSheetConfig {
  name: string
  headers: string[]
  columnWidths: number[]
}

// Конфигурации листов для разных типов экспорта
export const EXPORT_SHEETS: Record<ExportDataType, ExportSheetConfig> = {
  students: {
    name: 'Ученики',
    headers: ['ФИО', 'Email', 'Телефон', 'Категория', 'Дата добавления'],
    columnWidths: [30, 25, 20, 15, 20],
  },
  instructors: {
    name: 'Инструкторы',
    headers: ['ФИО', 'Email', 'Телефон', 'Категории', 'Описание', 'Дата добавления'],
    columnWidths: [30, 25, 20, 20, 40, 20],
  },
  lessons: {
    name: 'Занятия',
    headers: [
      'Дата',
      'Время',
      'Ученик',
      'Email ученика',
      'Инструктор',
      'Email инструктора',
      'Статус',
      'Тип занятия',
      'Категория',
    ],
    columnWidths: [12, 12, 25, 25, 25, 25, 15, 20, 12],
  },
  stats: {
    name: 'Статистика',
    headers: ['Показатель', 'Значение'],
    columnWidths: [40, 20],
  },
}

// Локализация статусов занятий
export const LESSON_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  COMPLETED: 'Завершено',
  NO_SHOW: 'Неявка',
  CANCELLED: 'Отменено',
  RESCHEDULED: 'Перенесено',
  NEEDS_RESCHEDULE: 'Требует переноса',
}

// Локализация категорий прав
export const LICENSE_CATEGORY_LABELS: Record<string, string> = {
  M: 'M (мопеды)',
  A1: 'A1 (лёгкие мотоциклы)',
  A: 'A (мотоциклы)',
  B1: 'B1 (квадрициклы)',
  B: 'B (легковые)',
  C1: 'C1 (средние грузовики)',
  C: 'C (грузовые)',
  D1: 'D1 (малые автобусы)',
  D: 'D (автобусы)',
  BE: 'BE (легковые с прицепом)',
  CE: 'CE (грузовые с прицепом)',
  C1E: 'C1E (средние грузовые с прицепом)',
  DE: 'DE (автобусы с прицепом)',
  D1E: 'D1E (малые автобусы с прицепом)',
  Tm: 'Tm (трамваи)',
  Tb: 'Tb (троллейбусы)',
}
