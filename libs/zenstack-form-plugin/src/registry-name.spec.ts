import { loadDocument } from '@zenstackhq/language'
import type { DataField, DataModel, TypeDef } from '@zenstackhq/language/ast'
import { isDataModel, isEnum } from '@zenstackhq/language/ast'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractModelInfo, generateModelCode } from './model-generator.js'
import { collectRegistryKeys, generateRegistryKeysCode } from './registry-keys.js'

/**
 * Этап Ж (`libs/forms/PLAN.md` §17.9): подсказка автоподбора `ui.registryName` для FK и enum-полей.
 * Тесты PJ1–PJ6 из архитектурной заметки. AST-фикстуры повторяют форму настоящего разбора Langium,
 * снятую живым `loadDocument` (см. последний блок этого файла).
 */

// ─── Фикстуры AST ──────────────────────────────────────────────────────────

const strLit = (value: string) => ({ $type: 'StringLiteral', value })

/** `@relation(fields: [a, b], references: [...])` — как отдаёт Langium: именованный аргумент + ArrayExpr */
function relationAttr(fkNames: string[], relationName?: string) {
  const args: unknown[] = []
  if (relationName !== undefined) {
    // Имя связи — первый позиционный аргумент, `name` у AttributeArg не задан
    args.push({ value: strLit(relationName) })
  }
  args.push({
    name: 'fields',
    value: {
      $type: 'ArrayExpr',
      items: fkNames.map((n) => ({ $type: 'ReferenceExpr', target: { $refText: n }, args: [] })),
    },
  })
  args.push({
    name: 'references',
    value: {
      $type: 'ArrayExpr',
      items: fkNames.map(() => ({ $type: 'ReferenceExpr', target: { $refText: 'id' }, args: [] })),
    },
  })
  return { refText: '@relation', args }
}

function meta(key: string, value: string) {
  return { refText: '@meta', args: [{ value: strLit(key) }, { value: strLit(value) }] }
}

function makeField(overrides: {
  name: string
  type: string
  array?: boolean
  optional?: boolean
  reference?: string
  attributes?: Array<{ refText: string; args?: unknown[] }>
}): DataField {
  const { name, type, array = false, optional = false, reference, attributes = [] } = overrides
  return {
    $type: 'DataField',
    name,
    comments: [],
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

function makeModel(name: string, fields: DataField[], mixins: TypeDef[] = []): DataModel {
  return {
    $type: 'DataModel',
    name,
    comments: [],
    attributes: [],
    isView: false,
    mixins: mixins.map((ref) => ({ ref })),
    fields,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function makeTypeDef(name: string, fields: DataField[]): TypeDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { $type: 'TypeDef', name, comments: [], attributes: [], mixins: [], fields } as any
}

/** Пара «скалярный FK + поле-связь» как в schema.zmodel: `categoryId String` и `category WorkCategory @relation(...)` */
function fkPair(fk: string, relationField: string, target: string, attributes: ReturnType<typeof meta>[] = []) {
  return [
    makeField({ name: fk, type: 'String', attributes }),
    makeField({
      name: relationField,
      type: target,
      reference: target,
      attributes: [relationAttr([fk])],
    }),
  ]
}

const enumNames = new Set(['Status'])

function registryNameOf(model: DataModel, fieldName: string): string | undefined {
  return extractModelInfo(model, enumNames).fields.find((f) => f.name === fieldName)?.registryName
}

// ─── extractModelInfo ──────────────────────────────────────────────────────

describe('PJ1: FK — подсказка с именем целевой модели', () => {
  it('categoryId + category WorkCategory @relation(fields: [categoryId]) → registryName «WorkCategory»', () => {
    const model = makeModel('Work', fkPair('categoryId', 'category', 'WorkCategory'))
    expect(registryNameOf(model, 'categoryId')).toBe('WorkCategory')
  })

  it('имя связи первым позиционным аргументом (@relation("C", fields: [...])) не мешает', () => {
    const model = makeModel('Work', [
      makeField({ name: 'ownerId', type: 'String' }),
      makeField({
        name: 'owner',
        type: 'User',
        reference: 'User',
        attributes: [relationAttr(['ownerId'], 'W')],
      }),
    ])
    expect(registryNameOf(model, 'ownerId')).toBe('User')
  })

  it('порядок объявления не важен: поле-связь раньше скалярного FK', () => {
    const [fk, relation] = fkPair('categoryId', 'category', 'WorkCategory')
    const model = makeModel('Work', [relation!, fk!])
    expect(registryNameOf(model, 'categoryId')).toBe('WorkCategory')
  })

  it('обычное скалярное поле без связи — подсказки нет', () => {
    const model = makeModel('Work', [makeField({ name: 'title', type: 'String' })])
    expect(registryNameOf(model, 'title')).toBeUndefined()
  })

  it('необязательный FK (String?) тоже получает подсказку', () => {
    const model = makeModel('Work', [
      makeField({ name: 'categoryId', type: 'String', optional: true }),
      makeField({
        name: 'category',
        type: 'WorkCategory',
        reference: 'WorkCategory',
        optional: true,
        attributes: [relationAttr(['categoryId'])],
      }),
    ])
    expect(registryNameOf(model, 'categoryId')).toBe('WorkCategory')
  })
})

describe('PJ2: enum — подсказка с именем enum', () => {
  it('поле типа enum → registryName = имя enum', () => {
    const model = makeModel('Work', [makeField({ name: 'status', type: 'Status', reference: 'Status' })])
    expect(registryNameOf(model, 'status')).toBe('Status')
  })

  it('необязательный enum тоже', () => {
    const model = makeModel('Work', [
      makeField({ name: 'status', type: 'Status', reference: 'Status', optional: true }),
    ])
    expect(registryNameOf(model, 'status')).toBe('Status')
  })
})

describe('PJ3: явный form.fieldType и form.relation.* — подсказки нет', () => {
  it.each([
    ['ключ реестра', 'Select.WorkCategory'],
    ['встроенный тип (способ отказаться)', 'select'],
    ['встроенный тип tags', 'tags'],
  ])('FK с form.fieldType: %s', (_label, fieldType) => {
    const model = makeModel(
      'Work',
      fkPair('categoryId', 'category', 'WorkCategory', [meta('form.fieldType', fieldType)]),
    )
    expect(registryNameOf(model, 'categoryId')).toBeUndefined()
  })

  it('enum с встроенным form.fieldType — подсказки нет', () => {
    const model = makeModel('Work', [
      makeField({ name: 'status', type: 'Status', reference: 'Status', attributes: [meta('form.fieldType', 'radio')] }),
    ])
    expect(registryNameOf(model, 'status')).toBeUndefined()
  })

  it('FK с form.relation.* — подсказки нет (автор выбрал путь через провайдер)', () => {
    const model = makeModel(
      'Work',
      fkPair('categoryId', 'category', 'WorkCategory', [
        meta('form.relation.model', 'WorkCategory'),
        meta('form.relation.labelField', 'name'),
      ]),
    )
    expect(registryNameOf(model, 'categoryId')).toBeUndefined()
  })
})

describe('PJ4: списки и составной FK — подсказки нет', () => {
  it('список связей (Category[]) не попадает в форму и подсказки не получает', () => {
    const model = makeModel('Work', [
      makeField({ name: 'categories', type: 'Category', reference: 'Category', array: true }),
    ])
    const info = extractModelInfo(model, enumNames)
    expect(info.fields).toEqual([])
    expect(info.excludedFields).toContain('categories')
  })

  it('список с form.relation.* остаётся в форме, но подсказки не получает', () => {
    const model = makeModel('Work', [
      makeField({
        name: 'categories',
        type: 'Category',
        reference: 'Category',
        array: true,
        attributes: [meta('form.relation.labelField', 'name')],
      }),
    ])
    expect(registryNameOf(model, 'categories')).toBeUndefined()
  })

  it('список enum (Status[]) — подсказки нет', () => {
    const model = makeModel('Work', [makeField({ name: 'statuses', type: 'Status', reference: 'Status', array: true })])
    expect(registryNameOf(model, 'statuses')).toBeUndefined()
  })

  it('составной FK (fields: [a1, a2]) — подсказки нет ни на одном из полей', () => {
    const model = makeModel('Work', [
      makeField({ name: 'a1', type: 'String' }),
      makeField({ name: 'a2', type: 'String' }),
      makeField({
        name: 'comp',
        type: 'WorkCategory',
        reference: 'WorkCategory',
        attributes: [relationAttr(['a1', 'a2'], 'C')],
      }),
    ])
    expect(registryNameOf(model, 'a1')).toBeUndefined()
    expect(registryNameOf(model, 'a2')).toBeUndefined()
  })

  it('один FK под двумя связями на разные модели — неоднозначно, подсказки нет', () => {
    const model = makeModel('Work', [
      makeField({ name: 'refId', type: 'String' }),
      makeField({
        name: 'first',
        type: 'A',
        reference: 'A',
        attributes: [relationAttr(['refId'], 'one')],
      }),
      makeField({
        name: 'second',
        type: 'B',
        reference: 'B',
        attributes: [relationAttr(['refId'], 'two')],
      }),
    ])
    expect(registryNameOf(model, 'refId')).toBeUndefined()
  })
})

describe('PJ5: поле-связь в миксине (TypeDef) — подсказка есть', () => {
  it('FK и связь объявлены в миксине, модель получает подсказку', () => {
    const audit = makeTypeDef('Audit', fkPair('createdById', 'createdBy', 'User'))
    const model = makeModel('Work', [makeField({ name: 'title', type: 'String' })], [audit])

    expect(registryNameOf(model, 'createdById')).toBe('User')
  })

  it('FK в модели, а поле-связь в миксине — карта строится по объединению полей', () => {
    const mixin = makeTypeDef('Owned', [
      makeField({
        name: 'owner',
        type: 'User',
        reference: 'User',
        attributes: [relationAttr(['ownerId'])],
      }),
    ])
    const model = makeModel('Work', [makeField({ name: 'ownerId', type: 'String' })], [mixin])

    expect(registryNameOf(model, 'ownerId')).toBe('User')
  })
})

describe('набор полей формы не меняется', () => {
  it('поля и excludedFields те же, что без подсказки; подсказка — только дополнительное свойство', () => {
    const model = makeModel('Work', [
      makeField({ name: 'id', type: 'String', attributes: [{ refText: '@id' }] }),
      makeField({ name: 'title', type: 'String' }),
      ...fkPair('categoryId', 'category', 'WorkCategory'),
      makeField({ name: 'status', type: 'Status', reference: 'Status' }),
      makeField({ name: 'tags', type: 'Tag', reference: 'Tag', array: true }),
    ])

    const info = extractModelInfo(model, enumNames)

    // FK-поле остаётся в форме, как и раньше; поле-связь и список связей — исключены
    expect(info.fields.map((f) => f.name)).toEqual(['title', 'categoryId', 'status'])
    expect(info.excludedFields).toEqual(['id', 'category', 'tags'])
    expect(info.fields.map((f) => f.registryName)).toEqual([undefined, 'WorkCategory', 'Status'])
  })

  it('поле-связь без form.relation остаётся исключённым и не получает подсказку', () => {
    const model = makeModel('Work', fkPair('categoryId', 'category', 'WorkCategory'))
    const info = extractModelInfo(model, enumNames)
    expect(info.excludedFields).toContain('category')
    expect(info.fields.find((f) => f.name === 'category')).toBeUndefined()
  })
})

// ─── generateModelCode: ui.registryName в мете ─────────────────────────────

describe('generateModelCode — ui.registryName', () => {
  function codeFor(model: DataModel): string {
    return generateModelCode(extractModelInfo(model, enumNames), enumNames)
  }

  it('FK без другой ui-меты: объект ui создаётся ради одного registryName', () => {
    const code = codeFor(makeModel('Work', fkPair('categoryId', 'category', 'WorkCategory')))
    expect(code).toContain(`categoryId: z.string()\n    .meta({\n      ui: { registryName: 'WorkCategory' }\n    })`)
  })

  it('enum: registryName с именем enum', () => {
    const code = codeFor(makeModel('Work', [makeField({ name: 'status', type: 'Status', reference: 'Status' })]))
    expect(code).toContain(`ui: { registryName: 'Status' }`)
  })

  it('порядок ключей: после fieldProps, до tooltip', () => {
    const code = codeFor(
      makeModel(
        'Work',
        fkPair('categoryId', 'category', 'WorkCategory', [
          meta('form.title', 'Категория'),
          meta('form.props.createItem', 'x'),
          meta('form.tooltip.description', 'Подсказка'),
        ]),
      ),
    )
    const ui = code.match(/ui: (\{ .* \})/)?.[1] ?? ''
    expect(ui.indexOf('title:')).toBeGreaterThanOrEqual(0)
    expect(ui.indexOf('fieldProps:')).toBeGreaterThan(ui.indexOf('title:'))
    expect(ui.indexOf('registryName:')).toBeGreaterThan(ui.indexOf('fieldProps:'))
    expect(ui.indexOf('tooltip:')).toBeGreaterThan(ui.indexOf('registryName:'))
  })

  it('явный form.fieldType — registryName в коде нет', () => {
    const code = codeFor(
      makeModel(
        'Work',
        fkPair('categoryId', 'category', 'WorkCategory', [meta('form.fieldType', 'Select.WorkCategory')]),
      ),
    )
    expect(code).not.toContain('registryName')
    expect(code).toContain(`fieldType: 'Select.WorkCategory'`)
  })

  it('поле без FK/enum — registryName нет, у поля без меты нет и .meta()', () => {
    const code = codeFor(makeModel('Work', [makeField({ name: 'title', type: 'String' })]))
    expect(code).not.toContain('registryName')
    expect(code).not.toContain('.meta(')
  })

  it('имя с кавычкой не ломает литерал (quoteTsString)', () => {
    const code = generateModelCode(
      {
        name: 'Work',
        excludedFields: [],
        fields: [
          {
            name: 'x',
            type: 'String',
            isRequired: true,
            isList: false,
            isEnum: false,
            formMeta: {},
            registryName: `It's`,
          },
        ],
      },
      new Set(),
    )
    expect(code).toContain(`registryName: 'It\\'s'`)
  })
})

// ─── formRegistryCandidates ────────────────────────────────────────────────

describe('PJ6: formRegistryCandidates', () => {
  const info = (model: DataModel) => extractModelInfo(model, enumNames)

  it('собирает имена по нескольким моделям — без дублей, отсортированные', () => {
    const data = collectRegistryKeys([
      info(
        makeModel('Work', [
          ...fkPair('categoryId', 'category', 'WorkCategory'),
          makeField({ name: 'status', type: 'Status', reference: 'Status' }),
          ...fkPair('unitId', 'unit', 'Unit'),
        ]),
      ),
      info(makeModel('Estimate', fkPair('categoryId', 'category', 'WorkCategory'))),
    ])

    expect(data.candidates.Select).toEqual(['Status', 'Unit', 'WorkCategory'])
  })

  it('не смешивается с явными ключами и их usages', () => {
    const data = collectRegistryKeys([
      info(
        makeModel('Work', [
          ...fkPair('categoryId', 'category', 'WorkCategory', [meta('form.fieldType', 'Select.Custom')]),
          ...fkPair('unitId', 'unit', 'Unit'),
        ]),
      ),
    ])

    expect(data.keys.Select).toEqual(['Custom'])
    expect(data.usages).toEqual({ 'Select.Custom': ['Work.categoryId'] })
    expect(data.candidates.Select).toEqual(['Unit'])
  })

  it('код: formRegistryCandidates и FormSelectCandidate; явные экспорты сохранены', () => {
    const code = generateRegistryKeysCode(
      collectRegistryKeys([
        info(
          makeModel('Work', [
            ...fkPair('unitId', 'unit', 'Unit'),
            ...fkPair('categoryId', 'category', 'WorkCategory'),
          ]),
        ),
      ]),
    )

    expect(code).toContain(`export const formRegistryCandidates = {\n  Select: ['Unit', 'WorkCategory'],\n} as const`)
    expect(code).toContain('export type FormSelectCandidate = (typeof formRegistryCandidates.Select)[number]')
    expect(code).toContain('export const formRegistryKeys = {')
    expect(code).toContain('export type FormSelectKey = (typeof formRegistryKeys.Select)[number]')
    expect(code).toContain('export const formRegistryUsages = {} as const')
    expect(code).not.toMatch(/^import /m)
  })

  it('пустой список — [] (тип never), файл валиден', () => {
    const code = generateRegistryKeysCode(collectRegistryKeys([]))
    expect(code).toContain(`export const formRegistryCandidates = {\n  Select: [],\n} as const`)
    expect(code).toContain('export type FormSelectCandidate')
  })
})

// ─── Живой разбор: как Langium отдаёт @relation(fields: [...]) ──────────────

const LIVE_SCHEMA = `datasource db {
  provider = 'sqlite'
  url = 'file:./dev.db'
}

enum Status {
  A
  B
}

type Audit {
  createdById String
  createdBy   User @relation("AuditCreator", fields: [createdById], references: [id])
}

model User {
  id      String @id
  works   Work[] @relation("W")
  audited Work[] @relation("AuditCreator")
}

model WorkCategory {
  id      String @id
  id2     String
  works   Work[]
  comps   Work[] @relation("C")
  planned Work[] @relation("P")
  @@unique([id, id2])
}

model Tag {
  id     String @id
  workId String
  work   Work   @relation(fields: [workId], references: [id])
}

model Work with Audit {
  id         String @id
  categoryId String
  category   WorkCategory @relation(fields: [categoryId], references: [id])
  ownerId    String
  owner      User @relation("W", fields: [ownerId], references: [id], onDelete: Cascade)
  status     Status
  tags       Tag[]
  a1         String
  a2         String
  comp       WorkCategory @relation("C", fields: [a1, a2], references: [id, id2])
  filled     String @meta("form.fieldType", "select")
  planId     String @meta("form.relation.labelField", "name")
  plan       WorkCategory @relation("P", fields: [planId], references: [id])
}
`

describe('живой разбор schema.zmodel (loadDocument)', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'zfp-registry-name-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('FK, enum, составной FK, список и поле-связь в миксине разбираются как в мок-фикстурах', async () => {
    const schemaPath = join(dir, 'schema.zmodel')
    await writeFile(schemaPath, LIVE_SCHEMA, 'utf-8')

    const result = await loadDocument(schemaPath)
    if (!result.success) {
      throw new Error(`схема не разобралась: ${result.errors.join('; ')}`)
    }

    const enumSet = new Set(result.model.declarations.filter(isEnum).map((e) => e.name))
    const work = result.model.declarations.find((d) => isDataModel(d) && d.name === 'Work') as DataModel
    const info = extractModelInfo(work, enumSet)
    const registryNames = Object.fromEntries(info.fields.map((f) => [f.name, f.registryName]))

    // Подсказка из настоящего разбора: FK (включая миксин), enum; составной FK, form.fieldType, form.relation.* — нет
    expect(registryNames).toMatchObject({
      createdById: 'User',
      categoryId: 'WorkCategory',
      ownerId: 'User',
      status: 'Status',
    })
    expect(registryNames.a1).toBeUndefined()
    expect(registryNames.a2).toBeUndefined()
    expect(registryNames.filled).toBeUndefined()
    expect(registryNames.planId).toBeUndefined()

    // Набор полей формы: связи и список связей исключены, скалярные FK остались
    expect(info.fields.map((f) => f.name)).toEqual([
      'createdById',
      'categoryId',
      'ownerId',
      'status',
      'a1',
      'a2',
      'filled',
      'planId',
    ])
    expect(info.excludedFields).toEqual(
      expect.arrayContaining(['createdBy', 'category', 'owner', 'tags', 'comp', 'plan']),
    )
  })
})
