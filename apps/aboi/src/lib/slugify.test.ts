import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('транслитерирует кириллицу в латиницу', () => {
    expect(slugify('Космический Орбит')).toBe('kosmicheskiy-orbit')
  })

  it('опускает регистр', () => {
    expect(slugify('SILA')).toBe('sila')
  })

  it('заменяет любую серию не-латинских символов на один дефис', () => {
    expect(slugify('Hello,   World!  ?')).toBe('hello-world')
  })

  it('срезает дефисы по краям', () => {
    expect(slugify('  -привет-  ')).toBe('privet')
  })

  it('обрабатывает мягкий и твёрдый знаки как пустые', () => {
    expect(slugify('подъезд')).toBe('podezd')
  })

  it('обрезает результат до 80 символов', () => {
    const long = 'a'.repeat(200)
    expect(slugify(long).length).toBe(80)
  })

  it('возвращает пустую строку, если все символы непереводимы', () => {
    expect(slugify('???!!!')).toBe('')
  })

  it('сохраняет цифры', () => {
    expect(slugify('Орбит 2024')).toBe('orbit-2024')
  })
})
