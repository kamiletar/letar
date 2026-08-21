import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { isOptionalSchema, unwrapSchemaWithRequired } from './zod-utils'

describe('unwrapSchemaWithRequired', () => {
  it('обычное optional-поле — required: false', () => {
    const result = unwrapSchemaWithRequired(z.string().optional())
    expect(result.required).toBe(false)
  })

  it('обязательное поле — required: true', () => {
    const result = unwrapSchemaWithRequired(z.string())
    expect(result.required).toBe(true)
  })

  it(".optional().or(z.literal('')) — required: false (паттерн опционального email/url)", () => {
    const schema = z.email().optional().or(z.literal(''))
    const result = unwrapSchemaWithRequired(schema)
    expect(result.required).toBe(false)
    // Успешная валидация допустимого значения после unwrap
    expect(result.schema.safeParse('test@example.com').success).toBe(true)
  })

  it(".nullable().or(z.literal('')) — тот же паттерн с nullable", () => {
    const schema = z.string().nullable().or(z.literal(''))
    const result = unwrapSchemaWithRequired(schema)
    expect(result.required).toBe(false)
  })

  it('union БЕЗ optional-ветки (z.string().or(z.number())) остаётся required', () => {
    const schema = z.string().or(z.number())
    const result = unwrapSchemaWithRequired(schema)
    expect(result.required).toBe(true)
  })

  it('union из двух optional-веток (неоднозначно) остаётся required — консервативный случай', () => {
    const schema = z.union([z.string().optional(), z.number().optional()])
    const result = unwrapSchemaWithRequired(schema)
    expect(result.required).toBe(true)
  })

  it('z.enum(...) не задет — enum это отдельный zod-type, не union', () => {
    const schema = z.enum(['a', 'b', 'c'])
    const result = unwrapSchemaWithRequired(schema)
    expect(result.required).toBe(true)
  })
})

describe('isOptionalSchema', () => {
  it('true для .optional()', () => {
    expect(isOptionalSchema(z.string().optional())).toBe(true)
  })

  it("true для .optional().or(z.literal(''))", () => {
    expect(isOptionalSchema(z.email().optional().or(z.literal('')))).toBe(true)
  })

  it('false для обязательного поля', () => {
    expect(isOptionalSchema(z.string())).toBe(false)
  })

  it('false для z.enum(...)', () => {
    expect(isOptionalSchema(z.enum(['a', 'b']))).toBe(false)
  })
})
