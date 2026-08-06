import { describe, expect, it } from 'vitest'
import { checkRecordLimit, DEFAULT_RECORD_LIMIT, recordLimitError } from './record-limit'

describe('checkRecordLimit', () => {
  it('разрешает создание, когда текущее количество меньше лимита', () => {
    expect(checkRecordLimit(0, 50)).toBe(true)
    expect(checkRecordLimit(49, 50)).toBe(true)
  })

  it('запрещает создание на границе лимита (currentCount === limit)', () => {
    expect(checkRecordLimit(50, 50)).toBe(false)
  })

  it('запрещает создание при превышении лимита', () => {
    expect(checkRecordLimit(51, 50)).toBe(false)
  })

  it('использует DEFAULT_RECORD_LIMIT (50), если лимит не передан', () => {
    expect(checkRecordLimit(49)).toBe(true)
    expect(checkRecordLimit(50)).toBe(false)
  })

  it('работает с пользовательским лимитом', () => {
    expect(checkRecordLimit(4, 5)).toBe(true)
    expect(checkRecordLimit(5, 5)).toBe(false)
  })

  it('DEFAULT_RECORD_LIMIT равен 50', () => {
    expect(DEFAULT_RECORD_LIMIT).toBe(50)
  })
})

describe('recordLimitError', () => {
  it('включает лимит по умолчанию в сообщение', () => {
    expect(recordLimitError()).toBe('Достигнут лимит демо-записей (50). Удалите старые для создания новых.')
  })

  it('включает переданный лимит в сообщение', () => {
    expect(recordLimitError(10)).toBe('Достигнут лимит демо-записей (10). Удалите старые для создания новых.')
  })
})
