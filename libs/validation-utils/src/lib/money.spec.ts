// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { createPriceSchema, optionalPriceSchema, priceSchema } from './money'

describe('priceSchema', () => {
  it('принимает число', () => {
    const result = priceSchema.safeParse(1500)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(1500)
    }
  })

  it('принимает числовую строку и преобразует в number', () => {
    const result = priceSchema.safeParse('1500')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(1500)
    }
  })

  it('принимает нижнюю границу 0', () => {
    expect(priceSchema.safeParse(0).success).toBe(true)
  })

  it('принимает верхнюю границу 100000000', () => {
    expect(priceSchema.safeParse(100000000).success).toBe(true)
  })

  it('отклоняет пустую строку', () => {
    const result = priceSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('отклоняет отрицательное число с сообщением про отрицательную сумму', () => {
    const result = priceSchema.safeParse(-5)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Сумма не может быть отрицательной')
    }
  })

  it('отклоняет сумму выше максимума с сообщением про слишком большую сумму', () => {
    const result = priceSchema.safeParse(100000001)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Сумма слишком большая')
    }
  })

  it('отклоняет нечисловую строку', () => {
    const result = priceSchema.safeParse('не число')
    expect(result.success).toBe(false)
  })
})

describe('createPriceSchema', () => {
  it('без опций ведёт себя как priceSchema (границы 0..100000000)', () => {
    const schema = createPriceSchema()
    expect(schema.safeParse(50).success).toBe(true)
    expect(schema.safeParse(-1).success).toBe(false)
    expect(schema.safeParse(100000001).success).toBe(false)
  })

  it('применяет кастомный max и кастомное сообщение', () => {
    const schema = createPriceSchema({ max: 1000, maxMessage: 'Цена не может превышать 1 000 ₽' })
    const result = schema.safeParse(1001)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Цена не может превышать 1 000 ₽')
    }
    expect(schema.safeParse(1000).success).toBe(true)
  })

  it('применяет кастомный min и кастомное сообщение', () => {
    const schema = createPriceSchema({ min: 100, minMessage: 'Минимум 100 ₽' })
    const result = schema.safeParse(50)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Минимум 100 ₽')
    }
    expect(schema.safeParse(100).success).toBe(true)
  })

  it('генерирует дефолтное сообщение из min/max, если своё не передано', () => {
    const schema = createPriceSchema({ max: 500 })
    const result = schema.safeParse(600)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Максимальная сумма — 500 ₽')
    }
  })
})

describe('optionalPriceSchema', () => {
  it('возвращает undefined для undefined', () => {
    const result = optionalPriceSchema.safeParse(undefined)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it('возвращает undefined для пустой строки', () => {
    const result = optionalPriceSchema.safeParse('')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it('принимает число', () => {
    const result = optionalPriceSchema.safeParse(1500)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(1500)
    }
  })

  it('отклоняет отрицательное число', () => {
    const result = optionalPriceSchema.safeParse(-1)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Сумма не может быть отрицательной')
    }
  })
})
