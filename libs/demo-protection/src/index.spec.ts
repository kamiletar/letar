import { describe, expect, it } from 'vitest'
import {
  checkRateLimit,
  checkRecordLimit,
  DEFAULT_RECORD_LIMIT,
  getClientIp,
  RATE_LIMIT_ERROR,
  recordLimitError,
} from './index'

describe('index.ts re-exports', () => {
  it('реэкспортирует всё публичное API пакета', () => {
    expect(typeof getClientIp).toBe('function')
    expect(typeof checkRateLimit).toBe('function')
    expect(typeof checkRecordLimit).toBe('function')
    expect(typeof recordLimitError).toBe('function')
    expect(RATE_LIMIT_ERROR).toBe('Слишком много запросов. Попробуйте через минуту.')
    expect(DEFAULT_RECORD_LIMIT).toBe(50)
  })
})
