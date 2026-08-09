import { describe, expect, it } from 'vitest'
import { parseFileSize, sanitizeFileName, validateMimeType } from './file-security'

describe('parseFileSize', () => {
  it('парсит MB', () => {
    expect(parseFileSize('10MB')).toBe(10 * 1024 * 1024)
  })

  it('парсит KB', () => {
    expect(parseFileSize('500KB')).toBe(500 * 1024)
  })

  it('парсит число как есть', () => {
    expect(parseFileSize(1024)).toBe(1024)
  })

  it('парсит GB', () => {
    expect(parseFileSize('1GB')).toBe(1024 * 1024 * 1024)
  })

  it('бросает ошибку при невалидном формате', () => {
    expect(() => parseFileSize('10XX')).toThrow('Invalid file size format')
  })
})

describe('validateMimeType', () => {
  // Создаём файл с заданными magic bytes
  function createFileWithBytes(bytes: number[], type: string, name = 'test.bin'): File {
    const buffer = new Uint8Array([...bytes, ...new Array(8 - bytes.length).fill(0)])
    return new File([buffer], name, { type })
  }

  it('определяет JPEG по magic bytes', async () => {
    const file = createFileWithBytes([0xff, 0xd8, 0xff, 0xe0], 'image/jpeg', 'photo.jpg')
    const result = await validateMimeType(file, ['image/jpeg'])
    expect(result.valid).toBe(true)
    expect(result.detectedMime).toBe('image/jpeg')
  })

  it('определяет PNG по magic bytes', async () => {
    const file = createFileWithBytes([0x89, 0x50, 0x4e, 0x47], 'image/png', 'img.png')
    const result = await validateMimeType(file, ['image/png'])
    expect(result.valid).toBe(true)
    expect(result.detectedMime).toBe('image/png')
  })

  it('отклоняет файл с неразрешённым типом', async () => {
    const file = createFileWithBytes([0x89, 0x50, 0x4e, 0x47], 'image/png', 'img.png')
    const result = await validateMimeType(file, ['application/pdf'])
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('not allowed')
  })

  it('поддерживает wildcard (image/*)', async () => {
    const file = createFileWithBytes([0xff, 0xd8, 0xff, 0xe0], 'image/jpeg', 'photo.jpg')
    const result = await validateMimeType(file, ['image/*'])
    expect(result.valid).toBe(true)
  })

  it('определяет PDF по magic bytes', async () => {
    const file = createFileWithBytes([0x25, 0x50, 0x44, 0x46], 'application/pdf', 'doc.pdf')
    const result = await validateMimeType(file, ['application/pdf'])
    expect(result.valid).toBe(true)
    expect(result.detectedMime).toBe('application/pdf')
  })
})

describe('sanitizeFileName', () => {
  it('заменяет имя файла на UUID, сохраняя расширение', () => {
    const original = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    const sanitized = sanitizeFileName(original)

    expect(sanitized.name).not.toBe('photo.jpg')
    expect(sanitized.name).toMatch(/^[\da-f-]+\.jpg$/)
    expect(sanitized.type).toBe('image/jpeg')
  })

  it('обрабатывает файл без расширения', () => {
    const original = new File(['test'], 'README', { type: 'text/plain' })
    const sanitized = sanitizeFileName(original)

    expect(sanitized.name).toMatch(/^[\da-f-]+$/)
  })

  it('защищает от path traversal', () => {
    const malicious = new File(['test'], '../../etc/passwd', { type: 'text/plain' })
    const sanitized = sanitizeFileName(malicious)

    expect(sanitized.name).not.toContain('..')
    expect(sanitized.name).not.toContain('/')
  })
})
