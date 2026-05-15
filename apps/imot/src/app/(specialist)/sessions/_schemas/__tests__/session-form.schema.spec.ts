import { describe, expect, it } from 'vitest'
import { SessionFormSchema } from '../session-form.schema'

describe('SessionFormSchema', () => {
  it('принимает минимальные валидные данные', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.duration).toBe(60) // дефолт
      expect(result.data.status).toBe('SCHEDULED') // дефолт
    }
  })

  it('принимает все поля', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
      duration: 90,
      status: 'COMPLETED',
      topic: 'Работа с тревожностью',
      notes: 'Клиент спокойный',
      homework: 'Дневник эмоций',
      meetingUrl: 'https://zoom.us/j/123',
      paymentUrl: 'https://pay.example.com/123',
      paymentStatus: 'paid',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустой clientId', () => {
    const result = SessionFormSchema.safeParse({
      clientId: '',
      scheduledAt: '2026-03-25T10:00',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет пустую дату', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный статус', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
      status: 'INVALID_STATUS',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный meetingUrl', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
      meetingUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('принимает пустую строку для meetingUrl', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
      meetingUrl: '',
    })
    expect(result.success).toBe(true)
  })

  it('coerce преобразует строковый duration в число', () => {
    const result = SessionFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      scheduledAt: '2026-03-25T10:00',
      duration: '45',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.duration).toBe(45)
    }
  })
})
