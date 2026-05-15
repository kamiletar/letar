// Генерация Excel/ODS/CSV файлов для экспорта данных школы

import { formatDate as formatDateUtil, formatTime as formatTimeUtil } from '@letar/format-utils'
import * as XLSX from 'xlsx'
import type {
  ExportDataType,
  ExportFormat,
  ExportResult,
  ExportRow,
  InstructorExportRow,
  LessonExportRow,
  StatsExportRow,
  StudentExportRow,
} from './types'
import { EXPORT_SHEETS, LESSON_STATUS_LABELS } from './types'

// Генерация Excel/ODS/CSV файла из данных
export function generateExportFile(
  dataType: ExportDataType,
  rows: ExportRow[],
  format: ExportFormat = 'xlsx'
): ExportResult {
  const config = EXPORT_SHEETS[dataType]
  const workbook = XLSX.utils.book_new()

  // Преобразуем объекты в массивы строк
  const dataRows = rows.map((row) => Object.values(row) as string[])

  // Создаём данные для листа: заголовки + строки данных
  const sheetData = [config.headers, ...dataRows]

  // Создаём лист
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // Устанавливаем ширину колонок
  worksheet['!cols'] = config.columnWidths.map((width) => ({ wch: width }))

  // Добавляем лист в книгу
  XLSX.utils.book_append_sheet(workbook, worksheet, config.name)

  // Генерируем файл в нужном формате
  const bookType = format === 'csv' ? 'csv' : format
  const buffer = XLSX.write(workbook, { type: 'array', bookType })

  return {
    success: true,
    filename: getExportFilename(dataType, format),
    mimeType: getExportMimeType(format),
    buffer,
    rowCount: rows.length,
  }
}

// Форматирование даты для экспорта (возвращает '' вместо 'N/A')
function formatDate(date: Date | string | null | undefined): string {
  const result = formatDateUtil(date)
  return result === 'N/A' ? '' : result
}

// Форматирование времени для экспорта (возвращает '' вместо 'N/A')
function formatTime(date: Date | string | null | undefined): string {
  const result = formatTimeUtil(date)
  return result === 'N/A' ? '' : result
}

// Преобразование данных ученика в строку экспорта
export function toStudentExportRow(member: {
  user: { name: string | null; email: string; phone: string | null }
  joinedAt: Date
  // Дополнительные данные из StudentProfile, если есть
  category?: string | null
}): StudentExportRow {
  return {
    name: member.user.name || '',
    email: member.user.email,
    phone: member.user.phone || '',
    category: member.category || '',
    joinedAt: formatDate(member.joinedAt),
  }
}

// Преобразование данных инструктора в строку экспорта
export function toInstructorExportRow(member: {
  user: {
    name: string | null
    email: string
    phone: string | null
    instructorProfile?: {
      licenseCategories: string[]
      bio: string | null
    } | null
  }
  joinedAt: Date
}): InstructorExportRow {
  const profile = member.user.instructorProfile
  return {
    name: member.user.name || '',
    email: member.user.email,
    phone: member.user.phone || '',
    categories: profile?.licenseCategories?.join(', ') || '',
    bio: profile?.bio || '',
    joinedAt: formatDate(member.joinedAt),
  }
}

// Преобразование данных занятия в строку экспорта
export function toLessonExportRow(lesson: {
  slot: { startTime: Date }
  student: { name: string | null; email: string }
  instructor: { name: string | null; email: string }
  status: string
  lessonType?: { name: string } | null
  category?: string | null
}): LessonExportRow {
  return {
    date: formatDate(lesson.slot.startTime),
    time: formatTime(lesson.slot.startTime),
    studentName: lesson.student.name || '',
    studentEmail: lesson.student.email,
    instructorName: lesson.instructor.name || '',
    instructorEmail: lesson.instructor.email,
    status: LESSON_STATUS_LABELS[lesson.status] || lesson.status,
    lessonType: lesson.lessonType?.name || '',
    category: lesson.category || '',
  }
}

// Преобразование статистики в строки экспорта
export function toStatsExportRows(stats: {
  totalStudents: number
  totalInstructors: number
  totalLessons: number
  completedLessons: number
  cancelledLessons: number
  noShowLessons: number
  pendingLessons: number
  confirmedLessons: number
}): StatsExportRow[] {
  return [
    { metric: 'Всего учеников', value: String(stats.totalStudents) },
    { metric: 'Всего инструкторов', value: String(stats.totalInstructors) },
    { metric: 'Всего занятий', value: String(stats.totalLessons) },
    { metric: 'Завершённых занятий', value: String(stats.completedLessons) },
    { metric: 'Отменённых занятий', value: String(stats.cancelledLessons) },
    { metric: 'Неявок', value: String(stats.noShowLessons) },
    { metric: 'Ожидающих подтверждения', value: String(stats.pendingLessons) },
    { metric: 'Подтверждённых занятий', value: String(stats.confirmedLessons) },
    {
      metric: 'Процент завершённых',
      value: stats.totalLessons > 0 ? `${Math.round((stats.completedLessons / stats.totalLessons) * 100)}%` : '0%',
    },
    {
      metric: 'Процент неявок',
      value: stats.totalLessons > 0 ? `${Math.round((stats.noShowLessons / stats.totalLessons) * 100)}%` : '0%',
    },
  ]
}

// Получение имени файла экспорта
export function getExportFilename(dataType: ExportDataType, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const names: Record<ExportDataType, string> = {
    students: 'ученики',
    instructors: 'инструкторы',
    lessons: 'занятия',
    stats: 'статистика',
  }
  return `${names[dataType]}_${date}.${format}`
}

// Получение MIME-типа для формата
export function getExportMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    csv: 'text/csv;charset=utf-8',
  }
  return mimeTypes[format]
}

// Получение описания типа данных
export function getExportDataTypeLabel(dataType: ExportDataType): string {
  const labels: Record<ExportDataType, string> = {
    students: 'Ученики',
    instructors: 'Инструкторы',
    lessons: 'Занятия',
    stats: 'Статистика',
  }
  return labels[dataType]
}

// Получение иконки типа данных
export function getExportDataTypeIcon(dataType: ExportDataType): string {
  const icons: Record<ExportDataType, string> = {
    students: '🎓',
    instructors: '👨‍🏫',
    lessons: '📅',
    stats: '📊',
  }
  return icons[dataType]
}

// Получение описания формата
export function getFormatLabel(format: ExportFormat): string {
  const labels: Record<ExportFormat, string> = {
    xlsx: 'Excel (.xlsx)',
    ods: 'LibreOffice (.ods)',
    csv: 'CSV (.csv)',
  }
  return labels[format]
}
