// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { normalizeServerUrl } from './url'

describe('normalizeServerUrl', () => {
  it('обрезает пробелы по краям', () => {
    expect(normalizeServerUrl('  192.168.1.100:3100  ')).toBe('http://192.168.1.100:3100')
  })

  it('добавляет http://, если протокол отсутствует', () => {
    expect(normalizeServerUrl('192.168.1.100:3100')).toBe('http://192.168.1.100:3100')
  })

  it('не трогает уже указанный http://', () => {
    expect(normalizeServerUrl('http://192.168.1.100:3100')).toBe('http://192.168.1.100:3100')
  })

  it('не трогает уже указанный https://', () => {
    expect(normalizeServerUrl('https://example.com')).toBe('https://example.com')
  })

  it('убирает одиночный trailing slash', () => {
    expect(normalizeServerUrl('http://example.com/')).toBe('http://example.com')
  })

  it('убирает несколько trailing slash', () => {
    expect(normalizeServerUrl('http://example.com///')).toBe('http://example.com')
  })

  it('сочетает все нормализации сразу', () => {
    expect(normalizeServerUrl('  example.com/  ')).toBe('http://example.com')
  })
})
