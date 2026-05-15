import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { buildValidators } from './form-validators'

describe('buildValidators', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
  })

  it('возвращает undefined если схема не указана', () => {
    expect(buildValidators(null)).toBeUndefined()
    expect(buildValidators(undefined)).toBeUndefined()
  })

  it('возвращает onChange по умолчанию', () => {
    const result = buildValidators(TestSchema)

    expect(result).toEqual({ onChange: TestSchema })
  })

  it('поддерживает режим change', () => {
    const result = buildValidators(TestSchema, 'change')

    expect(result).toEqual({ onChange: TestSchema })
  })

  it('поддерживает режим blur', () => {
    const result = buildValidators(TestSchema, 'blur')

    expect(result).toEqual({ onBlur: TestSchema })
  })

  it('поддерживает режим submit', () => {
    const result = buildValidators(TestSchema, 'submit')

    expect(result).toEqual({ onSubmit: TestSchema })
  })

  it('поддерживает режим mount', () => {
    const result = buildValidators(TestSchema, 'mount')

    expect(result).toEqual({ onMount: TestSchema })
  })

  it('поддерживает массив режимов', () => {
    const result = buildValidators(TestSchema, ['change', 'blur'])

    expect(result).toEqual({
      onChange: TestSchema,
      onBlur: TestSchema,
    })
  })

  it('поддерживает все режимы одновременно', () => {
    const result = buildValidators(TestSchema, ['change', 'blur', 'submit', 'mount'])

    expect(result).toEqual({
      onChange: TestSchema,
      onBlur: TestSchema,
      onSubmit: TestSchema,
      onMount: TestSchema,
    })
  })

  it('возвращает undefined для пустого массива режимов', () => {
    const result = buildValidators(TestSchema, [])

    expect(result).toBeUndefined()
  })

  it('работает с любой Zod схемой', () => {
    const StringSchema = z.string().email()
    const NumberSchema = z.number().min(0).max(100)
    const ComplexSchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
      tags: z.array(z.string()),
    })

    expect(buildValidators(StringSchema)).toEqual({ onChange: StringSchema })
    expect(buildValidators(NumberSchema, 'blur')).toEqual({ onBlur: NumberSchema })
    expect(buildValidators(ComplexSchema, 'submit')).toEqual({ onSubmit: ComplexSchema })
  })
})
