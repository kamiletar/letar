import { describe, expect, it } from 'vitest'
import { errorText, pretty, text } from './tool-response.js'

describe('tool-response', () => {
  it('text() возвращает isError: false', () => {
    expect(text('ok')).toEqual({ content: [{ type: 'text', text: 'ok' }], isError: false })
  })

  it('errorText() возвращает isError: true', () => {
    expect(errorText('boom')).toEqual({ content: [{ type: 'text', text: 'boom' }], isError: true })
  })

  it('pretty() форматирует данные как json-блок', () => {
    expect(pretty({ a: 1 })).toBe('```json\n{\n  "a": 1\n}\n```')
  })
})
