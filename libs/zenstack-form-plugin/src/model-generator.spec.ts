import type { DataField, DataModel } from '@zenstackhq/language/ast'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function makeModel(
  name: string,
  fields: DataField[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelAttributes: Array<{ refText: string; args?: unknown[] }> = [],
): DataModel {
  return {
    $type: 'DataModel',
    name,
    comments: [],
    attributes: modelAttributes.map((a) => ({
      $type: 'DataModelAttribute',
      decl: { $refText: a.refText },
      args: a.args ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any,
    isView: false,
    mixins: [],
    fields,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

// ─── Фикстуры Expression AST для `@@validate` ──────────────────────────────

const strLit = (value: string) => ({ $type: 'StringLiteral', value })
const boolLit = (value: boolean) => ({ $type: 'BooleanLiteral', value })
const fieldRef = (name: string) => ({ $type: 'ReferenceExpr', target: { $refText: name }, args: [] })
const binary = (op: string, left: unknown, right: unknown) => ({ $type: 'BinaryExpr', operator: op, left, right })
const strArr = (items: string[]) => ({ $type: 'ArrayExpr', items: items.map(strLit) })

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

  // ─── Наследование нативных ZModel-атрибутов валидации ────────────────────

  function numberArg(value: number): { value: { $type: string; value: string } } {
    return { value: { $type: 'NumberLiteral', value: String(value) } }
  }

  function stringArg(value: string): { value: { $type: string; value: string } } {
    return { value: { $type: 'StringLiteral', value } }
  }

  it('наследует @email/@length/@regex как constraints без @form.props', () => {
    const model = makeModel('User', [
      makeField({ name: 'email', type: 'String', attributes: [{ refText: '@email' }] }),
      makeField({
        name: 'name',
        type: 'String',
        attributes: [{ refText: '@length', args: [numberArg(2), numberArg(50)] }],
      }),
      makeField({
        name: 'code',
        type: 'String',
        attributes: [{ refText: '@regex', args: [stringArg('^[A-Z]+$')] }],
      }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    // Фаза 1 (v2.4.0, A3) — String/Int/Float/BigInt больше не идут в constraints,
    // а сериализуются как nativeAttributes для ZodUtils.* (см. model-generator.ts)
    expect(byName.email?.formMeta.constraints).toBeUndefined()
    expect(byName.email?.formMeta.nativeAttributes).toEqual([{ name: '@email' }])
    expect(byName.name?.formMeta.nativeAttributes).toEqual([
      { name: '@length', args: [{ name: 'min', value: 2 }, { name: 'max', value: 50 }] },
    ])
    expect(byName.code?.formMeta.nativeAttributes).toEqual([
      { name: '@regex', args: [{ name: 'regex', value: '^[A-Z]+$' }] },
    ])
  })

  it('наследует @gte/@gt/@lte/@lt с поправкой на строгость (min/max vs exclusiveMin/exclusiveMax)', () => {
    const model = makeModel('Product', [
      makeField({ name: 'price', type: 'Int', attributes: [{ refText: '@gte', args: [numberArg(0)] }] }),
      makeField({ name: 'age', type: 'Int', attributes: [{ refText: '@gt', args: [numberArg(0)] }] }),
      makeField({ name: 'qty', type: 'Int', attributes: [{ refText: '@lte', args: [numberArg(100)] }] }),
      makeField({ name: 'rating', type: 'Int', attributes: [{ refText: '@lt', args: [numberArg(10)] }] }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    expect(byName.price?.formMeta.nativeAttributes).toEqual([
      { name: '@gte', args: [{ name: 'value', value: 0 }] },
    ])
    expect(byName.age?.formMeta.nativeAttributes).toEqual([{ name: '@gt', args: [{ name: 'value', value: 0 }] }])
    expect(byName.qty?.formMeta.nativeAttributes).toEqual([
      { name: '@lte', args: [{ name: 'value', value: 100 }] },
    ])
    expect(byName.rating?.formMeta.nativeAttributes).toEqual([
      { name: '@lt', args: [{ name: 'value', value: 10 }] },
    ])
  })

  it('Фаза 1: наследует @startsWith/@endsWith/@contains/@datetime/@date/@time/@url/@phone/@trim/@lower/@upper', () => {
    const model = makeModel('User', [
      makeField({ name: 'slug', type: 'String', attributes: [{ refText: '@startsWith', args: [stringArg('usr-')] }] }),
      makeField({ name: 'file', type: 'String', attributes: [{ refText: '@endsWith', args: [stringArg('.pdf')] }] }),
      makeField({ name: 'bio', type: 'String', attributes: [{ refText: '@contains', args: [stringArg('привет')] }] }),
      makeField({ name: 'startedAt', type: 'String', attributes: [{ refText: '@datetime' }] }),
      makeField({ name: 'birthday', type: 'String', attributes: [{ refText: '@date' }] }),
      makeField({ name: 'clockIn', type: 'String', attributes: [{ refText: '@time', args: [numberArg(3)] }] }),
      makeField({ name: 'site', type: 'String', attributes: [{ refText: '@url' }] }),
      makeField({ name: 'phone', type: 'String', attributes: [{ refText: '@phone' }] }),
      makeField({ name: 'code', type: 'String', attributes: [{ refText: '@trim' }] }),
      makeField({ name: 'tag', type: 'String', attributes: [{ refText: '@lower' }] }),
      makeField({ name: 'sku', type: 'String', attributes: [{ refText: '@upper' }] }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    expect(byName.slug?.formMeta.nativeAttributes).toEqual([
      { name: '@startsWith', args: [{ name: 'text', value: 'usr-' }] },
    ])
    expect(byName.file?.formMeta.nativeAttributes).toEqual([
      { name: '@endsWith', args: [{ name: 'text', value: '.pdf' }] },
    ])
    expect(byName.bio?.formMeta.nativeAttributes).toEqual([
      { name: '@contains', args: [{ name: 'text', value: 'привет' }] },
    ])
    expect(byName.startedAt?.formMeta.nativeAttributes).toEqual([{ name: '@datetime' }])
    expect(byName.birthday?.formMeta.nativeAttributes).toEqual([{ name: '@date' }])
    expect(byName.clockIn?.formMeta.nativeAttributes).toEqual([
      { name: '@time', args: [{ name: 'precision', value: 3 }] },
    ])
    expect(byName.site?.formMeta.nativeAttributes).toEqual([{ name: '@url' }])
    expect(byName.phone?.formMeta.nativeAttributes).toEqual([{ name: '@phone' }])
    expect(byName.code?.formMeta.nativeAttributes).toEqual([{ name: '@trim' }])
    expect(byName.tag?.formMeta.nativeAttributes).toEqual([{ name: '@lower' }])
    expect(byName.sku?.formMeta.nativeAttributes).toEqual([{ name: '@upper' }])
  })

  // ─── message-i18n: захват последнего позиционного `message` (v3.1.0) ─────

  it('message-i18n: захватывает message последним позиционным аргументом, не передаёт его в args', () => {
    const model = makeModel('Product', [
      makeField({
        name: 'price',
        type: 'Int',
        attributes: [{ refText: '@gte', args: [numberArg(0), stringArg('Цена не может быть отрицательной')] }],
      }),
      makeField({
        name: 'sku',
        type: 'String',
        attributes: [{ refText: '@email' }], // без message — поле не задано
      }),
      makeField({
        name: 'code',
        type: 'String',
        attributes: [{
          refText: '@length',
          args: [numberArg(2), numberArg(50), stringArg('От 2 до 50 символов')],
        }],
      }),
    ])

    const info = extractModelInfo(model, enumNames)
    const byName = Object.fromEntries(info.fields.map((f) => [f.name, f]))

    expect(byName.price?.formMeta.nativeAttributes).toEqual([
      { name: '@gte', args: [{ name: 'value', value: 0 }], message: 'Цена не может быть отрицательной' },
    ])
    // message не просочился в args — ZodUtils.* не должен его увидеть
    expect(byName.price?.formMeta.nativeAttributes?.[0]?.args).toEqual([{ name: 'value', value: 0 }])
    expect(byName.sku?.formMeta.nativeAttributes).toEqual([{ name: '@email' }])
    expect(byName.code?.formMeta.nativeAttributes).toEqual([
      {
        name: '@length',
        args: [{ name: 'min', value: 2 }, { name: 'max', value: 50 }],
        message: 'От 2 до 50 символов',
      },
    ])
  })

  it('Фаза 1: @length на списке (List) валидирует количество элементов', () => {
    const model = makeModel('Post', [
      makeField({
        name: 'tags',
        type: 'String',
        array: true,
        attributes: [{ refText: '@length', args: [numberArg(1), numberArg(5)] }],
      }),
    ])

    const info = extractModelInfo(model, enumNames)
    expect(info.fields[0]?.formMeta.nativeAttributes).toEqual([
      { name: '@length', args: [{ name: 'min', value: 1 }, { name: 'max', value: 5 }] },
    ])
  })

  it('Фаза 1: Decimal-поля игнорируют новые атрибуты (нет ветки в NUMBER_NATIVE_ATTRS)', () => {
    const model = makeModel('Product', [
      makeField({ name: 'price', type: 'Decimal', attributes: [{ refText: '@gte', args: [numberArg(0)] }] }),
    ])

    const info = extractModelInfo(model, enumNames)
    // Decimal остаётся на старом механизме через constraints, не nativeAttributes
    expect(info.fields[0]?.formMeta.constraints).toEqual({ min: 0 })
    expect(info.fields[0]?.formMeta.nativeAttributes).toBeUndefined()
  })

  it('Фаза 1: исключает поля с @omit и @computed', () => {
    const model = makeModel('Product', [
      makeField({ name: 'internalNote', type: 'String', attributes: [{ refText: '@omit' }] }),
      makeField({ name: 'total', type: 'Int', attributes: [{ refText: '@computed' }] }),
      makeField({ name: 'name', type: 'String' }),
    ])

    const info = extractModelInfo(model, enumNames)
    expect(info.excludedFields).toEqual(expect.arrayContaining(['internalNote', 'total']))
    expect(info.fields.map((f) => f.name)).toEqual(['name'])
  })

  it('@form.props побеждает нативный атрибут при конфликте того же ключа', () => {
    const model = makeModel('Product', [
      makeField({
        name: 'price',
        type: 'Int',
        attributes: [{ refText: '@gte', args: [numberArg(0)] }],
        comments: ['@form.props({ min: 10 })'],
      }),
    ])

    const info = extractModelInfo(model, enumNames)
    // Нативный @gte(0) наследуется, но @form.props({min: 10}) на том же ключе побеждает
    expect(info.fields[0]?.formMeta.constraints).toEqual({ min: 10 })
  })

  it('нативный constraint и @form.props с разными ключами объединяются без конфликта', () => {
    const model = makeModel('Product', [
      makeField({
        name: 'price',
        type: 'Int',
        attributes: [{ refText: '@gte', args: [numberArg(0)] }],
        comments: ['@form.props({ step: 0.5 })'],
      }),
    ])

    const info = extractModelInfo(model, enumNames)
    // step — не пересекается по ключу с @gte (min), поэтому оба сосуществуют раздельно:
    // step остаётся в constraints (@form.props), @gte уходит в nativeAttributes (A3)
    expect(info.fields[0]?.formMeta.constraints).toEqual({ step: 0.5 })
    expect(info.fields[0]?.formMeta.nativeAttributes).toEqual([
      { name: '@gte', args: [{ name: 'value', value: 0 }] },
    ])
  })

  it('без нативных атрибутов formMeta.constraints остаётся как задал только @form.props', () => {
    const model = makeModel('Product', [
      makeField({ name: 'price', type: 'Int', comments: ['@form.props({ min: 5 })'] }),
    ])

    const info = extractModelInfo(model, enumNames)
    expect(info.fields[0]?.formMeta.constraints).toEqual({ min: 5 })
  })

  // ─── Фаза 2 (v2.5.0): @@validate / @@strict ──────────────────────────────

  it('извлекает @@validate с condition/message/path', () => {
    const model = makeModel(
      'Booking',
      [
        makeField({ name: 'startsAt', type: 'DateTime' }),
        makeField({ name: 'endsAt', type: 'DateTime' }),
      ],
      [{
        refText: '@@validate',
        args: [
          { value: binary('>', fieldRef('endsAt'), fieldRef('startsAt')) },
          { value: strLit('Дата окончания раньше начала') },
          { value: strArr(['endsAt']) },
        ],
      }],
    )

    const info = extractModelInfo(model, enumNames)

    expect(info.validations).toHaveLength(1)
    expect(info.validations?.[0]?.message).toBe('Дата окончания раньше начала')
    expect(info.validations?.[0]?.path).toEqual(['endsAt'])
    expect(info.validations?.[0]?.conditionExpr).toContain(`kind: 'binary'`)
    expect(info.validations?.[0]?.conditionExpr).toContain(`field: "endsAt"`)
  })

  it('@@validate без message/path — args из одного элемента', () => {
    const model = makeModel('Booking', [makeField({ name: 'startsAt', type: 'DateTime' })], [{
      refText: '@@validate',
      args: [{ value: boolLit(true) }],
    }])

    const info = extractModelInfo(model, enumNames)

    expect(info.validations).toHaveLength(1)
    expect(info.validations?.[0]?.message).toBeUndefined()
    expect(info.validations?.[0]?.path).toBeUndefined()
  })

  it('модель без @@validate — validations пуст', () => {
    const model = makeModel('Product', [makeField({ name: 'name', type: 'String' })])

    const info = extractModelInfo(model, enumNames)

    expect(info.validations).toEqual([])
  })

  it('распознаёт @@strict()', () => {
    const model = makeModel('Booking', [makeField({ name: 'name', type: 'String' })], [
      { refText: '@@strict' },
    ])

    const info = extractModelInfo(model, enumNames)

    expect(info.isStrict).toBe(true)
  })

  it('без @@strict() — isStrict false', () => {
    const model = makeModel('Product', [makeField({ name: 'name', type: 'String' })])

    const info = extractModelInfo(model, enumNames)

    expect(info.isStrict).toBe(false)
  })
})

describe(
  'extractModelInfo — warning на неизвестную директиву @form.*/@meta("form.*", …) (живой прецедент @form.options)',
  () => {
    const enumNames = new Set<string>()
    let warnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      warnSpy.mockRestore()
    })

    it('неизвестная comment-директива @form.options — предупреждение с именем поля и ключа', () => {
      const model = makeModel('Content', [
        makeField({ name: 'category', type: 'String', comments: ['@form.options([1, 2, 3])'] }),
      ])

      extractModelInfo(model, enumNames)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Content.category'))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@form.options'))
    })

    it('неизвестный @meta("form.options", …) — та же дыра для основного синтаксиса Фазы 3', () => {
      const model = makeModel('Content', [
        makeField({
          name: 'quality',
          type: 'String',
          attributes: [{ refText: '@meta', args: [{ value: { $type: 'StringLiteral', value: 'form.options' } }] }],
        }),
      ])

      extractModelInfo(model, enumNames)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Content.quality'))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('form.options'))
    })

    it('только известные директивы — предупреждения об опечатке нет (deprecation-warning не в счёт)', () => {
      const model = makeModel('Content', [
        makeField({ name: 'label', type: 'String', comments: ['@form.title("Название")'] }),
      ])

      extractModelInfo(model, enumNames)

      const unknownDirectiveWarnings = warnSpy.mock.calls.filter((call) => String(call[0]).includes('неизвестн'))
      expect(unknownDirectiveWarnings).toEqual([])
    })
  },
)

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

  it('Фаза 1: не импортирует ZodUtils и не эмитит withNative без nativeAttributes', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String' })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).not.toContain('ZodUtils')
    expect(code).not.toContain('function withNative')
  })

  it('Фаза 1: применяет нативный атрибут строкового поля через withNative(ZodUtils.addStringValidation)', () => {
    const modelInfo: ModelInfo = {
      name: 'User',
      excludedFields: [],
      fields: [
        field({
          name: 'email',
          type: 'String',
          formMeta: { nativeAttributes: [{ name: '@email' }] },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain(`import { ZodUtils } from '@zenstackhq/zod'`)
    expect(code).toContain('function withNative')
    expect(code).toContain(
      "email: withNative(z.string(), (s) => ZodUtils.addStringValidation(s, [{ name: '@email' }]))",
    )
  })

  it('Фаза 1: применяет нативный атрибут числового поля через withNative(ZodUtils.addNumberValidation)', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({
          name: 'price',
          type: 'Float',
          formMeta: { nativeAttributes: [{ name: '@gte', args: [{ name: 'value', value: 0 }] }] },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain(
      "price: withNative(z.number(), (s) => ZodUtils.addNumberValidation(s, [{ name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 0 } }] }]))",
    )
  })

  it('Фаза 1: @length на списке оборачивает z.array(...) через withNative(ZodUtils.addListValidation)', () => {
    const modelInfo: ModelInfo = {
      name: 'Post',
      excludedFields: [],
      fields: [
        field({
          name: 'tags',
          type: 'String',
          isList: true,
          formMeta: {
            nativeAttributes: [{ name: '@length', args: [{ name: 'min', value: 1 }, { name: 'max', value: 5 }] }],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('withNative(z.array(z.string()), (s) => ZodUtils.addListValidation(s,')
  })

  // ─── message-i18n: applyNativeMessages (v3.1.0) ────────────────────────────

  it('message-i18n: без message на nativeAttributes НЕ эмитит applyNativeMessages', () => {
    const modelInfo: ModelInfo = {
      name: 'User',
      excludedFields: [],
      fields: [field({ name: 'email', type: 'String', formMeta: { nativeAttributes: [{ name: '@email' }] } })],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).not.toContain('applyNativeMessages')
  })

  it('message-i18n: атрибут с message оборачивается в applyNativeMessages(withNative(...), [{count,message}])', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({
          name: 'price',
          type: 'Float',
          formMeta: {
            nativeAttributes: [
              { name: '@gte', args: [{ name: 'value', value: 0 }], message: 'Цена не может быть отрицательной' },
            ],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('function applyNativeMessages')
    expect(code).toContain(
      'price: applyNativeMessages(withNative(z.number(), (s) => ZodUtils.addNumberValidation(s, '
        + "[{ name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 0 } }] }])), "
        + '[{ count: 1, message: "Цена не может быть отрицательной" }])',
    )
  })

  it('message-i18n: Int-поле получает служебный leading {count:1} перед attrs — .int() пушит свой check первым', () => {
    const modelInfo: ModelInfo = {
      name: 'Recipe',
      excludedFields: [],
      fields: [
        field({
          name: 'rating',
          type: 'Int',
          formMeta: {
            nativeAttributes: [
              { name: '@gte', args: [{ name: 'value', value: 1 }], message: 'Оценка — от 1 до 5' },
              { name: '@lte', args: [{ name: 'value', value: 5 }], message: 'Оценка — от 1 до 5' },
            ],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    // leading {count:1} без message — «съедает» number_format-check от z.number().int(), иначе
    // message @gte достаётся number_format, а @lte остаётся вовсе без подмены (живьём поймано).
    expect(code).toContain(
      'rating: applyNativeMessages(withNative(z.number().int(), (s) => ZodUtils.addNumberValidation(s, '
        + "[{ name: '@gte', args: [{ name: 'value', value: { kind: 'literal', value: 1 } }] }, "
        + "{ name: '@lte', args: [{ name: 'value', value: { kind: 'literal', value: 5 } }] }])), "
        + '[{ count: 1 }, { count: 1, message: "Оценка — от 1 до 5" }, { count: 1, message: "Оценка — от 1 до 5" }])',
    )
  })

  it('message-i18n: @length с общим message на min+max даёт count:2 (позиционно, не по типу check)', () => {
    const modelInfo: ModelInfo = {
      name: 'User',
      excludedFields: [],
      fields: [
        field({
          name: 'name',
          type: 'String',
          formMeta: {
            nativeAttributes: [
              {
                name: '@length',
                args: [{ name: 'min', value: 2 }, { name: 'max', value: 50 }],
                message: 'От 2 до 50 символов',
              },
            ],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('[{ count: 2, message: "От 2 до 50 символов" }]')
  })

  it('message-i18n: смешанные атрибуты (с message и без) сохраняют позицию через count у обоих', () => {
    const modelInfo: ModelInfo = {
      name: 'User',
      excludedFields: [],
      fields: [
        field({
          name: 'bio',
          type: 'String',
          formMeta: {
            nativeAttributes: [
              { name: '@trim' },
              { name: '@length', args: [{ name: 'max', value: 500 }], message: 'Слишком длинно' },
            ],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    // @trim — count:1 без message (транзитный overwrite-check, но занимает слот в checks[]),
    // @length(max) без min — только один check, count:1
    expect(code).toContain('[{ count: 1, message: undefined }, { count: 1, message: "Слишком длинно" }]')
  })

  it('message-i18n: @length на списке — applyNativeMessages поверх addListValidation', () => {
    const modelInfo: ModelInfo = {
      name: 'Post',
      excludedFields: [],
      fields: [
        field({
          name: 'tags',
          type: 'String',
          isList: true,
          formMeta: {
            nativeAttributes: [
              {
                name: '@length',
                args: [{ name: 'min', value: 1 }, { name: 'max', value: 5 }],
                message: 'От 1 до 5 тегов',
              },
            ],
          },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('applyNativeMessages(withNative(z.array(z.string()), (s) => ZodUtils.addListValidation(s,')
    expect(code).toContain('[{ count: 2, message: "От 1 до 5 тегов" }]')
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

  it('применяет exclusiveMin/exclusiveMax через .gt()/.lt() (наследование @gt/@lt)', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [
        field({
          name: 'discount',
          type: 'Int',
          formMeta: { constraints: { exclusiveMin: 0, exclusiveMax: 100 } },
        }),
      ],
    }

    const code = generateModelCode(modelInfo, new Set())
    expect(code).toContain('discount: z.number().int().gt(0).lt(100)')
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

  // ─── Фаза 2 (v2.5.0): @@validate / @@strict ──────────────────────────────

  it('@@validate: BaseSchema + withNative(ZodUtils.addCustomValidation) на CreateFormSchema', () => {
    const modelInfo: ModelInfo = {
      name: 'Booking',
      excludedFields: [],
      fields: [
        field({ name: 'startsAt', type: 'DateTime' }),
        field({ name: 'endsAt', type: 'DateTime' }),
      ],
      validations: [{
        conditionExpr:
          `{ kind: 'binary', op: '>', left: { kind: 'field', field: "endsAt" }, right: { kind: 'field', field: "startsAt" } }`,
        message: 'Дата окончания раньше начала',
        path: ['endsAt'],
      }],
    }

    const code = generateModelCode(modelInfo, new Set())

    expect(code).toContain(`import { ZodUtils } from '@zenstackhq/zod'`)
    expect(code).toContain('function withNative<T extends z.ZodTypeAny>')
    expect(code).toContain('const BookingBaseSchema = z.object({')
    expect(code).toContain('export const BookingUpdateFormSchema = BookingBaseSchema.partial()')
    expect(code).toContain('export const BookingCreateFormSchema = withNative(')
    expect(code).toContain('ZodUtils.addCustomValidation(s,')
    expect(code).toContain(`name: '@@validate'`)
    expect(code).toContain(`kind: 'literal', value: "Дата окончания раньше начала"`)
    expect(code).toContain(`kind: 'array', type: 'String', items: [{ kind: 'literal', value: "endsAt" }]`)
  })

  it('без validations — прежний путь, BaseSchema не появляется', () => {
    const modelInfo: ModelInfo = {
      name: 'Product',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String' })],
      validations: [],
    }

    const code = generateModelCode(modelInfo, new Set())

    expect(code).not.toContain('BaseSchema')
    expect(code).not.toContain('ZodUtils')
    expect(code).toContain('export const ProductCreateFormSchema = z.object({')
  })

  it('@@strict: z.strictObject(...) вместо z.object(...)', () => {
    const modelInfo: ModelInfo = {
      name: 'Booking',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String' })],
      isStrict: true,
    }

    const code = generateModelCode(modelInfo, new Set())

    expect(code).toContain('export const BookingCreateFormSchema = z.strictObject({')
    expect(code).not.toContain('z.object({')
  })

  it('@@strict + @@validate вместе — strictObject как BaseSchema', () => {
    const modelInfo: ModelInfo = {
      name: 'Booking',
      excludedFields: [],
      fields: [field({ name: 'name', type: 'String' })],
      isStrict: true,
      validations: [{ conditionExpr: `{ kind: 'literal', value: true }` }],
    }

    const code = generateModelCode(modelInfo, new Set())

    expect(code).toContain('const BookingBaseSchema = z.strictObject({')
    expect(code).toContain(`args: [{ value: { kind: 'literal', value: true } }]`)
  })
})
