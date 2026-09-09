import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDevSessionRoute, type DevSessionPrismaClient } from './create-dev-session-route'

const AUTH_SECRET = 'test-auth-secret-not-real'

function createFakePrisma(): DevSessionPrismaClient {
  const users = new Map<string, { id: string }>()
  return {
    user: {
      async findUnique({ where }) {
        return users.get(where.email) ?? null
      },
      async create({ data }) {
        const user = { id: `user-${users.size + 1}` }
        users.set(data.email as string, user)
        return user
      },
    },
    session: {
      async create() {
        return {}
      },
    },
  }
}

describe('createDevSessionRoute', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.ALLOW_DEV_SESSION = 'true'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('принимает токен с "+" в query-параметре без ручного URL-кодирования', async () => {
    // base64-токен почти всегда содержит "+" — application/x-www-form-urlencoded декодирует его
    // как пробел ещё до сравнения (URLSearchParams), если не закодирован явно как %2B
    const token = 'AAA+BBB/CCC='
    process.env.DEV_SESSION_TOKEN = token

    const GET = createDevSessionRoute({
      prisma: createFakePrisma(),
      authSecret: AUTH_SECRET,
      defaultEmail: 'dev@example.com',
    })

    // Литеральный "+" в query-строке — то же самое, что вставить токен в адресную строку браузера
    // или curl без ручного кодирования
    const response = await GET(new Request(`http://localhost/api/auth/dev-session?token=${token}`))

    expect(response.status).not.toBe(403)
    expect(response.headers.get('Set-Cookie')).toBeTruthy()
  })

  it('отклоняет неверный токен', async () => {
    process.env.DEV_SESSION_TOKEN = 'AAA+BBB/CCC='

    const GET = createDevSessionRoute({
      prisma: createFakePrisma(),
      authSecret: AUTH_SECRET,
      defaultEmail: 'dev@example.com',
    })

    const response = await GET(new Request('http://localhost/api/auth/dev-session?token=wrong-token'))

    expect(response.status).toBe(403)
  })

  it('не трогает "+" в заголовке x-dev-session-token (там URL-декодирования нет)', async () => {
    const token = 'AAA+BBB/CCC='
    process.env.DEV_SESSION_TOKEN = token

    const GET = createDevSessionRoute({
      prisma: createFakePrisma(),
      authSecret: AUTH_SECRET,
      defaultEmail: 'dev@example.com',
    })

    const response = await GET(
      new Request('http://localhost/api/auth/dev-session', {
        headers: { 'x-dev-session-token': token },
      }),
    )

    expect(response.status).not.toBe(403)
  })
})
