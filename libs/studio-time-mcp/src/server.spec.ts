import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultSessionRef } from './server.js'

describe('defaultSessionRef', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env['CLAUDE_CODE_SESSION_ID']
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['CLAUDE_CODE_SESSION_ID']
    } else {
      process.env['CLAUDE_CODE_SESSION_ID'] = originalEnv
    }
  })

  it('берёт CLAUDE_CODE_SESSION_ID из окружения, если он задан', () => {
    process.env['CLAUDE_CODE_SESSION_ID'] = 'abc-123'

    expect(defaultSessionRef()).toBe('abc-123')
  })

  it('фолбэк на PID процесса, если CLAUDE_CODE_SESSION_ID не задан', () => {
    delete process.env['CLAUDE_CODE_SESSION_ID']

    expect(defaultSessionRef()).toBe(`pid-${process.pid}`)
  })
})
