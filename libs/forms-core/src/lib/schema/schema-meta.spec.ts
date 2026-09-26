import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { getFieldMeta, resolveEmptyValue } from './schema-meta'

describe('getFieldMeta', () => {
  it('извлекает ui из простого поля', () => {
    const schema = z.object({
      title: z.string().meta({ ui: { title: 'Название' } }),
    })

    expect(getFieldMeta(schema, 'title')).toEqual({
      ui: { title: 'Название' },
      required: true,
    })
  })

  it('optional-поле без meta не обязательно', () => {
    const schema = z.object({
      subtitle: z.string().optional(),
    })

    expect(getFieldMeta(schema, 'subtitle')).toEqual({
      ui: undefined,
      required: false,
    })
  })

  it('находит ui.options на enum-схеме, обёрнутой в .nullable().optional() (bug: aboi Product.mood)', () => {
    // @letar/zenstack-form-plugin генерирует именно такую обёртку для nullable enum-полей —
    // мета висит на enum-схеме ДО .nullable()/.optional(), Zod v4 registry ключуется по
    // идентичности объекта и не видит меты внутренней схемы через обёртку
    const moodSchema = z.enum(['happy', 'sad']).meta({
      ui: {
        options: [
          { value: 'happy', label: 'Радость' },
          { value: 'sad', label: 'Грусть' },
        ],
      },
    })

    const schema = z.object({
      mood: moodSchema.nullable().optional(),
    })

    const result = getFieldMeta(schema, 'mood')

    expect(result.required).toBe(false)
    expect(result.ui?.options).toEqual([
      { value: 'happy', label: 'Радость' },
      { value: 'sad', label: 'Грусть' },
    ])
  })

  it('meta на самой обёртке (.default().meta()) не перебивается разворачиванием', () => {
    const schema = z.object({
      status: z
        .enum(['draft', 'published'])
        .default('draft')
        .meta({ ui: { title: 'Статус (с дефолтом)' } }),
    })

    const result = getFieldMeta(schema, 'status')

    expect(result.ui?.title).toBe('Статус (с дефолтом)')
  })

  it('несуществующий путь возвращает required: false без meta', () => {
    const schema = z.object({ title: z.string() })

    expect(getFieldMeta(schema, 'missing')).toEqual({ required: false })
  })
})

describe('nullable и resolveEmptyValue', () => {
  const schema = z.object({
    plain: z.string(),
    optionalOnly: z.string().optional(),
    nullableField: z.string().nullable(),
    nullish: z.string().nullable().optional(),
    nullableOrEmpty: z.string().nullable().or(z.literal('')),
    nested: z.object({ inner: z.number().nullable() }),
  })

  it('getFieldMeta.nullable: true только для nullable-схемы', () => {
    expect(getFieldMeta(schema, 'plain').nullable).toBeUndefined()
    expect(getFieldMeta(schema, 'optionalOnly').nullable).toBeUndefined()
    expect(getFieldMeta(schema, 'nullableField').nullable).toBe(true)
    expect(getFieldMeta(schema, 'nullish').nullable).toBe(true)
    expect(getFieldMeta(schema, 'nullableOrEmpty').nullable).toBe(true)
    expect(getFieldMeta(schema, 'nested.inner').nullable).toBe(true)
  })

  it('resolveEmptyValue: null для nullable, иначе "" / 0', () => {
    expect(resolveEmptyValue(schema, 'nullableField')).toBeNull()
    expect(resolveEmptyValue(schema, 'nullableField', 'number')).toBeNull()
    expect(resolveEmptyValue(schema, 'plain')).toBe('')
    expect(resolveEmptyValue(schema, 'plain', 'number')).toBe(0)
    expect(resolveEmptyValue(schema, 'optionalOnly')).toBe('')
    expect(resolveEmptyValue(undefined, 'x')).toBe('')
  })
})
