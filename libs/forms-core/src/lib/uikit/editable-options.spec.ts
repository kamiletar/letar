import { describe, expect, it } from 'vitest'
import { CREATE_OPTION_VALUE } from './creatable-options'
import {
  applyOptionOverlay,
  isOptionEditable,
  type OptionOverlayEntry,
  pruneOptionOverlay,
  upsertOptionOverlay,
} from './editable-options'

const entry = (patch: Partial<OptionOverlayEntry> = {}): OptionOverlayEntry => ({
  fromValue: 'a',
  label: 'Новое',
  value: 'a',
  hasData: false,
  baselineText: 'Старое',
  ...patch,
})

describe('isOptionEditable', () => {
  it('нужен onUpdate', () => {
    expect(isOptionEditable({ value: 'a' }, false)).toBe(false)
    expect(isOptionEditable({ value: 'a' }, true)).toBe(true)
  })

  it('editable: false, disabled, пустое и служебное value — нельзя', () => {
    expect(isOptionEditable({ value: 'a', editable: false }, true)).toBe(false)
    expect(isOptionEditable({ value: 'a', disabled: true }, true)).toBe(false)
    expect(isOptionEditable({ value: 'a', pending: true }, true)).toBe(false)
    expect(isOptionEditable({ value: '' }, true)).toBe(false)
    expect(isOptionEditable({ value: CREATE_OPTION_VALUE }, true)).toBe(false)
  })

  it('числовое value 0 править можно', () => {
    expect(isOptionEditable({ value: 0 }, true)).toBe(true)
  })
})

describe('upsertOptionOverlay', () => {
  it('добавляет новую запись', () => {
    expect(upsertOptionOverlay([], entry())).toHaveLength(1)
  })

  it('повторная правка заменяет запись, baselineText остаётся от первой', () => {
    const first = entry({ label: 'Первая', baselineText: 'База' })
    const result = upsertOptionOverlay([first], entry({ label: 'Вторая', baselineText: 'Другая база' }))
    expect(result).toEqual([entry({ label: 'Вторая', baselineText: 'База' })])
  })
})

describe('pruneOptionOverlay', () => {
  it('нечего убирать — тот же массив', () => {
    const overlay = [entry()]
    expect(pruneOptionOverlay([{ value: 'a', label: 'Старое' }], overlay)).toBe(overlay)
  })

  it('пустой список приложения (загрузка) — запись не сбрасывается', () => {
    const overlay = [entry()]
    expect(pruneOptionOverlay([], overlay)).toBe(overlay)
  })

  it('value тот же: свежая подпись от приложения — запись уходит', () => {
    expect(pruneOptionOverlay([{ value: 'a', label: 'Свежая' }], [entry()])).toEqual([])
  })

  it('value тот же: подпись вернулась к baselineText — запись живёт (не воскресает и не теряется)', () => {
    const overlay = [entry()]
    expect(pruneOptionOverlay([{ value: 'a', label: 'Старое' }], overlay)).toBe(overlay)
  })

  it('value другой: пришёл новый value — запись уходит; нет — остаётся', () => {
    const e = entry({ value: 'b' })
    expect(pruneOptionOverlay([{ value: 'a', label: 'Старое' }], [e])).toEqual([e])
    expect(pruneOptionOverlay([{ value: 'b', label: 'Новое' }], [e])).toEqual([])
  })

  it('числовое и строковое value — одна запись', () => {
    expect(pruneOptionOverlay([{ value: 1, label: 'Свежая' }], [entry({ fromValue: '1', value: 1 })])).toEqual([])
  })
})

describe('applyOptionOverlay', () => {
  const options = [
    { value: 'a', label: 'Старое', group: 'G', data: { n: 1 } },
    { value: 'b', label: 'Другое' },
  ]

  it('пустое наложение — тот же массив', () => {
    expect(applyOptionOverlay(options, [])).toBe(options)
  })

  it('value тот же: подпись и textValue заменены, group остаётся, data без hasData — прежняя', () => {
    const result = applyOptionOverlay(options, [entry()])
    expect(result[0]).toEqual({ value: 'a', label: 'Новое', textValue: 'Новое', group: 'G', data: { n: 1 } })
    expect(result[1]).toBe(options[1])
  })

  it('value тот же с hasData: data заменена', () => {
    const result = applyOptionOverlay(options, [entry({ hasData: true, data: { n: 2 } })])
    expect(result[0].data).toEqual({ n: 2 })
  })

  it('value другой: опция заменена на месте', () => {
    const result = applyOptionOverlay(options, [entry({ value: 'c' })])
    expect(result.map((o) => o.value)).toEqual(['c', 'b'])
    expect(result[0].label).toBe('Новое')
  })

  it('value другой, fromValue нет в списке — дописывается в конец', () => {
    const result = applyOptionOverlay(options, [entry({ fromValue: 'zz', value: 'c' })])
    expect(result.map((o) => o.value)).toEqual(['a', 'b', 'c'])
  })

  it('value тот же, fromValue нет в списке — ничего', () => {
    expect(applyOptionOverlay(options, [entry({ fromValue: 'zz', value: 'zz' })])).toEqual(options)
  })
})
