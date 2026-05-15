import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { filterFields, getFieldPaths, traverseSchema } from './schema-traversal'

describe('traverseSchema', () => {
  it('обходит простую схему', () => {
    const schema = z.object({
      firstName: z.string(),
      age: z.number(),
      isActive: z.boolean(),
    })

    const fields = traverseSchema(schema)

    expect(fields).toHaveLength(3)
    expect(fields[0]).toMatchObject({
      path: 'firstName',
      name: 'firstName',
      zodType: 'string',
      required: true,
    })
    expect(fields[1]).toMatchObject({
      path: 'age',
      name: 'age',
      zodType: 'number',
      required: true,
    })
    expect(fields[2]).toMatchObject({
      path: 'isActive',
      name: 'isActive',
      zodType: 'boolean',
      required: true,
    })
  })

  it('извлекает UI метаданные из .meta()', () => {
    const schema = z.object({
      firstName: z.string().meta({
        ui: {
          title: 'Имя',
          placeholder: 'Введите имя',
          description: 'Ваше имя',
        },
      }),
    })

    const fields = traverseSchema(schema)

    expect(fields[0].ui).toEqual({
      title: 'Имя',
      placeholder: 'Введите имя',
      description: 'Ваше имя',
    })
  })

  it('извлекает fieldType из meta', () => {
    const schema = z.object({
      bio: z.string().meta({
        ui: {
          title: 'Биография',
          fieldType: 'richText',
        },
      }),
    })

    const fields = traverseSchema(schema)

    expect(fields[0].ui?.fieldType).toBe('richText')
  })

  it('определяет optional поля как необязательные', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
      nullable: z.string().nullable(),
      withDefault: z.string().default('test'),
    })

    const fields = traverseSchema(schema)

    expect(fields.find((f) => f.name === 'required')?.required).toBe(true)
    expect(fields.find((f) => f.name === 'optional')?.required).toBe(false)
    expect(fields.find((f) => f.name === 'nullable')?.required).toBe(false)
    expect(fields.find((f) => f.name === 'withDefault')?.required).toBe(false)
  })

  it('обходит вложенные объекты', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        city: z.string(),
        zip: z.string(),
      }),
    })

    const fields = traverseSchema(schema)

    expect(fields).toHaveLength(2)
    expect(fields[1]).toMatchObject({
      path: 'address',
      name: 'address',
      zodType: 'object',
    })
    expect(fields[1].children).toHaveLength(2)
    expect(fields[1].children?.[0]).toMatchObject({
      path: 'address.city',
      name: 'city',
      zodType: 'string',
    })
    expect(fields[1].children?.[1]).toMatchObject({
      path: 'address.zip',
      name: 'zip',
      zodType: 'string',
    })
  })

  it('обходит массивы примитивов', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    })

    const fields = traverseSchema(schema)

    expect(fields[0]).toMatchObject({
      path: 'tags',
      name: 'tags',
      zodType: 'array',
    })
    expect(fields[0].element).toMatchObject({
      path: 'tags[*]',
      name: '*',
      zodType: 'string',
    })
  })

  it('обходит массивы объектов', () => {
    const schema = z.object({
      contacts: z.array(
        z.object({
          phone: z.string(),
          email: z.string(),
        })
      ),
    })

    const fields = traverseSchema(schema)

    expect(fields[0]).toMatchObject({
      path: 'contacts',
      name: 'contacts',
      zodType: 'array',
    })
    expect(fields[0].element?.zodType).toBe('object')
    expect(fields[0].element?.children).toHaveLength(2)
    expect(fields[0].element?.children?.[0]).toMatchObject({
      path: 'contacts[*].phone',
      name: 'phone',
      zodType: 'string',
    })
  })

  it('извлекает enum значения', () => {
    const schema = z.object({
      role: z.enum(['admin', 'user', 'guest']),
    })

    const fields = traverseSchema(schema)

    expect(fields[0]).toMatchObject({
      path: 'role',
      name: 'role',
      zodType: 'enum',
    })
    expect(fields[0].enumValues).toEqual(['admin', 'user', 'guest'])
  })

  it('возвращает пустой массив для не-object схемы', () => {
    const schema = z.string()
    const fields = traverseSchema(schema)
    expect(fields).toEqual([])
  })
})

describe('getFieldPaths', () => {
  it('возвращает пути всех полей рекурсивно', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        city: z.string(),
        zip: z.string(),
      }),
    })

    const fields = traverseSchema(schema)
    const paths = getFieldPaths(fields)

    expect(paths).toEqual(['name', 'address', 'address.city', 'address.zip'])
  })

  it('возвращает только топ-левел пути при recursive=false', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        city: z.string(),
        zip: z.string(),
      }),
    })

    const fields = traverseSchema(schema)
    const paths = getFieldPaths(fields, false)

    expect(paths).toEqual(['name', 'address'])
  })
})

describe('filterFields', () => {
  it('фильтрует по include', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    })

    const fields = traverseSchema(schema)
    const filtered = filterFields(fields, { include: ['firstName', 'lastName'] })

    expect(filtered).toHaveLength(2)
    expect(filtered.map((f) => f.name)).toEqual(['firstName', 'lastName'])
  })

  it('фильтрует по exclude', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    })

    const fields = traverseSchema(schema)
    const filtered = filterFields(fields, { exclude: ['age'] })

    expect(filtered).toHaveLength(2)
    expect(filtered.map((f) => f.name)).toEqual(['firstName', 'lastName'])
  })

  it('комбинирует include и exclude', () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
    })

    const fields = traverseSchema(schema)
    const filtered = filterFields(fields, { include: ['a', 'b'], exclude: ['b'] })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('a')
  })
})
