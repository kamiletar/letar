/**
 * extractAndValidateFiles — множественная загрузка через formData.getAll(fieldName).
 * В отличие от extractAndValidateFile (один файл), невалидные записи не прерывают
 * всю операцию, а попадают в `failures` с причиной пропуска.
 */

import { describe, expect, it } from 'vitest'
import { extractAndValidateFiles } from './validate-file'

function makeRequest(fieldName: string, entries: Array<File | string>): Request {
  const formData = new FormData()
  for (const entry of entries) {
    formData.append(fieldName, entry)
  }
  return new Request('http://localhost/upload', { method: 'POST', body: formData })
}

const IMAGE_OPTIONS = { maxSize: 1024, allowedTypes: 'image/' }

describe('extractAndValidateFiles', () => {
  it('возвращает все файлы, когда все валидны', async () => {
    const a = new File(['a'], 'a.png', { type: 'image/png' })
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' })

    const result = await extractAndValidateFiles(makeRequest('files', [a, b]), 'files', IMAGE_OPTIONS)

    expect(result.error).toBeUndefined()
    expect(result.files).toHaveLength(2)
    expect(result.files?.map((f) => f.name)).toEqual(['a.png', 'b.jpg'])
    expect(result.failures).toEqual([])
  })

  it('пропускает невалидные файлы, продолжая обработку остальных', async () => {
    const valid = new File(['a'], 'valid.png', { type: 'image/png' })
    const wrongType = new File(['b'], 'doc.pdf', { type: 'application/pdf' })
    const tooBig = new File(['x'.repeat(2000)], 'big.png', { type: 'image/png' })

    const result = await extractAndValidateFiles(
      makeRequest('files', [valid, wrongType, tooBig]),
      'files',
      IMAGE_OPTIONS,
    )

    expect(result.error).toBeUndefined()
    expect(result.files?.map((f) => f.name)).toEqual(['valid.png'])
    expect(result.failures).toHaveLength(2)
    expect(result.failures?.[0]).toMatchObject({ index: 1, name: 'doc.pdf' })
    expect(result.failures?.[1]).toMatchObject({ index: 2, name: 'big.png' })
    expect(result.failures?.[0]?.reason).toContain('Недопустимый тип файла')
    expect(result.failures?.[1]?.reason).toContain('превышает максимум')
  })

  it('помечает нефайловые значения поля как failure, а не бросает исключение', async () => {
    const valid = new File(['a'], 'valid.png', { type: 'image/png' })

    const result = await extractAndValidateFiles(makeRequest('files', ['not-a-file', valid]), 'files', IMAGE_OPTIONS)

    expect(result.error).toBeUndefined()
    expect(result.files?.map((f) => f.name)).toEqual(['valid.png'])
    expect(result.failures).toEqual([{ index: 0, name: 'not-a-file', reason: 'Значение не является файлом' }])
  })

  it('возвращает пустые files/failures, если поле отсутствует в форме', async () => {
    const result = await extractAndValidateFiles(makeRequest('other', []), 'files', IMAGE_OPTIONS)

    expect(result.error).toBeUndefined()
    expect(result.files).toEqual([])
    expect(result.failures).toEqual([])
  })

  it('возвращает error, если тело запроса не парсится как FormData', async () => {
    const brokenRequest = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=broken' },
      body: 'not-a-valid-multipart-body',
    })

    const result = await extractAndValidateFiles(brokenRequest, 'files', IMAGE_OPTIONS)

    expect(result.files).toBeUndefined()
    expect(result.error).toBeDefined()
  })
})
