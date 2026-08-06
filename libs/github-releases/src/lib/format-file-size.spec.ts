import { describe, expect, it } from 'vitest'
import { formatFileSize } from './format-file-size'

describe('formatFileSize', () => {
  it('форматирует байты', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('форматирует килобайты', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('форматирует мегабайты', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
