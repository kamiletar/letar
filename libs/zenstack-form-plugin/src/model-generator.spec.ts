import type { DataField, DataModel } from '@zenstackhq/language/ast'
import { describe, expect, it } from 'vitest'
import { extractModelInfo, generateModelCode } from './model-generator.js'
import type { ModelFieldInfo, ModelInfo } from './types.js'

// ─── Фикстуры AST для extractModelInfo ─────────────────────────────────────

/**
 * Минимальное поле DataField. Реальный Langium AstNode несёт служебные поля
 * ($container, $cstNode...), но getFieldType/isRequired/isList/getDefaultValue
 * читают только type/attributes/comments/name — этого достаточно для теста.
 */
function makeField(overrides: {
  name: string
  type: string
  optional?: boolean
  array?: boolean
  reference?: string
  comments?: string[]
  attributes?: Array<{ refText: string; args?: unknown[] }>
}): DataField {
  const { name, type, optional = false, array = false, reference, comments = [], attributes = [] } = overrides

  return {
    $type: 'DataField',
    name,
    comments,
    params: [],
    type: reference
      ? { $type: 'DataFieldType', array, optional, reference: { ref: { name: reference } } }
      : { $type: 'DataFieldType', array, optional, type },
    attributes: attributes.map((a) => ({
      $type: 'DataFieldAttribute',
      decl: { $refText: a.refText },
      args: a.args ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function makeModel(name: string, fields: DataField[]): DataModel {
  return {
    $type: 'DataModel',
    name,
    comments: [],
    attributes: [],
    isView: false,
    mixins: [],
    fields,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('extractModelInfo', () => {
  const enumNames = new Set(['RecipeType'])

  it('исключает системные поля id/createdAt/updatedAt', () => {
    const model = makeModel('Product', [
      makeField({ name: 'id', type: 'String', attributes: [{ refText: 'id' }] }),
      makeField({ name: 'createdAt', type: 'DateTime' }),
      makeField({ name: 'updatedAt', type: 'DateTime' }),
      makeField({ name: 'name', type: 'String' }),
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.excludedFields).toEqual(expect.arrayContaining(['id', 'createdAt', 'updatedAt']))
    expect(info.fields.map((f) => f.name)).toEqual(['name'])
  })

  it('исключает FK-поле с атрибутом @relation', () => {
    const model = makeModel('Order', [
      makeField({ name: 'authorId', type: 'String', attributes: [{ refText: 'relation' }] }),
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.excludedFields).toContain('authorId')
    expect(info.fields).toHaveLength(0)
  })

  it('исключает поле-ссылку на модель без @form.relation', () => {
    const model = makeModel('Order', [
      makeField({ name: 'author', type: 'User', reference: 'User' }),
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.excludedFields).toContain('author')
  })

  it('оставляет поле-ссылку на модель, если задан @form.relation', () => {
    const model = makeModel('Order', [
      makeField({
        name: 'author',
        type: 'User',
        reference: 'User',
        comments: ['@form.relation({ model: "User", labelField: "name" })'],
      }),
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.excludedFields).not.toContain('author')
    expect(info.fields[0]?.formMeta.relation).toEqual({ model: 'User', labelField: 'name' })
  })

  it('исключает поле с @form.exclude', () => {
    const model = makeModel('Product', [
      makeField({ name: 'secret', type: 'String', comments: ['@form.exclude'] }),
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.excludedFields).toContain('secret')
  })

  it('распознаёт enum-поле по имени типа из enumNames', () => {
    const model = makeModel('Product', [
      makeField({ name: 'category', type: 'RecipeType', reference: 'RecipeType' }),
    ])

    const info = extractModelInfo(model, enumNames)
    const field = info.fields[0]

    expect(field?.isEnum).toBe(true)
    expect(field?.enumName).toBe('RecipeType')
  })

  it('корректно определяет isRequired/isList из DataFieldType', () => {
    const model = makeModel('Product', [
      makeField({ name: 'tags', type: 'String', array: true }),
      makeField({ name: 'note', type: 'String', optional: true }),
      makeField({ name: 'name', type: 'String' }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    expect(byName.tags?.isList).toBe(true)
    expect(byName.note?.isRequired).toBe(false)
    expect(byName.name?.isRequired).toBe(true)
  })

  it('извлекает default-значения разных типов из атрибута @default', () => {
    const model = makeModel('Product', [
      makeField({
        name: 'isActive',
        type: 'Boolean',
        attributes: [{ refText: '@default', args: [{ value: { $type: 'BooleanLiteral', value: true } }] }],
      }),
      makeField({
        name: 'score',
        type: 'Int',
        attributes: [{ refText: '@default', args: [{ value: { $type: 'NumberLiteral', value: '5' } }] }],
      }),
      makeField({
        name: 'label',
        type: 'String',
        attributes: [{ refText: '@default', args: [{ value: { $type: 'StringLiteral', value: 'hello' } }] }],
      }),
      makeField({ name: 'noDefault', type: 'String' }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    expect(byName.isActive?.defaultValue).toBe(true)
    expect(byName.score?.defaultValue).toBe(5)
    expect(byName.label?.defaultValue).toBe('hello')
    expect(byName.noDefault?.defaultValue).toBeUndefined()
  })

  it('прокидывает formMeta из комментариев поля', () => {
    const model = makeModel('Product', [
      makeField({ name: 'name', type: 'String', comments: ['@form.title("Название")'] }),
    ])

    const info = extractModelInfo(model, enumNames)
    expect(info.fields[0]?.formMeta.title).toBe('Название')
  })
})

// ─── Тесты generateModelCode (чистая функция, ModelInfo → строка) ──────────

function field(overrides: Partial<ModelFieldInfo> & { name: string; type: string }): ModelFieldInfo {
  return {
    isRequired: true,
    isList: false,
    isEnum: false,
    formMeta: {},
    ...overrides,
  }
}

describe('generateModelCode', () => {
  it('маппит примитивные Prisma-типы на Zod-типы', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({ name: 'name', type: 'String' }),
        field({ name: 'count', type: 'Int' }),
        field({ name: 'weight', type: 'Float' }),
        field({ name: 'active', type: 'Boolean' }),
        field({ name: 'born', type: 'DateTime' }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())

    expect(code).toContain('name: z.string()')
    expect(code).toContain('count: z.number().int()')
    expect(code).toContain('weight: z.number()')
    expect(code).toContain('active: z.boolean()')
    expect(code).toContain('born: z.date()')
  })

  it('оборачивает опциональные поля в .nullable().optional()', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'note', type: 'String', isRequired: false })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('note: z.string().nullable().optional()')
  })

  it('оборачивает списки в z.array()', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'tags', type: 'String', isList: true })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('tags: z.array(z.string())')
  })

  it('применяет числовые constraints (min/max/step/positive/negative)', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({
          name: 'price',
          type: 'Float',
          formMeta: { constraints: { min: 0, max: 1000, step: 0.5, positive: true } },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('price: z.number().min(0).max(1000).multipleOf(0.5).positive()')
  })

  it('применяет строковые constraints (minLength/maxLength/pattern/email/url/uuid)', () => {
    const modelInfo: ModelInfo = {
      name: 'User',
      excludedFields: [],
      fields: [
        field({
          name: 'email',
          type: 'String',
          formMeta: { constraints: { email: true, minLength: 5, maxLength: 100 } },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('email: z.string().min(5).max(100).email()')
  })

  it('не применяет числовые constraints к строковому полю и наоборот', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({ name: 'name', type: 'String', formMeta: { constraints: { min: 5, positive: true } } }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    // Числовые constraints игнорируются на строковом поле — остаётся голый z.string()
    expect(code).toMatch(/name: z\.string\(\)(?!\.min)/)
  })

  it('генерирует default-значения разных типов', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({ name: 'isActive', type: 'Boolean', defaultValue: true }),
        field({ name: 'score', type: 'Int', defaultValue: 5 }),
        field({ name: 'label', type: 'String', defaultValue: 'hello' }),
        field({ name: 'big', type: 'BigInt', defaultValue: 10 }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('isActive: z.boolean().default(true)')
    expect(code).toContain('score: z.number().int().default(5)')
    expect(code).toContain(`label: z.string().default('hello')`)
    expect(code).toContain('big: z.bigint().default(BigInt(10))')
  })

  it('использует enum-схему и импортирует её файл для enum-полей', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'category', type: 'RecipeType', isEnum: true, enumName: 'RecipeType' })],
    }

    const code = generateModelCode(modelInfo, new Set(['RecipeType']))
    expect(code).toContain("import { RecipeTypeFormSchema } from './enums/RecipeType.form'")
    expect(code).toContain('category: RecipeTypeFormSchema')
  })

  it('генерирует UI meta с title/placeholder/description/fieldType', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({
          name: 'name',
          type: 'String',
          formMeta: { title: 'Название', placeholder: 'Введите', description: 'Помощь', fieldType: 'text' },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain(`title: 'Название'`)
    expect(code).toContain(`placeholder: 'Введите'`)
    expect(code).toContain(`description: 'Помощь'`)
    expect(code).toContain(`fieldType: 'text'`)
  })

  it('не добавляет .meta() блок, если formMeta пуст', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String' })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).not.toContain('.meta(')
  })

  it('добавляет i18nKey в UI meta, когда i18n включён', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String', formMeta: { title: 'Название' } })],
    }

    const code = generateModelCode(modelInfo, new Set(), {
      enabled: true,
      output: './messages',
      defaultLocale: 'en',
      locales: ['en'],
    })
    expect(code).toContain(`i18nKey: 'Product.name'`)
  })

  it('кладёт relation в fieldProps', () => {
    const modelInfo: ModelInfo = {
      name: 'Order',
      excludedFields: [],
      fields: [
        field({
          name: 'authorId',
          type: 'String',
          formMeta: { relation: { model: 'User', labelField: 'name' } },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain(`fieldProps: { relation: {"model":"User","labelField":"name"} }`)
  })

  it('генерирует Create/Update схемы, ExcludedFields и типы', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: ['id', 'createdAt'],
      fields: [field({ name: 'name', type: 'String' })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('export const ProductCreateFormSchema = z.object({')
    expect(code).toContain('export const ProductUpdateFormSchema = ProductCreateFormSchema.partial()')
    expect(code).toContain(`export const ProductExcludedFields = ['id', 'createdAt'] as const`)
    expect(code).toContain('export type ProductCreateForm = z.infer<typeof ProductCreateFormSchema>')
    expect(code).toContain('export type ProductUpdateForm = z.infer<typeof ProductUpdateFormSchema>')
  })

  it('падает обратно на z.string() для неизвестного примитивного типа', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'weird', type: 'SomeUnknownType' })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('weird: z.string()')
  })
})
