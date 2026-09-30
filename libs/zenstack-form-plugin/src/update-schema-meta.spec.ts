import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { generateModelCode } from './model-generator.js'
import type { ModelFieldInfo, ModelInfo } from './types.js'

/**
 * Регрессия: `UpdateFormSchema = CreateFormSchema.partial()` теряла `.meta()` полей — Zod v4
 * привязывает мету к экземпляру схемы, `.partial()` создаёт новые обёртки. Тест исполняет
 * сгенерированный код по-настоящему (транспиляция TS → CJS), а не сверяет строки.
 */

const require_ = createRequire(import.meta.url)

function field(overrides: Partial<ModelFieldInfo> & Pick<ModelFieldInfo, 'name' | 'type'>): ModelFieldInfo {
  return { isRequired: true, isList: false, isEnum: false, formMeta: {}, ...overrides }
}

/** Выполнить сгенерированный файл модели и вернуть его экспорты. */
function evalGenerated(code: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module_ = { exports: {} as Record<string, unknown> }
  vm.runInNewContext(`(function (module, exports, require) {${outputText}\n})`)(
    module_,
    module_.exports,
    require_,
  )
  return module_.exports
}

interface UiMeta {
  ui?: { title?: string; placeholder?: string; tooltip?: { description: string } }
}
interface AnyObjectSchema {
  shape: Record<string, { meta(): UiMeta | undefined }>
  safeParse(value: unknown): { success: boolean }
}

const modelInfo: ModelInfo = {
  name: 'Product',
  excludedFields: [],
  fields: [
    field({
      name: 'name',
      type: 'String',
      formMeta: { title: 'Название', placeholder: 'Введите', tooltip: { description: 'Подсказка' } },
    }),
    field({ name: 'note', type: 'String', isRequired: false, formMeta: { title: 'Заметка' } }),
    field({ name: 'plain', type: 'Int' }),
  ],
}

describe('UpdateFormSchema сохраняет мету полей', () => {
  it('поля Update-схемы несут ту же ui-мету, что и Create', () => {
    const exports = evalGenerated(generateModelCode(modelInfo, new Set()))
    const create = exports['ProductCreateFormSchema'] as AnyObjectSchema
    const update = exports['ProductUpdateFormSchema'] as AnyObjectSchema

    expect(update.shape['name']?.meta()).toEqual(create.shape['name']?.meta())
    expect(update.shape['name']?.meta()?.ui?.title).toBe('Название')
    expect(update.shape['name']?.meta()?.ui?.tooltip?.description).toBe('Подсказка')
    expect(update.shape['note']?.meta()?.ui?.title).toBe('Заметка')
    // поле без меты остаётся без меты
    expect(update.shape['plain']?.meta()).toBeUndefined()
  })

  it('Update по-прежнему частичная: пустой объект проходит, неверный тип — нет', () => {
    const update = evalGenerated(generateModelCode(modelInfo, new Set()))['ProductUpdateFormSchema'] as AnyObjectSchema

    expect(update.safeParse({}).success).toBe(true)
    expect(update.safeParse({ plain: 'не число' }).success).toBe(false)
  })

  it('ветка с @@validate: Update тоже сохраняет мету', () => {
    const code = generateModelCode(
      { ...modelInfo, validations: [{ conditionExpr: `{ kind: 'literal', value: true }`, message: 'msg' }] },
      new Set(),
    )
    const update = evalGenerated(code)['ProductUpdateFormSchema'] as AnyObjectSchema

    expect(update.shape['name']?.meta()?.ui?.title).toBe('Название')
  })

  it('@@strict: Update остаётся строгой', () => {
    const update = evalGenerated(generateModelCode({ ...modelInfo, isStrict: true }, new Set()))[
      'ProductUpdateFormSchema'
    ] as AnyObjectSchema

    expect(update.safeParse({ unknown: 1 }).success).toBe(false)
  })

  it('модель без меты у полей: прежний .partial(), хелпер не эмитится', () => {
    const code = generateModelCode(
      { name: 'Plain', excludedFields: [], fields: [field({ name: 'x', type: 'String' })] },
      new Set(),
    )

    expect(code).not.toContain('partialKeepingMeta')
    expect(code).toContain('PlainUpdateFormSchema = PlainCreateFormSchema.partial()')
  })

  it('модель с метой: Update строится через partialKeepingMeta', () => {
    const code = generateModelCode(modelInfo, new Set())

    expect(code).toContain('function partialKeepingMeta')
    expect(code).toContain('ProductUpdateFormSchema = partialKeepingMeta(ProductCreateFormSchema)')
  })
})
