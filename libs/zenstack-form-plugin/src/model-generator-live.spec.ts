import { loadDocument } from '@zenstackhq/language'
import type { DataModel } from '@zenstackhq/language/ast'
import { isDataModel, isEnum } from '@zenstackhq/language/ast'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractModelInfo } from './model-generator.js'
import { collectRegistryKeys } from './registry-keys.js'

/**
 * Отбор полей формы на настоящем разборе Langium. Мок-фикстуры `model-generator.spec.ts` кладут в
 * `attr.decl.$refText` имена без `@` (`'id'`, `'relation'`), а Langium хранит их с `@` — проверка по
 * голому имени в настоящем AST не срабатывала (`hasRelationAttr` — мёртвый код). Здесь — как есть.
 */

const DATASOURCE = `datasource db {
  provider = 'sqlite'
  url = 'file:./dev.db'
}
`

const SCHEMA = `${DATASOURCE}
model User {
  id     String @id
  orders Order[]
  bought Order[] @relation("Buyer")
}

model Order {
  id      String @id
  title   String
  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id])
  // Связь с явной form.relation.* на самом поле-связи (а не на FK): в форму объект не попадает
  buyerId String
  buyer   User   @relation("Buyer", fields: [buyerId], references: [id]) @meta("form.relation.labelField", "name")
}

model Catalog {
  id    String @id
  title String
}
`

describe('отбор полей формы на настоящем разборе schema.zmodel', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'zfp-live-fields-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function load(schema: string, modelName: string) {
    const schemaPath = join(dir, 'schema.zmodel')
    await writeFile(schemaPath, schema, 'utf-8')
    const result = await loadDocument(schemaPath)
    if (!result.success) {
      throw new Error(`схема не разобралась: ${result.errors.join('; ')}`)
    }
    const enumSet = new Set(result.model.declarations.filter(isEnum).map((e) => e.name))
    const model = result.model.declarations.find((d) => isDataModel(d) && d.name === modelName) as DataModel
    return extractModelInfo(model, enumSet)
  }

  it('поле-связь с @relation исключается, даже если на нём стоит form.relation.*', async () => {
    const info = await load(SCHEMA, 'Order')

    expect(info.excludedFields).toEqual(expect.arrayContaining(['id', 'owner', 'buyer']))
    expect(info.fields.map((f) => f.name)).toEqual(['title', 'ownerId', 'buyerId'])
  })

  it('id и системные поля исключаются', async () => {
    const info = await load(SCHEMA, 'Catalog')

    expect(info.excludedFields).toContain('id')
    expect(info.fields.map((f) => f.name)).toEqual(['title'])
  })

  it('formRegistryUsages: ключ из импортированного фрагмента виден как «Модель.поле», файл-источник из AST недоступен', async () => {
    await writeFile(
      join(dir, 'fragment.zmodel'),
      'model Unit {\n  id   String @id\n  code String @meta("form.fieldType", "Select.Unit")\n}\n',
      'utf-8',
    )
    await writeFile(
      join(dir, 'schema.zmodel'),
      `import "./fragment"\n${DATASOURCE}\nmodel Work {\n  id   String @id\n  kind String @meta("form.fieldType", "Select.WorkKind")\n}\n`,
      'utf-8',
    )
    const result = await loadDocument(join(dir, 'schema.zmodel'))
    if (!result.success) {
      throw new Error(`схема не разобралась: ${result.errors.join('; ')}`)
    }
    const enumSet = new Set(result.model.declarations.filter(isEnum).map((e) => e.name))
    const dataModels = result.model.declarations.filter(isDataModel)

    const data = collectRegistryKeys(dataModels.map((m) => extractModelInfo(m, enumSet)))

    expect(data.keys.Select).toEqual(['Unit', 'WorkKind'])
    expect(data.usages['Select.Unit']).toEqual(['Unit.code'])
    expect(data.usages['Select.WorkKind']).toEqual(['Work.kind'])

    // Слияние импортов переподчиняет объявления главному документу: у `Unit` из fragment.zmodel корень
    // тот же, что у `Work`, — файл-источник из AST не восстановить (поэтому в usages только «Модель.поле»).
    // Если апстрим начнёт хранить источник, этот тест упадёт — повод добавить имя файла в usages
    const roots = new Set(
      dataModels.map((m) => {
        let node: { $container?: unknown } = m
        while (node.$container) {
          node = node.$container as { $container?: unknown }
        }
        return node
      }),
    )
    expect(roots.size).toBe(1)
  })
})
