import { describe, expect, it } from 'vitest'
import { resolveFieldType } from './field-type-mapper'
import type { SchemaFieldInfo } from './schema-traversal'

describe('resolveFieldType', () => {
  it('возвращает fieldType из meta если указан', () => {
    const field: SchemaFieldInfo = {
      path: 'bio',
      name: 'bio',
      zodType: 'string',
      required: true,
      constraints: {},
      ui: {
        title: 'Биография',
        fieldType: 'richText',
      },
    }

    expect(resolveFieldType(field)).toBe('richText')
  })

  it('маппит string на string', () => {
    const field: SchemaFieldInfo = {
      path: 'name',
      name: 'name',
      zodType: 'string',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('string')
  })

  it('маппит длинную строку на textarea', () => {
    const field: SchemaFieldInfo = {
      path: 'description',
      name: 'description',
      zodType: 'string',
      required: true,
      constraints: {
        string: {
          maxLength: 500,
        },
      },
    }

    expect(resolveFieldType(field)).toBe('textarea')
  })

  it('маппит number на number', () => {
    const field: SchemaFieldInfo = {
      path: 'age',
      name: 'age',
      zodType: 'number',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('number')
  })

  it('маппит int на number', () => {
    const field: SchemaFieldInfo = {
      path: 'count',
      name: 'count',
      zodType: 'int',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('number')
  })

  it('маппит boolean на checkbox', () => {
    const field: SchemaFieldInfo = {
      path: 'isActive',
      name: 'isActive',
      zodType: 'boolean',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('checkbox')
  })

  it('маппит date на date', () => {
    const field: SchemaFieldInfo = {
      path: 'createdAt',
      name: 'createdAt',
      zodType: 'date',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('date')
  })

  it('маппит enum на nativeSelect', () => {
    const field: SchemaFieldInfo = {
      path: 'role',
      name: 'role',
      zodType: 'enum',
      required: true,
      constraints: {},
      enumValues: ['admin', 'user'],
    }

    expect(resolveFieldType(field)).toBe('nativeSelect')
  })

  it('маппит массив строк на tags', () => {
    const field: SchemaFieldInfo = {
      path: 'tags',
      name: 'tags',
      zodType: 'array',
      required: true,
      constraints: {},
      element: {
        path: 'tags[*]',
        name: '*',
        zodType: 'string',
        required: true,
        constraints: {},
      },
    }

    expect(resolveFieldType(field)).toBe('tags')
  })

  it('fieldType из meta имеет приоритет над Zod типом', () => {
    const field: SchemaFieldInfo = {
      path: 'isActive',
      name: 'isActive',
      zodType: 'boolean',
      required: true,
      constraints: {},
      ui: {
        fieldType: 'switch', // Переопределяем checkbox на switch
      },
    }

    expect(resolveFieldType(field)).toBe('switch')
  })

  it('возвращает string для неизвестного типа', () => {
    const field: SchemaFieldInfo = {
      path: 'unknown',
      name: 'unknown',
      zodType: 'unknown',
      required: true,
      constraints: {},
    }

    expect(resolveFieldType(field)).toBe('string')
  })
})
