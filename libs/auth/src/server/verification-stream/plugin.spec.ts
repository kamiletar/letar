import { describe, expect, it } from 'vitest'
import { resolveVerificationStreamEmail, verificationStreamMatcher } from './plugin'

describe('verificationStreamMatcher', () => {
  it('матчит /sign-up/email', () => {
    expect(verificationStreamMatcher({ path: '/sign-up/email' })).toBe(true)
  })

  it('матчит /send-verification-email', () => {
    expect(verificationStreamMatcher({ path: '/send-verification-email' })).toBe(true)
  })

  it('не матчит прочие пути', () => {
    expect(verificationStreamMatcher({ path: '/sign-in/email' })).toBe(false)
    expect(verificationStreamMatcher({})).toBe(false)
  })
})

describe('resolveVerificationStreamEmail', () => {
  it('/sign-up/email — берёт email из ответа эндпоинта', async () => {
    const email = await resolveVerificationStreamEmail({
      path: '/sign-up/email',
      context: { returned: { user: { email: 'new@example.com' } } },
    })
    expect(email).toBe('new@example.com')
  })

  it('/sign-up/email — Response-обёртка с 200', async () => {
    const returned = new Response(JSON.stringify({ user: { email: 'resp@example.com' } }), { status: 200 })
    const email = await resolveVerificationStreamEmail({ path: '/sign-up/email', context: { returned } })
    expect(email).toBe('resp@example.com')
  })

  it('/sign-up/email — Response с ошибочным статусом → undefined', async () => {
    const returned = new Response(JSON.stringify({ user: { email: 'resp@example.com' } }), { status: 400 })
    const email = await resolveVerificationStreamEmail({ path: '/sign-up/email', context: { returned } })
    expect(email).toBeUndefined()
  })

  it('/sign-up/email — APIError в returned → undefined', async () => {
    const apiError = Object.assign(new Error('boom'), {
      name: 'APIError',
      status: 'BAD_REQUEST',
      body: {},
      headers: new Headers(),
    })
    const email = await resolveVerificationStreamEmail({ path: '/sign-up/email', context: { returned: apiError } })
    expect(email).toBeUndefined()
  })

  it('/send-verification-email — email из тела запроса', async () => {
    const email = await resolveVerificationStreamEmail({
      path: '/send-verification-email',
      context: {},
      body: { email: 'resend@example.com' },
    })
    expect(email).toBe('resend@example.com')
  })

  it('/send-verification-email — фоллбек на email текущей сессии, если тела нет', async () => {
    const email = await resolveVerificationStreamEmail({
      path: '/send-verification-email',
      context: { session: { user: { email: 'session@example.com' } } },
    })
    expect(email).toBe('session@example.com')
  })
})
