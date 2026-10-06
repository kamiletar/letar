import { describe, expect, it } from 'vitest'
import { branchInput, findHeads, mergeInput } from './branches'

const v = (id: string, parentId: string | null, mergedFromId: string | null = null) => ({
  id,
  parentId,
  mergedFromId,
  title: id,
  body: `текст ${id}`,
})

describe('findHeads', () => {
  it('линейная история — одна голова', () => {
    expect(findHeads([v('a', null), v('b', 'a'), v('c', 'b')]).map((h) => h.id)).toEqual(['c'])
  })

  it('две правки от одной версии — две головы', () => {
    expect(findHeads([v('a', null), v('b', 'a'), v('c', 'a')]).map((h) => h.id).sort()).toEqual(['b', 'c'])
  })

  it('слитая ветка перестаёт быть головой', () => {
    const versions = [v('a', null), v('b', 'a'), v('c', 'a'), v('m', 'b', 'c')]
    expect(findHeads(versions).map((h) => h.id)).toEqual(['m'])
  })

  it('пустая история — нет голов', () => {
    expect(findHeads([])).toEqual([])
  })
})

describe('branchInput', () => {
  const base = { id: 'a', title: 'Т', body: 'один' }

  it('правка от устаревшей базы — версия с этим родителем', () => {
    expect(branchInput(base, { title: 'Т', body: 'один\nдва' }, 'tablet')).toEqual({
      parentId: 'a',
      title: 'Т',
      body: 'один\nдва',
      deviceId: 'tablet',
    })
  })

  it('если правка совпадает с базой, ветка не нужна', () => {
    expect(branchInput(base, { title: 'Т', body: 'один' })).toBeNull()
  })

  it('без базы (заметка новая с другого устройства) ветка — корень', () => {
    expect(branchInput(null, { title: 'Т', body: 'текст' })).toMatchObject({ parentId: null })
  })
})

describe('mergeInput', () => {
  it('слияние: родитель — выбранная голова, вторая записана в mergedFromId', () => {
    expect(mergeInput(v('b', 'a'), v('c', 'a'), { title: 'Итог', body: 'сведено' })).toEqual({
      parentId: 'b',
      mergedFromId: 'c',
      title: 'Итог',
      body: 'сведено',
      deviceId: null,
    })
  })

  it('нельзя слить версию саму с собой', () => {
    expect(mergeInput(v('b', 'a'), v('b', 'a'), { title: 'x', body: 'y' })).toBeNull()
  })
})
