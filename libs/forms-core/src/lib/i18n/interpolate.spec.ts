import { describe, expect, it, vi } from 'vitest'
import { interpolate } from './interpolate'

describe('interpolate', () => {
  it('подставляет одиночный параметр', () => {
    expect(interpolate('PNG, JPG до {size}МБ', { size: 10 })).toBe('PNG, JPG до 10МБ')
  })

  it('подставляет несколько параметров', () => {
    expect(interpolate('«{field}» очищено: изменилось «{parent}»', { field: 'Город', parent: 'Страна' })).toBe(
      '«Город» очищено: изменилось «Страна»',
    )
  })

  it('заменяет все вхождения одного плейсхолдера', () => {
    expect(interpolate('{x} и ещё раз {x}', { x: 1 })).toBe('1 и ещё раз 1')
  })

  it('предупреждает и оставляет как есть, если плейсхолдер не совпал с ключом params', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(interpolate('до {size}МБ', { maxSize: 10 })).toBe('до {size}МБ')
    expect(warn).toHaveBeenCalledOnce()

    warn.mockRestore()
  })

  it('не предупреждает, если в шаблоне не осталось плейсхолдеров', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(interpolate('обычный текст без параметров', {})).toBe('обычный текст без параметров')
    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
})
