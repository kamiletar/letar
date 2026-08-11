import { describe, expect, it } from 'vitest'
import { scrubPii } from './scrub-event'

describe('scrubPii', () => {
  it('удаляет IP пользователя', () => {
    const event = { user: { id: '1', ip_address: '1.2.3.4' } }
    expect(scrubPii(event).user.ip_address).toBeUndefined()
  })

  it('удаляет cookies и authorization/cookie-заголовки запроса', () => {
    const event = {
      request: {
        cookies: 'session=abc',
        headers: { authorization: 'Bearer x', cookie: 'a=b', 'user-agent': 'test' },
      },
    }
    const result = scrubPii(event)
    expect(result.request.cookies).toBeUndefined()
    expect(result.request.headers.authorization).toBeUndefined()
    expect(result.request.headers.cookie).toBeUndefined()
    expect(result.request.headers['user-agent']).toBe('test')
  })

  it('не падает на пустом событии', () => {
    expect(scrubPii({})).toEqual({})
  })
})
