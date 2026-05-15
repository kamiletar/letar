// Генерация шаблонов Excel для импорта

import * as XLSX from 'xlsx'
import type { ImportDataType } from './types'

// Шаблон для учеников
const STUDENT_TEMPLATE = {
  headers: ['ФИО', 'Email', 'Телефон', 'Категория'],
  examples: [
    ['Иванов Иван Иванович', 'ivanov@example.com', '+7 999 123-45-67', 'B'],
    ['Петрова Мария Сергеевна', 'petrova@example.com', '+7 999 234-56-78', 'A'],
    ['Сидоров Алексей Петрович', 'sidorov@example.com', '+7 999 345-67-89', 'C'],
  ],
  notes: [
    'ФИО — обязательное поле',
    'Email — обязательное поле, должен быть уникальным',
    'Телефон — необязательное поле, формат: +7 XXX XXX-XX-XX',
    'Категория — необязательное поле, допустимые значения: M, A1, A, B1, B, C1, C, D1, D, BE, CE, C1E, DE, D1E, Tm, Tb',
  ],
}

// Шаблон для инструкторов
const INSTRUCTOR_TEMPLATE = {
  headers: ['ФИО', 'Email', 'Телефон', 'Категории', 'Описание'],
  examples: [
    ['Козлов Дмитрий Александрович', 'kozlov@example.com', '+7 999 456-78-90', 'B, C', 'Опыт работы 10 лет'],
    [
      'Новикова Елена Владимировна',
      'novikova@example.com',
      '+7 999 567-89-01',
      'B',
      'Специализация: контраварийное вождение',
    ],
    ['Морозов Сергей Николаевич', 'morozov@example.com', '+7 999 678-90-12', 'A, B, C', 'Инструктор высшей категории'],
  ],
  notes: [
    'ФИО — обязательное поле',
    'Email — обязательное поле, должен быть уникальным',
    'Телефон — необязательное поле, формат: +7 XXX XXX-XX-XX',
    'Категории — необязательное поле, можно указать несколько через запятую (B, C, D)',
    'Описание — необязательное поле, краткая информация об инструкторе',
  ],
}

// Получение шаблона по типу данных
function getTemplate(dataType: ImportDataType) {
  return dataType === 'students' ? STUDENT_TEMPLATE : INSTRUCTOR_TEMPLATE
}

// Тип формата файла шаблона
export type TemplateFormat = 'xlsx' | 'ods'

// Генерация Excel/ODS файла шаблона
export function generateTemplate(dataType: ImportDataType, format: TemplateFormat = 'xlsx'): ArrayBuffer {
  const template = getTemplate(dataType)
  const workbook = XLSX.utils.book_new()

  // Создаём лист с данными
  const data = [template.headers, ...template.examples]

  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Устанавливаем ширину колонок
  const colWidths = template.headers.map((header, index) => {
    const maxLength = Math.max(header.length, ...template.examples.map((row) => (row[index] || '').length))
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Данные')

  // Создаём лист с инструкциями
  const notesData = [
    ['Инструкция по заполнению'],
    [],
    ...template.notes.map((note) => [note]),
    [],
    ['Важно:'],
    ['• Первая строка должна содержать заголовки колонок'],
    ['• Не изменяйте названия заголовков'],
    ['• Удалите примеры перед загрузкой реальных данных'],
    ['• Сохраните файл в формате .xlsx, .ods или .csv'],
  ]

  const notesWorksheet = XLSX.utils.aoa_to_sheet(notesData)
  notesWorksheet['!cols'] = [{ wch: 80 }]

  XLSX.utils.book_append_sheet(workbook, notesWorksheet, 'Инструкция')

  // Генерируем бинарный файл в выбранном формате
  const buffer = XLSX.write(workbook, { type: 'array', bookType: format })

  return buffer
}

// Получение имени файла шаблона
export function getTemplateFileName(dataType: ImportDataType, format: TemplateFormat = 'xlsx'): string {
  const basenames: Record<ImportDataType, string> = {
    students: 'шаблон_ученики',
    instructors: 'шаблон_инструкторы',
  }
  return `${basenames[dataType]}.${format}`
}

// Получение MIME типа для формата
export function getTemplateMimeType(format: TemplateFormat): string {
  const mimeTypes: Record<TemplateFormat, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
  }
  return mimeTypes[format]
}

// Получение описания типа данных
export function getDataTypeLabel(dataType: ImportDataType): string {
  const labels: Record<ImportDataType, string> = {
    students: 'Ученики',
    instructors: 'Инструкторы',
  }
  return labels[dataType]
}

// Получение иконки типа данных
export function getDataTypeIcon(dataType: ImportDataType): string {
  const icons: Record<ImportDataType, string> = {
    students: '🎓',
    instructors: '👨‍🏫',
  }
  return icons[dataType]
}
