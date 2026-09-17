import { betterAuth } from 'better-auth'
import { memoryAdapter, type MemoryDB } from 'better-auth/adapters/memory'
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

// Регрессия на TODO из create-dev-session-route.ts: cookie подписывается вручную по формату
// better-call, а не через auth.api.signInEmail. Этот тест гоняет вручную созданную сессию через
// НАСТОЯЩИЙ betterAuth().api.getSession() (memoryAdapter вместо Prisma — та же схема БД, без
// поднятия Postgres) — если better-auth сменит формат/имя cookie в будущей версии, этот тест
// упадёт первым, вместо того чтобы бэкдор молча переставал работать в проде/на staging.
describe('createDevSessionRoute — cookie распознаётся реальным betterAuth()', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.ALLOW_DEV_SESSION = 'true'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('сессия проходит auth.api.getSession() того же инстанса betterAuth()', async () => {
    const db: MemoryDB = { user: [], session: [] }
    const authSecret = 'integration-test-secret-not-real-1234567890'

    const auth = betterAuth({
      secret: authSecret,
      baseURL: 'http://localhost:3999',
      database: memoryAdapter(db),
      emailAndPassword: { enabled: true },
    })

    // Пишем напрямую в те же массивы, что читает memoryAdapter — так же, как в проде
    // dev-session route пишет через прикладной Prisma/ZenStack-клиент в ту же таблицу, которую
    // потом читает betterAuth() через prismaAdapter().
    const prisma: DevSessionPrismaClient = {
      user: {
        async findUnique({ where }) {
          return db.user.find((u) => u.email === where.email) ?? null
        },
        async create({ data }) {
          const now = new Date()
          const user = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data }
          db.user.push(user)
          return user as { id: string }
        },
      },
      session: {
        async create({ data }) {
          const now = new Date()
          const session = { createdAt: now, updatedAt: now, ...data }
          db.session.push(session)
          return session
        },
      },
    }

    process.env.DEV_SESSION_TOKEN = 'integration-token'

    const GET = createDevSessionRoute({
      prisma,
      authSecret,
      defaultEmail: 'admin@example.com',
    })

    const response = await GET(
      new Request('http://localhost:3999/api/auth/dev-session?token=integration-token'),
    )
    const setCookie = response.headers.get('Set-Cookie')
    expect(setCookie).toBeTruthy()
    const cookieValue = setCookie!.split(';')[0]

    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookieValue }) })

    expect(session?.user.email).toBe('admin@example.com')
  })
})
