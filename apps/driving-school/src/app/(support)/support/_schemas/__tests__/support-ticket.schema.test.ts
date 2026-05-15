// globals: true — describe, expect, it доступны глобально

import {
  CloseTicketSchema,
  CreateTicketSchema,
  SendMessageSchema,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
} from '../support-ticket.schema'

describe('CreateTicketSchema', () => {
  describe('category', () => {
    it('принимает валидные категории', () => {
      const validCategories = ['HELP', 'BUG', 'FEATURE', 'OTHER']

      for (const category of validCategories) {
        const result = CreateTicketSchema.safeParse({
          category,
          subject: 'Тестовая тема',
          description: 'Это достаточно длинное описание проблемы для теста',
        })
        expect(result.success).toBe(true)
      }
    })

    it('отклоняет невалидную категорию', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'INVALID',
        subject: 'Тестовая тема',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(false)
    })

    it('отклоняет пустую категорию', () => {
      const result = CreateTicketSchema.safeParse({
        category: '',
        subject: 'Тестовая тема',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('subject', () => {
    it('принимает тему от 5 до 100 символов', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Нормальная тема',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(true)
    })

    it('отклоняет слишком короткую тему', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Ко',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(false)
    })

    it('отклоняет слишком длинную тему', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'А'.repeat(101),
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(false)
    })

    it('обрезает пробелы по краям', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: '  Тема с пробелами  ',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.subject).toBe('Тема с пробелами')
      }
    })
  })

  describe('description', () => {
    it('принимает описание от 20 до 2000 символов', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Тестовая тема',
        description: 'Это достаточно длинное описание проблемы для теста',
      })
      expect(result.success).toBe(true)
    })

    it('отклоняет слишком короткое описание', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Тестовая тема',
        description: 'Короткое',
      })
      expect(result.success).toBe(false)
    })

    it('отклоняет слишком длинное описание', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Тестовая тема',
        description: 'А'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })

    it('обрезает пробелы по краям', () => {
      const result = CreateTicketSchema.safeParse({
        category: 'HELP',
        subject: 'Тестовая тема',
        description: '  Это достаточно длинное описание с пробелами  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe('Это достаточно длинное описание с пробелами')
      }
    })
  })
})

describe('SendMessageSchema', () => {
  it('принимает валидные данные', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: 'cuid123456',
      content: 'Текст сообщения',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустой ticketId', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: '',
      content: 'Текст сообщения',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет пустое сообщение', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: 'cuid123456',
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет сообщение из только пробелов', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: 'cuid123456',
      content: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет слишком длинное сообщение', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: 'cuid123456',
      content: 'А'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('обрезает пробелы по краям', () => {
    const result = SendMessageSchema.safeParse({
      ticketId: 'cuid123456',
      content: '  Сообщение с пробелами  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe('Сообщение с пробелами')
    }
  })
})

describe('CloseTicketSchema', () => {
  it('принимает валидный ticketId', () => {
    const result = CloseTicketSchema.safeParse({
      ticketId: 'cuid123456',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустой ticketId', () => {
    const result = CloseTicketSchema.safeParse({
      ticketId: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('Константы', () => {
  it('TICKET_CATEGORY_LABELS содержит все категории', () => {
    expect(TICKET_CATEGORY_LABELS).toHaveProperty('HELP')
    expect(TICKET_CATEGORY_LABELS).toHaveProperty('BUG')
    expect(TICKET_CATEGORY_LABELS).toHaveProperty('FEATURE')
    expect(TICKET_CATEGORY_LABELS).toHaveProperty('OTHER')
  })

  it('TICKET_STATUS_LABELS содержит все статусы', () => {
    expect(TICKET_STATUS_LABELS).toHaveProperty('OPEN')
    expect(TICKET_STATUS_LABELS).toHaveProperty('IN_PROGRESS')
    expect(TICKET_STATUS_LABELS).toHaveProperty('RESOLVED')
    expect(TICKET_STATUS_LABELS).toHaveProperty('CLOSED')
  })
})
