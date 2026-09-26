import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { collectRelations } from './collect-relations'

const relation = (model: string, labelField: string, extra: Record<string, unknown> = {}) => ({
  ui: { fieldProps: { relation: { model, labelField, ...extra } } },
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collectRelations', () => {
  it('собирает справочники из fieldProps.relation с путями полей', () => {
    const schema = z.object({
      title: z.string(),
      categoryId: z.string().meta(relation('Category', 'name')),
      tagId: z.string().optional().meta(relation('Tag', 'title', { valueField: 'slug', descriptionField: 'note' })),
    })

    expect(collectRelations(schema)).toEqual([
      { model: 'Category', labelField: 'name', paths: ['categoryId'] },
      { model: 'Tag', labelField: 'title', valueField: 'slug', descriptionField: 'note', paths: ['tagId'] },
    ])
  })

  it('один справочник у нескольких полей — одна запись со всеми путями', () => {
    const schema = z.object({
      mainId: z.string().meta(relation('Category', 'name')),
      extraId: z.string().meta(relation('Category', 'name')),
    })

    expect(collectRelations(schema)).toEqual([
      { model: 'Category', labelField: 'name', paths: ['mainId', 'extraId'] },
    ])
  })

  it('находит поля внутри объектов и строк массива', () => {
    const schema = z.object({
      address: z.object({ regionId: z.string().meta(relation('Region', 'name')) }),
      items: z.array(z.object({ unitId: z.string().meta(relation('Unit', 'short')) })),
    })

    expect(collectRelations(schema).map((r) => r.model).sort()).toEqual(['Region', 'Unit'])
  })

  it('пропускает поля с ключом реестра createForm: такой компонент грузит данные сам', () => {
    const schema = z.object({
      categoryId: z.string().meta({
        ui: { fieldType: 'Select.Category', fieldProps: { relation: { model: 'Category', labelField: 'name' } } },
      } as never),
      tagId: z.string().meta(relation('Tag', 'title')),
    })

    expect(collectRelations(schema).map((r) => r.model)).toEqual(['Tag'])
  })

  it('relation без model или labelField пропускается с предупреждением', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const schema = z.object({
      noModel: z.string().meta({ ui: { fieldProps: { relation: { labelField: 'name' } } } }),
      noLabel: z.string().meta({ ui: { fieldProps: { relation: { model: 'Category' } } } }),
    })

    expect(collectRelations(schema)).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    expect(String(warn.mock.calls[0]?.[0])).toContain('noModel')
    expect(String(warn.mock.calls[1]?.[0])).toContain('noLabel')
  })

  it('разные labelField у одной модели: побеждает первое поле, второе — предупреждение', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const schema = z.object({
      firstId: z.string().meta(relation('Category', 'name')),
      secondId: z.string().meta(relation('Category', 'title')),
    })

    expect(collectRelations(schema)).toEqual([
      { model: 'Category', labelField: 'name', paths: ['firstId', 'secondId'] },
    ])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('secondId')
  })

  it('схема без relation и не-объект дают пустой список', () => {
    expect(collectRelations(z.object({ title: z.string() }))).toEqual([])
    expect(collectRelations(z.string())).toEqual([])
    expect(collectRelations(undefined)).toEqual([])
  })
})
