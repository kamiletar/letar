/**
 * Unit-тесты для библиотеки генерации договоров
 *
 * Группа 1: Парсинг и валидация (3 теста)
 * Группа 2: Рендеринг (4 теста)
 */

import { describe, expect, it } from 'vitest'

import { createTestData, extractPlaceholders, renderTemplate, validateTemplateData } from '../src/template-renderer'
import type { TemplateData } from '../src/types'

// ============================================
// Группа 1: Парсинг и валидация
// ============================================

describe('Группа 1: Парсинг и валидация', () => {
  it('extractPlaceholders() — извлекает плейсхолдеры {{key}}', () => {
    const template = `
      <p>Имя: {{student.fullName}}</p>
      <p>Школа: {{school.name}}</p>
      <p>Цена: {{contract.price}}</p>
    `

    const placeholders = extractPlaceholders(template)

    expect(placeholders).toContain('student.fullName')
    expect(placeholders).toContain('school.name')
    expect(placeholders).toContain('contract.price')
    expect(placeholders.length).toBe(3)
  })

  it('extractPlaceholders() — игнорирует хелперы Handlebars', () => {
    const template = `
      <p>Простой: {{contract.number}}</p>
      <p>Хелпер: {{formatDate contract.date}}</p>
      <p>Условие: {{#if student.isMinor}}Несовершеннолетний{{/if}}</p>
    `

    const placeholders = extractPlaceholders(template)

    // Хелперы НЕ должны быть в списке (они содержат пробелы)
    expect(placeholders).not.toContain('formatDate contract.date')
    expect(placeholders).not.toContain('if student.isMinor')

    // Простой плейсхолдер без хелпера должен быть
    expect(placeholders).toContain('contract.number')

    // Плейсхолдеры внутри хелперов НЕ извлекаются (по дизайну функции)
    expect(placeholders).not.toContain('contract.date')
    expect(placeholders).not.toContain('student.isMinor')

    // Длина должна быть 1 (только contract.number)
    expect(placeholders.length).toBe(1)
  })

  it('validateTemplateData() — проверяет обязательные поля', () => {
    const template = `
      <p>{{student.fullName}}</p>
      <p>{{student.email}}</p>
      <p>{{school.name}}</p>
    `

    const incompleteData: TemplateData = {
      student: {
        fullName: 'Иванов Иван',
        email: '', // Пустое значение
      },
      school: {
        // name отсутствует
      },
      contract: {},
    }

    const result = validateTemplateData(template, incompleteData)

    expect(result.valid).toBe(false)
    expect(result.missing).toContain('student.email')
    expect(result.missing).toContain('school.name')
  })
})

// ============================================
// Группа 2: Рендеринг
// ============================================

describe('Группа 2: Рендеринг', () => {
  it('renderTemplate() — подставляет данные студента', () => {
    const template = `<p>Имя: {{student.fullName}}</p>`

    const data: TemplateData = {
      student: {
        fullName: 'Иванов Иван Иванович',
      },
      school: {},
      contract: {},
    }

    const result = renderTemplate(template, data)

    expect(result.html).toContain('Иванов Иван Иванович')
    expect(result.usedPlaceholders).toContain('student.fullName')
    expect(result.missingPlaceholders.length).toBe(0)
  })

  it('renderTemplate() — подставляет данные школы', () => {
    const template = `
      <p>Школа: {{school.name}}</p>
      <p>ИНН: {{school.inn}}</p>
    `

    const data: TemplateData = {
      student: {},
      school: {
        name: 'Автошкола Направа',
        inn: '7707123456',
      },
      contract: {},
    }

    const result = renderTemplate(template, data)

    expect(result.html).toContain('Автошкола Направа')
    expect(result.html).toContain('7707123456')
    expect(result.usedPlaceholders).toContain('school.name')
    expect(result.usedPlaceholders).toContain('school.inn')
  })

  it('renderTemplate() — обрабатывает условные блоки {{#if}}', () => {
    const template = `
      {{#if student.isMinor}}
        <p>Несовершеннолетний</p>
      {{else}}
        <p>Совершеннолетний</p>
      {{/if}}
    `

    const minorData: TemplateData = {
      student: { isMinor: true },
      school: {},
      contract: {},
    }

    const adultData: TemplateData = {
      student: { isMinor: false },
      school: {},
      contract: {},
    }

    const minorResult = renderTemplate(template, minorData)
    const adultResult = renderTemplate(template, adultData)

    expect(minorResult.html).toContain('Несовершеннолетний')
    expect(minorResult.html).not.toContain('Совершеннолетний')

    expect(adultResult.html).toContain('Совершеннолетний')
    expect(adultResult.html).not.toContain('Несовершеннолетний')
  })

  it('Хелперы форматирования: formatMoney и formatDate', () => {
    const template = `
      <p>Цена: {{formatMoney contract.price}}</p>
      <p>Дата: {{formatDate contract.date}}</p>
    `

    const data: TemplateData = {
      student: {},
      school: {},
      contract: {
        price: 45000,
        date: new Date('2026-01-15'),
      },
    }

    const result = renderTemplate(template, data)

    // formatMoney должен форматировать число с разделителями
    expect(result.html).toContain('45') // Число должно быть отформатировано

    // formatDate должен форматировать дату в читаемый вид
    expect(result.html).toContain('2026') // Год должен присутствовать
  })
})

// ============================================
// Группа 3: Тестовые данные
// ============================================

describe('Группа 3: Тестовые данные', () => {
  it('createTestData() — возвращает полный набор данных для предпросмотра', () => {
    const testData = createTestData()

    // Проверяем наличие всех основных разделов
    expect(testData.student).toBeDefined()
    expect(testData.school).toBeDefined()
    expect(testData.contract).toBeDefined()

    // Проверяем ключевые поля студента
    expect(testData.student.fullName).toBe('Иванов Иван Иванович')
    expect(testData.student.passport?.series).toBeDefined()
    expect(testData.student.passport?.number).toBeDefined()

    // Проверяем ключевые поля школы
    expect(testData.school.name).toBe('Автошкола Направа')
    expect(testData.school.inn).toBeDefined()
    expect(testData.school.ogrn).toBeDefined()

    // Проверяем ключевые поля договора
    expect(testData.contract.number).toBeDefined()
    expect(testData.contract.price).toBe(45000)
  })
})
