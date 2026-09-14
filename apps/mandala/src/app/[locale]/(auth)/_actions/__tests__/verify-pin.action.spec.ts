// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDb } from '../../_adapters/__tests__/fake-prisma'
import { verifyPinAction } from '../verify-pin.action'

const { requestHeaders } = vi.hoisted(() => ({ requestHeaders: new Headers() }))

vi.mock('@/lib/db', async () => ({
  prisma: (await import('../../_adapters/__tests__/fake-prisma')).fakeDb.prisma,
}))
vi.mock('next/headers', () => ({ headers: async () => requestHeaders }))

const EMAIL = 'buyer@example.com'
const PIN = '123456'

let ipCounter = 0

beforeEach(() => {
  fakeDb.reset()
  // Лимитер по IP живёт в модуле между тестами — каждому тесту свой адрес
  requestHeaders.set('x-forwarded-for', `10.0.1.${++ipCounter}`)

  fakeDb.users.push({ id: 'u1', email: EMAIL, emailVerified: false })
  fakeDb.addVerification({
    identifier: EMAIL,
    value: 'link-token',
    pin: PIN,
    pinExpires: new Date(Date.now() + 600_000),
    expiresInMs: 86_400_000,
  })
})

describe('verifyPinAction — лимит попыток (защита от параллельного перебора)', () => {
  it('после 5 неверных попыток блокирует даже верный PIN', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await verifyPinAction(EMAIL, '000000')).toEqual({ success: false, error: 'INVALID_PIN' })
    }

    expect(await verifyPinAction(EMAIL, PIN)).toEqual({ success: false, error: 'TOO_MANY_ATTEMPTS' })
    expect(fakeDb.users[0].emailVerified).toBe(false)
  })

  it('параллельный перебор не обходит лимит — не больше 5 реальных сравнений PIN', async () => {
    const guesses = Array.from({ length: 20 }, (_, i) => String(i).padStart(6, '0'))
    const results = await Promise.all(guesses.map((pin) => verifyPinAction(EMAIL, pin)))

    const compared = results.filter((r) => !r.success && r.error === 'INVALID_PIN')
    expect(compared.length).toBeLessThanOrEqual(5)
    expect(results.filter((r) => !r.success && r.error === 'TOO_MANY_ATTEMPTS').length).toBeGreaterThanOrEqual(15)
  })

  it('верный PIN даёт одноразовый auto-login токен и сбрасывает счётчик попыток', async () => {
    await verifyPinAction(EMAIL, '000000')

    const result = await verifyPinAction(EMAIL, PIN)

    expect(result.success).toBe(true)
    const token = result.success ? result.token : ''
    const row = fakeDb.verifications.find((r) => r.value === token)
    expect(row).toMatchObject({ identifier: EMAIL, pin: null, pinAttempts: 0 })
    expect(fakeDb.users[0].emailVerified).toBe(true)
    // Старый (пред-PIN) токен больше не существует — заменён атомарно
    expect(fakeDb.verifications.some((r) => r.value === 'link-token')).toBe(false)
  })

  it('ограничивает число проверок PIN с одного IP по всем email', async () => {
    for (let i = 0; i < 30; i++) {
      await verifyPinAction(`nobody-${i}@example.com`, '000000')
    }

    expect(await verifyPinAction(EMAIL, PIN)).toEqual({ success: false, error: 'TOO_MANY_ATTEMPTS' })
  })
})
