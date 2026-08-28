// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { formatFileSize } from './file-size'

describe('formatFileSize', () => {
  it('форматирует байты без дробной части', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('форматирует килобайты с одним знаком после запятой', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('форматирует мегабайты', () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
  })

  it('форматирует гигабайты', () => {
    expect(formatFileSize(1024 ** 3 * 1.25)).toBe('1.3 GB')
  })

  it('форматирует терабайты', () => {
    expect(formatFileSize(1024 ** 4 * 2)).toBe('2.0 TB')
  })

  it('использует кириллические единицы для locale: ru', () => {
    expect(formatFileSize(1536, { locale: 'ru' })).toBe('1.5 КБ')
    expect(formatFileSize(500, { locale: 'ru' })).toBe('500 Б')
  })
})
