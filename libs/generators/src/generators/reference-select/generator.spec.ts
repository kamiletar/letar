import { logger, type Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import referenceSelectGenerator from './generator'

function seedApp(tree: Tree, app: string, zmodel?: string): void {
  tree.write(`apps/${app}/package.json`, JSON.stringify({ name: `@letar/${app}` }))
  if (zmodel !== undefined) {
    tree.write(`apps/${app}/schema.zmodel`, zmodel)
  }
}

const ZMODEL = `model WorkCategory {
  id   String @id @default(cuid())
  name String
}
`

describe('reference-select generator', () => {
  let tree: Tree

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('select: пишет файл в <app>-form/selects и подставляет модель, ключ клиента и поле подписи', () => {
    seedApp(tree, 'shop', ZMODEL)

    referenceSelectGenerator(tree, { app: 'shop', model: 'WorkCategory' })

    const file = 'apps/shop/src/shop-form/selects/work-category-select.tsx'
    expect(tree.exists(file)).toBe(true)
    const content = tree.read(file, 'utf-8')!
    expect(content).toContain('export function WorkCategorySelect(')
    expect(content).toContain('client.workCategory.useFindMany')
    expect(content).toContain("import { schema } from '@/generated/schema'")
    expect(content).toContain('useZenStackOptions')
    expect(content).toContain('orderBy: { name:')
    // шаблонных меток не осталось
    expect(content).not.toMatch(/<%|%>/)
  })

  it('combobox: пишет файл в comboboxes, поиск и подпись выбранного через forms-query', () => {
    seedApp(tree, 'shop', ZMODEL)

    referenceSelectGenerator(tree, { app: 'shop', model: 'WorkCategory', kind: 'combobox' })

    const content = tree.read('apps/shop/src/shop-form/comboboxes/work-category-combobox.tsx', 'utf-8')!
    expect(content).toContain('export function WorkCategoryCombobox(')
    expect(content).toContain('fromSearchQuery(useWorkCategorySearch)')
    expect(content).toContain('fromSelectedQuery(useWorkCategoryById)')
    expect(content).toContain('client.workCategory.useFindUnique')
    expect(content).not.toMatch(/<%|%>/)
  })

  it('подставляет свои labelField, dir и schemaImport', () => {
    seedApp(tree, 'shop')

    referenceSelectGenerator(tree, {
      app: 'shop',
      model: 'Brand',
      labelField: 'title',
      dir: 'apps/shop/src/custom',
      schemaImport: '@/db/schema',
    })

    const content = tree.read('apps/shop/src/custom/brand-select.tsx', 'utf-8')!
    expect(content).toContain("from '@/db/schema'")
    expect(content).toContain('title: string')
    expect(content).toContain('row.title')
  })

  it('не перезаписывает существующий файл', () => {
    seedApp(tree, 'shop')
    const file = 'apps/shop/src/shop-form/selects/brand-select.tsx'
    tree.write(file, '// правки человека')

    expect(() => referenceSelectGenerator(tree, { app: 'shop', model: 'Brand' })).toThrow('не перезаписывает')
    expect(tree.read(file, 'utf-8')).toBe('// правки человека')
  })

  it('падает, если приложения нет', () => {
    expect(() => referenceSelectGenerator(tree, { app: 'nope', model: 'Brand' })).toThrow('не найдено')
  })

  it('падает на имени модели не в PascalCase и на кривом labelField', () => {
    seedApp(tree, 'shop')

    expect(() => referenceSelectGenerator(tree, { app: 'shop', model: 'work-category' })).toThrow('PascalCase')
    expect(() => referenceSelectGenerator(tree, { app: 'shop', model: 'Brand', labelField: 'a b' })).toThrow(
      'labelField',
    )
  })

  it('падает на неизвестном kind', () => {
    seedApp(tree, 'shop')

    expect(() => referenceSelectGenerator(tree, { app: 'shop', model: 'Brand', kind: 'radio' as 'select' })).toThrow(
      'select или combobox',
    )
  })

  it('предупреждает об обязательных полях модели, кроме подписи', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    seedApp(
      tree,
      'shop',
      `model City {
  id        String  @id @default(cuid())
  name      String
  note      String?
  status    String  @default("ACTIVE")
  countryId String
  country   Country @relation(fields: [countryId], references: [id])
  visits    Visit[]
}
`,
    )

    referenceSelectGenerator(tree, { app: 'shop', model: 'City' })

    const message = warn.mock.calls.map((call) => String(call[0])).join('\n')
    expect(message).toContain('обязательные поля')
    expect(message).toContain('countryId')
    // необязательные, с default, связи и списки в предупреждение не попадают
    expect(message).not.toMatch(/note|status|visits|country[^I]/)
    warn.mockRestore()
  })

  it('берёт папку формы приложения, если она одна и называется не <app>-form', () => {
    seedApp(tree, 'shop')
    tree.write('apps/shop/src/store-form/store-form.tsx', 'export {}')

    referenceSelectGenerator(tree, { app: 'shop', model: 'Brand' })

    expect(tree.exists('apps/shop/src/store-form/selects/brand-select.tsx')).toBe(true)
  })

  it('нет модели в schema.zmodel — файл всё равно создаётся (модель может прийти через import)', () => {
    seedApp(tree, 'shop', ZMODEL)

    referenceSelectGenerator(tree, { app: 'shop', model: 'Brand' })

    expect(tree.exists('apps/shop/src/shop-form/selects/brand-select.tsx')).toBe(true)
  })
})
