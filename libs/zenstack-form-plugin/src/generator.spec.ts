import type { DataModel } from '@zenstackhq/language/ast'
import type { CliGeneratorContext } from '@zenstackhq/sdk'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generate } from './generator.js'

// ─── Фикстуры AST ───────────────────────────────────────────────────────────

const strLit = (value: string) => ({ $type: 'StringLiteral', value })

function meta(key: string, value: string) {
  return { refText: '@meta', args: [{ value: strLit(key) }, { value: strLit(value) }] }
}

function makeField(name: string, type: string, attributes: Array<{ refText: string; args?: unknown[] }> = []) {
  return {
    $type: 'DataField',
    name,
    comments: [],
    params: [],
    type: { $type: 'DataFieldType', array: false, optional: false, type },
    attributes: attributes.map((a) => ({
      $type: 'DataFieldAttribute',
      decl: { $refText: a.refText },
      args: a.args ?? [],
    })),
  }
}

function makeModel(name: string, fields: ReturnType<typeof makeField>[]): DataModel {
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

describe('generate — form-registry-keys.ts (этап Е, §17.4)', () => {
  let outputDir: string

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'zfp-generator-'))
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true })
  })

  function contextFor(models: DataModel[]): CliGeneratorContext {
    return {
      pluginOptions: { output: outputDir },
      defaultOutputPath: outputDir,
      schemaFile: join(outputDir, 'schema.zmodel'),
      model: { declarations: models },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it('P2: пишет form-registry-keys.ts по нескольким моделям — ключи уникальны и отсортированы', async () => {
    await generate(
      contextFor([
        makeModel('Work', [
          makeField('categoryId', 'String', [meta('form.fieldType', 'Select.WorkCategory')]),
          makeField('counterpartyId', 'String', [meta('form.fieldType', 'Combobox.Counterparty')]),
        ]),
        makeModel('Estimate', [
          makeField('categoryId', 'String', [meta('form.fieldType', 'Select.WorkCategory')]),
          makeField('unitId', 'String', [meta('form.fieldType', 'Select.Unit')]),
        ]),
      ]),
    )

    const code = await readFile(join(outputDir, 'form-registry-keys.ts'), 'utf-8')
    expect(code).toContain(`Select: ['Unit', 'WorkCategory'],`)
    expect(code).toContain(`Combobox: ['Counterparty'],`)
    expect(code).toContain(`Listbox: [],`)
    expect(code).toContain(`'Select.WorkCategory': ['Work.categoryId', 'Estimate.categoryId'],`)
  })

  it('P2: схема без ключей — файл всё равно пишется, пространства пустые', async () => {
    await generate(contextFor([makeModel('Work', [makeField('title', 'String')])]))

    const code = await readFile(join(outputDir, 'form-registry-keys.ts'), 'utf-8')
    expect(code).toContain('Select: [],')
    expect(code).toContain('export const formRegistryUsages = {} as const')
  })

  it('P4: index.ts экспортирует form-registry-keys', async () => {
    await generate(contextFor([makeModel('Work', [makeField('title', 'String')])]))

    const index = await readFile(join(outputDir, 'index.ts'), 'utf-8')
    expect(index).toContain(`export * from './Work.form'`)
    expect(index).toContain(`export * from './form-registry-keys'`)
  })

  it('P1: неверный ключ реестра — ошибка generate с Модель.поле', async () => {
    await expect(
      generate(contextFor([makeModel('Work', [makeField('categoryId', 'String', [meta('form.fieldType', 'Foo.X')])])])),
    ).rejects.toThrow(/Work\.categoryId/)
  })

  it('form.relation.* с несуществующей моделью и полем — предупреждения, generate не падает', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await generate(
      contextFor([
        makeModel('User', [makeField('name', 'String')]),
        makeModel('Order', [
          makeField('authorId', 'String', [
            meta('form.relation.model', 'User'),
            meta('form.relation.labelField', 'title'),
          ]),
          makeField('ghostId', 'String', [
            meta('form.relation.model', 'Ghost'),
            meta('form.relation.labelField', 'name'),
          ]),
        ]),
      ]),
    )

    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.some((m) => /Order\.authorId.*labelField.*«title»/.test(m))).toBe(true)
    expect(messages.some((m) => /Order\.ghostId.*form\.relation\.model.*«Ghost»/.test(m))).toBe(true)
  })

  it('ключ реестра + form.relation.* на одном поле — предупреждение «побеждает ключ»', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await generate(
      contextFor([
        makeModel('User', [makeField('name', 'String')]),
        makeModel('Order', [
          makeField('authorId', 'String', [
            meta('form.fieldType', 'Select.Author'),
            meta('form.relation.model', 'User'),
            meta('form.relation.labelField', 'name'),
          ]),
        ]),
      ]),
    )

    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.some((m) => /Order\.authorId.*побеждает ключ/.test(m))).toBe(true)
  })
})
