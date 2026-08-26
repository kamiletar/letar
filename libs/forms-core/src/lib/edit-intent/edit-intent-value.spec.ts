import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { editIntentValueSchema, emptyEditIntentValue, startEditIntentValue } from './edit-intent-value'

describe('editIntentValueSchema', () => {
  const schema = editIntentValueSchema(z.string().min(20))

  it('принимает ветку isEdited: false с value: null', () => {
    const result = schema.safeParse({ isEdited: false, value: null })
    expect(result.success).toBe(true)
  })

  it('принимает ветку isEdited: true с валидным value', () => {
    const result = schema.safeParse({ isEdited: true, value: 'sk_live_1234567890abcdef' })
    expect(result.success).toBe(true)
  })

  it('отклоняет isEdited: false с непустым value', () => {
    const result = schema.safeParse({ isEdited: false, value: 'sk_live_1234567890abcdef' })
    expect(result.success).toBe(false)
  })

  it('отклоняет isEdited: true с невалидным T (короче min(20))', () => {
    const result = schema.safeParse({ isEdited: true, value: 'short' })
    expect(result.success).toBe(false)
  })

  it('отклоняет isEdited: true с value: null', () => {
    const result = schema.safeParse({ isEdited: true, value: null })
    expect(result.success).toBe(false)
  })

  it('strip — лишние ключи не проходят ни в одной ветке', () => {
    const notEdited = schema.parse({ isEdited: false, value: null, secretMask: '****' })
    expect(notEdited).toEqual({ isEdited: false, value: null })

    const edited = schema.parse({ isEdited: true, value: 'sk_live_1234567890abcdef', extra: 'x' })
    expect(edited).toEqual({ isEdited: true, value: 'sk_live_1234567890abcdef' })
  })

  it('JSON round-trip сохраняет форму значения', () => {
    const value = { isEdited: true, value: 'sk_live_1234567890abcdef' }
    const parsed = schema.parse(JSON.parse(JSON.stringify(value)))
    expect(parsed).toEqual(value)
  })

  it('работает с составным object T, не только со string', () => {
    const objectSchema = editIntentValueSchema(z.object({ clientId: z.string(), clientSecret: z.string() }).strip())
    const result = objectSchema.safeParse({
      isEdited: true,
      value: { clientId: 'id', clientSecret: 'secret' },
    })
    expect(result.success).toBe(true)
  })
})

describe('emptyEditIntentValue / startEditIntentValue', () => {
  it('emptyEditIntentValue — стартовое view-mode значение', () => {
    expect(emptyEditIntentValue()).toEqual({ isEdited: false, value: null })
  })

  it('startEditIntentValue — стартовое create-mode значение с пустым value', () => {
    expect(startEditIntentValue('')).toEqual({ isEdited: true, value: '' })
  })
})
