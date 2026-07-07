import { describe, expect, it } from 'vitest'
import { ProfessionalLeadSchema } from './professional-lead.schema'

describe('ProfessionalLeadSchema', () => {
  it('принимает валидную заявку', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'Ирина',
      email: 'irina@example.com',
      consentPdn: true,
      locale: 'ru',
      source: 'express-cta',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет заявку без согласия на обработку ПДн', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'Ирина',
      email: 'irina@example.com',
      consentPdn: false,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет некорректный email', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'Ирина',
      email: 'not-an-email',
      consentPdn: true,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет слишком короткое имя', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'И',
      email: 'irina@example.com',
      consentPdn: true,
    })
    expect(result.success).toBe(false)
  })

  it('срезает лишние поля (.strip())', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'Ирина',
      email: 'irina@example.com',
      consentPdn: true,
      role: 'ADMIN',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('role')
    }
  })

  it('locale и source опциональны', () => {
    const result = ProfessionalLeadSchema.safeParse({
      name: 'Ирина',
      email: 'irina@example.com',
      consentPdn: true,
    })
    expect(result.success).toBe(true)
  })
})
