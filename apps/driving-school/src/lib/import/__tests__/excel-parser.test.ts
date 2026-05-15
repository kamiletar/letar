import { describe, expect, it } from 'vitest'
import { type ColumnMapping, parseExcelFile } from '../excel-parser'

/**
 * Unit-тесты для excel-parser (Этап 3.1 - Импорт Excel)
 *
 * Покрытие: парсинг XLSX/CSV, маппинг колонок, валидация данных
 */

describe('excel-parser', () => {
  // Группа 1: Парсинг (5 тестов)
  describe('Парсинг файлов', () => {
    it('должен парсить .xlsx файл', async () => {
      // Создаём минимальный валидный XLSX файл через xlsx библиотеку
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet([{ Name: 'John', Email: 'john@test.com' }])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      const result = await parseExcelFile(xlsxBuffer, 'test.xlsx')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.rows).toBeDefined()
        expect(Array.isArray(result.rows)).toBe(true)
        expect(result.rows).toHaveLength(1)
      }
    })

    it('должен парсить .csv файл', async () => {
      const csvContent = `Name,Email,Phone
John Doe,john@example.com,+79991234567
Jane Smith,jane@example.com,+79997654321`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.rows).toHaveLength(2) // Без заголовка
        expect(result.headers).toEqual(['Name', 'Email', 'Phone'])
      }
    })

    it('должен вернуть ошибку для неверного формата', async () => {
      const invalidBuffer = Buffer.from('invalid content')

      const result = await parseExcelFile(invalidBuffer, 'test.txt')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Неподдерживаемый формат')
      }
    })

    it('должен вернуть ошибку для пустого файла', async () => {
      const emptyBuffer = Buffer.from('')

      const result = await parseExcelFile(emptyBuffer, 'empty.xlsx')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Файл пуст')
      }
    })

    it('должен вернуть предупреждение для большого файла (>1000 строк)', async () => {
      // Генерируем CSV с >1000 строк
      const headers = 'Name,Email\n'
      const rows = Array.from({ length: 1001 }, (_, i) => `User${i},user${i}@test.com`).join('\n')
      const largeCsv = headers + rows
      const largeBuffer = Buffer.from(largeCsv, 'utf-8')

      const result = await parseExcelFile(largeBuffer, 'large.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.warnings).toBeDefined()
        expect(result.warnings).toEqual(
          expect.arrayContaining([expect.stringContaining('Файл содержит более 1000 строк')])
        )
      }
    })

    it('должен корректно обрабатывать UTF-8 с BOM', async () => {
      // UTF-8 BOM: EF BB BF
      const bom = Buffer.from([0xef, 0xbb, 0xbf])
      const csvContent = 'Name,Email\nИван Иванов,ivan@test.com'
      const csvWithBom = Buffer.concat([bom, Buffer.from(csvContent, 'utf-8')])

      const result = await parseExcelFile(csvWithBom, 'bom.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.rows).toHaveLength(1)
        // Проверяем маппированные поля (lowercase после автоопределения)
        expect(result.rows[0]).toMatchObject({
          name: 'Иван Иванов',
          email: 'ivan@test.com',
        })
      }
    })
  })

  // Группа 2: Маппинг колонок (5 тестов)
  describe('Маппинг колонок', () => {
    it('должен автоопределять колонки по заголовкам', async () => {
      const csvContent = `Name,Email,Phone
John Doe,john@example.com,+79991234567`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.detectedMapping).toEqual({
          name: 'Name',
          email: 'Email',
          phone: 'Phone',
        })
      }
    })

    it('должен игнорировать регистр при автоопределении', async () => {
      const csvContent = `NAME,EMAIL,PHONE
John Doe,john@example.com,+79991234567`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.detectedMapping).toEqual({
          name: 'NAME',
          email: 'EMAIL',
          phone: 'PHONE',
        })
      }
    })

    it('должен применять ручной маппинг', async () => {
      const csvContent = `FullName,EmailAddress,PhoneNumber
John Doe,john@example.com,+79991234567`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const customMapping: ColumnMapping = {
        name: 'FullName',
        email: 'EmailAddress',
        phone: 'PhoneNumber',
      }

      const result = await parseExcelFile(csvBuffer, 'test.csv', { mapping: customMapping })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.rows[0]).toMatchObject({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+79991234567',
        })
      }
    })

    it('должен валидировать обязательные колонки', async () => {
      const csvContent = `Name,Phone
John Doe,+79991234567`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', {
        requiredColumns: ['name', 'email', 'phone'],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Отсутствуют обязательные колонки: email')
      }
    })

    it('должен предупреждать о неизвестных колонках', async () => {
      const csvContent = `Name,Email,Phone,UnknownColumn
John Doe,john@example.com,+79991234567,extra`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.warnings).toContain('Неизвестная колонка: UnknownColumn')
      }
    })
  })

  // Группа 3: Валидация данных (5 тестов)
  describe('Валидация данных', () => {
    it('должен валидировать email формат', async () => {
      const csvContent = `Name,Email
John Doe,invalid-email`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', { validate: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.validationErrors).toHaveLength(1)
        expect(result.validationErrors?.[0]).toMatchObject({
          row: 0,
          field: 'email',
          message: expect.stringContaining('Неверный формат email'),
        })
      }
    })

    it('должен валидировать телефон формат (+7)', async () => {
      const csvContent = `Name,Email,Phone
John Doe,john@example.com,123456`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', { validate: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.validationErrors).toHaveLength(1)
        expect(result.validationErrors?.[0]).toMatchObject({
          row: 0,
          field: 'phone',
          message: expect.stringContaining('Неверный формат телефона'),
        })
      }
    })

    it('должен обнаруживать дубликаты по email/phone', async () => {
      const csvContent = `Name,Email,Phone
John Doe,john@example.com,+79991234567
Jane Smith,john@example.com,+79997654321`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', { validate: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.validationErrors).toContainEqual(
          expect.objectContaining({
            row: 1,
            field: 'email',
            message: expect.stringContaining('Дубликат email'),
          })
        )
      }
    })

    it('должен требовать обязательное имя', async () => {
      const csvContent = `Name,Email,Phone
,john@example.com,+79991234567`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', { validate: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.validationErrors).toContainEqual(
          expect.objectContaining({
            row: 0,
            field: 'name',
            message: expect.stringContaining('Имя обязательно'),
          })
        )
      }
    })

    it('должен валидировать корректные роли', async () => {
      const csvContent = `Name,Email,Phone,Role
John Doe,john@example.com,+79991234567,INVALID_ROLE`
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      const result = await parseExcelFile(csvBuffer, 'test.csv', { validate: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.validationErrors).toContainEqual(
          expect.objectContaining({
            row: 0,
            field: 'role',
            message: expect.stringContaining('Недопустимая роль'),
          })
        )
      }
    })
  })
})
