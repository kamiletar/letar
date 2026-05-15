/**
 * Unit-тесты для excel exporter (Phase 8.2 — Экспорт в Excel)
 *
 * Покрытие: генерация Excel/ODS/CSV, преобразование данных, форматирование
 */

import { describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

// Мок для @letar/format-utils
vi.mock('@letar/format-utils', () => ({
  formatDate: (date: Date | string | null | undefined) => {
    if (!date) {
      return 'N/A'
    }
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  },
  formatTime: (date: Date | string | null | undefined) => {
    if (!date) {
      return 'N/A'
    }
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  },
}))

import {
  generateExportFile,
  getExportFilename,
  getExportMimeType,
  toInstructorExportRow,
  toLessonExportRow,
  toStatsExportRows,
  toStudentExportRow,
} from '../exporter'

describe('excel exporter', () => {
  // Группа 1: Генерация файлов (5 тестов)
  describe('Группа 1: Генерация файлов (5 тестов)', () => {
    const mockStudentRows = [
      {
        name: 'Иван Иванов',
        email: 'ivan@test.com',
        phone: '+79001234567',
        category: 'B',
        joinedAt: '2024-01-15',
      },
    ]

    it('должен генерировать .xlsx формат', () => {
      const result = generateExportFile('students', mockStudentRows, 'xlsx')

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/ученики_\d{4}-\d{2}-\d{2}\.xlsx/)
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(result.buffer).toBeInstanceOf(ArrayBuffer)
      expect(result.rowCount).toBe(1)

      // Проверяем, что буфер можно прочитать как XLSX
      const workbook = XLSX.read(result.buffer, { type: 'array' })
      expect(workbook.SheetNames).toContain('Ученики')
    })

    it('должен генерировать .ods формат', () => {
      const result = generateExportFile('students', mockStudentRows, 'ods')

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/ученики_\d{4}-\d{2}-\d{2}\.ods/)
      expect(result.mimeType).toBe('application/vnd.oasis.opendocument.spreadsheet')
      expect(result.buffer).toBeInstanceOf(ArrayBuffer)
      expect(result.rowCount).toBe(1)
    })

    it('должен генерировать .csv формат', () => {
      const result = generateExportFile('students', mockStudentRows, 'csv')

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/ученики_\d{4}-\d{2}-\d{2}\.csv/)
      expect(result.mimeType).toBe('text/csv;charset=utf-8')
      expect(result.buffer).toBeInstanceOf(ArrayBuffer)
      expect(result.rowCount).toBe(1)

      // Проверяем содержимое CSV
      const csvContent = new TextDecoder().decode(result.buffer)
      expect(csvContent).toContain('ФИО,Email,Телефон,Категория')
      expect(csvContent).toContain('Иван Иванов')
      expect(csvContent).toContain('ivan@test.com')
    })

    it('должен включать корректные заголовки для всех типов данных', () => {
      // Students
      const studentsResult = generateExportFile('students', mockStudentRows, 'xlsx')
      const studentsWorkbook = XLSX.read(studentsResult.buffer, { type: 'array' })
      const studentsSheet = studentsWorkbook.Sheets['Ученики']
      expect(XLSX.utils.sheet_to_csv(studentsSheet)).toContain('ФИО,Email,Телефон,Категория,Дата добавления')

      // Instructors
      const instructorsResult = generateExportFile(
        'instructors',
        [
          {
            name: 'Инструктор',
            email: 'instructor@test.com',
            phone: '+79001234567',
            categories: 'B, C',
            bio: 'Описание',
            joinedAt: '2024-01-15',
          },
        ],
        'xlsx'
      )
      const instructorsWorkbook = XLSX.read(instructorsResult.buffer, { type: 'array' })
      const instructorsSheet = instructorsWorkbook.Sheets['Инструкторы']
      expect(XLSX.utils.sheet_to_csv(instructorsSheet)).toContain(
        'ФИО,Email,Телефон,Категории,Описание,Дата добавления'
      )

      // Stats
      const statsResult = generateExportFile('stats', [{ metric: 'Тест', value: '100' }], 'xlsx')
      const statsWorkbook = XLSX.read(statsResult.buffer, { type: 'array' })
      const statsSheet = statsWorkbook.Sheets['Статистика']
      expect(XLSX.utils.sheet_to_csv(statsSheet)).toContain('Показатель,Значение')
    })

    it('должен генерировать пустой файл с заголовками для пустого набора данных', () => {
      const result = generateExportFile('students', [], 'xlsx')

      expect(result.success).toBe(true)
      expect(result.rowCount).toBe(0)

      // Проверяем, что заголовки присутствуют
      const workbook = XLSX.read(result.buffer, { type: 'array' })
      const sheet = workbook.Sheets['Ученики']
      const csv = XLSX.utils.sheet_to_csv(sheet)
      expect(csv).toContain('ФИО,Email,Телефон,Категория,Дата добавления')

      // Проверяем, что нет строк данных (только заголовки)
      const rows = csv.trim().split('\n')
      expect(rows.length).toBe(1) // Только заголовки
    })
  })

  // Группа 2: Преобразование данных (5 тестов)
  describe('Группа 2: Преобразование данных (5 тестов)', () => {
    it('должен преобразовывать данные ученика (toStudentExportRow)', () => {
      const memberData = {
        user: {
          name: 'Пётр Петров',
          email: 'petr@test.com',
          phone: '+79991234567',
        },
        joinedAt: new Date('2024-01-20T10:00:00Z'),
        category: 'B',
      }

      const row = toStudentExportRow(memberData)

      expect(row).toMatchObject({
        name: 'Пётр Петров',
        email: 'petr@test.com',
        phone: '+79991234567',
        category: 'B',
      })
      expect(row.joinedAt).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    })

    it('должен преобразовывать данные инструктора (toInstructorExportRow)', () => {
      const memberData = {
        user: {
          name: 'Сергей Сергеев',
          email: 'sergey@test.com',
          phone: '+79997654321',
          instructorProfile: {
            licenseCategories: ['B', 'C', 'D'],
            bio: 'Опытный инструктор с 10-летним стажем',
          },
        },
        joinedAt: new Date('2023-06-15T08:00:00Z'),
      }

      const row = toInstructorExportRow(memberData)

      expect(row).toMatchObject({
        name: 'Сергей Сергеев',
        email: 'sergey@test.com',
        phone: '+79997654321',
        categories: 'B, C, D',
        bio: 'Опытный инструктор с 10-летним стажем',
      })
      expect(row.joinedAt).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    })

    it('должен преобразовывать данные занятия (toLessonExportRow)', () => {
      const lessonData = {
        slot: {
          startTime: new Date('2024-02-10T14:30:00Z'),
        },
        student: {
          name: 'Анна Аннова',
          email: 'anna@test.com',
        },
        instructor: {
          name: 'Виктор Викторов',
          email: 'viktor@test.com',
        },
        status: 'COMPLETED',
        lessonType: {
          name: 'Вождение в городе',
        },
        category: 'B',
      }

      const row = toLessonExportRow(lessonData)

      expect(row).toMatchObject({
        studentName: 'Анна Аннова',
        studentEmail: 'anna@test.com',
        instructorName: 'Виктор Викторов',
        instructorEmail: 'viktor@test.com',
        status: 'Завершено',
        lessonType: 'Вождение в городе',
        category: 'B',
      })
      expect(row.date).toMatch(/\d{2}\.\d{2}\.\d{4}/)
      expect(row.time).toMatch(/\d{2}:\d{2}/)
    })

    it('должен преобразовывать статистику (toStatsExportRows)', () => {
      const stats = {
        totalStudents: 150,
        totalInstructors: 12,
        totalLessons: 500,
        completedLessons: 450,
        cancelledLessons: 30,
        noShowLessons: 15,
        pendingLessons: 3,
        confirmedLessons: 2,
      }

      const rows = toStatsExportRows(stats)

      expect(rows).toHaveLength(10) // 8 абсолютных метрик + 2 процента
      expect(rows).toContainEqual({ metric: 'Всего учеников', value: '150' })
      expect(rows).toContainEqual({ metric: 'Всего инструкторов', value: '12' })
      expect(rows).toContainEqual({ metric: 'Всего занятий', value: '500' })
      expect(rows).toContainEqual({ metric: 'Завершённых занятий', value: '450' })
      expect(rows).toContainEqual({ metric: 'Процент завершённых', value: '90%' })
      expect(rows).toContainEqual({ metric: 'Процент неявок', value: '3%' })
    })

    it('должен обрабатывать null/undefined значения в данных', () => {
      // Ученик без телефона и категории
      const studentRow = toStudentExportRow({
        user: {
          name: null,
          email: 'test@test.com',
          phone: null,
        },
        joinedAt: new Date('2024-01-15'),
      })

      expect(studentRow.name).toBe('')
      expect(studentRow.phone).toBe('')
      expect(studentRow.category).toBe('')

      // Инструктор без профиля
      const instructorRow = toInstructorExportRow({
        user: {
          name: 'Имя',
          email: 'test@test.com',
          phone: null,
          instructorProfile: null,
        },
        joinedAt: new Date('2024-01-15'),
      })

      expect(instructorRow.categories).toBe('')
      expect(instructorRow.bio).toBe('')

      // Занятие без типа и категории
      const lessonRow = toLessonExportRow({
        slot: { startTime: new Date('2024-02-10T14:30:00Z') },
        student: { name: null, email: 'student@test.com' },
        instructor: { name: null, email: 'instructor@test.com' },
        status: 'PENDING',
        lessonType: null,
        category: null,
      })

      expect(lessonRow.studentName).toBe('')
      expect(lessonRow.instructorName).toBe('')
      expect(lessonRow.lessonType).toBe('')
      expect(lessonRow.category).toBe('')
    })
  })

  // Группа 3: Утилиты (5 тестов)
  describe('Группа 3: Утилиты (5 тестов)', () => {
    it('должен генерировать корректное имя файла', () => {
      const datePattern = /\d{4}-\d{2}-\d{2}/

      expect(getExportFilename('students', 'xlsx')).toMatch(/ученики_\d{4}-\d{2}-\d{2}\.xlsx/)
      expect(getExportFilename('instructors', 'ods')).toMatch(/инструкторы_\d{4}-\d{2}-\d{2}\.ods/)
      expect(getExportFilename('lessons', 'csv')).toMatch(/занятия_\d{4}-\d{2}-\d{2}\.csv/)
      expect(getExportFilename('stats', 'xlsx')).toMatch(/статистика_\d{4}-\d{2}-\d{2}\.xlsx/)

      // Проверяем, что дата соответствует текущей
      const filename = getExportFilename('students', 'xlsx')
      const match = filename.match(datePattern)
      expect(match).not.toBeNull()

      const today = new Date().toISOString().split('T')[0]
      expect(filename).toContain(today)
    })

    it('должен возвращать корректный MIME тип для каждого формата', () => {
      expect(getExportMimeType('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(getExportMimeType('ods')).toBe('application/vnd.oasis.opendocument.spreadsheet')
      expect(getExportMimeType('csv')).toBe('text/csv;charset=utf-8')
    })

    it('должен генерировать файл с корректным количеством колонок', () => {
      const mockRows = [
        {
          name: 'Очень длинное имя ученика',
          email: 'verylongemailaddress@example.com',
          phone: '+79001234567',
          category: 'B',
          joinedAt: '2024-01-15',
        },
      ]

      const result = generateExportFile('students', mockRows, 'xlsx')
      const workbook = XLSX.read(result.buffer, { type: 'array' })
      const sheet = workbook.Sheets['Ученики']

      // Проверяем, что лист содержит правильное количество колонок
      const csv = XLSX.utils.sheet_to_csv(sheet)
      const rows = csv.trim().split('\n')
      const headers = rows[0].split(',')

      expect(headers).toHaveLength(5) // ФИО, Email, Телефон, Категория, Дата добавления

      // Проверяем наличие всех заголовков
      expect(headers).toEqual(['ФИО', 'Email', 'Телефон', 'Категория', 'Дата добавления'])

      // Проверяем, что данные корректно записаны
      const dataRow = rows[1].split(',')
      expect(dataRow).toHaveLength(5)
      expect(dataRow[0]).toBe('Очень длинное имя ученика')
      expect(dataRow[1]).toBe('verylongemailaddress@example.com')
    })

    it('должен корректно обрабатывать статистику с нулевыми значениями', () => {
      const emptyStats = {
        totalStudents: 0,
        totalInstructors: 0,
        totalLessons: 0,
        completedLessons: 0,
        cancelledLessons: 0,
        noShowLessons: 0,
        pendingLessons: 0,
        confirmedLessons: 0,
      }

      const rows = toStatsExportRows(emptyStats)

      expect(rows).toContainEqual({ metric: 'Процент завершённых', value: '0%' })
      expect(rows).toContainEqual({ metric: 'Процент неявок', value: '0%' })
    })

    it('должен корректно вычислять проценты в статистике', () => {
      const stats = {
        totalStudents: 100,
        totalInstructors: 10,
        totalLessons: 200,
        completedLessons: 150,
        cancelledLessons: 20,
        noShowLessons: 30,
        pendingLessons: 0,
        confirmedLessons: 0,
      }

      const rows = toStatsExportRows(stats)

      // 150 / 200 = 75%
      expect(rows).toContainEqual({ metric: 'Процент завершённых', value: '75%' })

      // 30 / 200 = 15%
      expect(rows).toContainEqual({ metric: 'Процент неявок', value: '15%' })
    })
  })
})
