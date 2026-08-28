/**
 * DB-хелперы для E2E тестов dsperevod
 *
 * Создаёт тестовые данные напрямую в БД через Prisma CJS wrapper (см. prisma-cjs-wrapper.js) —
 * ZenStack-политики здесь не нужны, тест сам управляет доступом через UI-логин.
 */
import { upsertCredentialAccount } from '@letar/e2e-testing'
import { loadEnvCascade } from '@letar/env-load'
import { execFileSync } from 'node:child_process'
import { randomBytes, scryptSync } from 'node:crypto'
import { resolve } from 'path'

// Better Auth scrypt format: `${salt_hex}:${key_hex}` (N=16384, r=16, p=1, dkLen=64)
// scryptSync вместо promisify(scrypt) — util.promisify теряет перегрузку с options-объектом
// (4 аргумента), типизация резолвится в 3-арг сигнатуру (TS2554). Тестовый setup-код —
// синхронность не критична.
async function hashPasswordBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(Buffer.from(password.normalize('NFKC')), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${key.toString('hex')}`
}

const projectDir = resolve(__dirname, '../../../dsperevod')
loadEnvCascade(projectDir)

/**
 * На s3-стейджинге у apps/dsperevod нет .env.local (только .env с PORT) — DATABASE_URL
 * остаётся пустым, а хост-порт БД динамический (docker перекидывает при конфликте). Раннер
 * e2e (dashboard-agent) прокидывает только BASE_URL/DEV_SESSION_TOKEN, не DATABASE_URL
 * (apps/dashboard-agent/src/routes/e2e.ts). Playwright исполняется на ХОСТЕ (nsenter -t 1),
 * не внутри docker-сети — обращение по внутреннему hostname `dsperevod-staging-db` оттуда не
 * резолвится, нужен host-порт.
 *
 * Фолбэк: если DATABASE_URL пуст, читаем реальный DATABASE_URL (с настоящим паролем) прямо
 * из работающего app-контейнера и переписываем в нём внутренний host:port на
 * `localhost:<текущий host-порт из docker port>`. Пароль никогда не хардкодится в тесте.
 * Только для staging — на локальной разработке .env.local всегда есть, до сюда не доходит.
 */
function resolveStagingDatabaseUrl(): string {
  const containerApp = 'dsperevod-staging-app'
  const containerDb = 'dsperevod-staging-db'

  const rawEnv = execFileSync('docker', ['exec', containerApp, 'printenv', 'DATABASE_URL'], { encoding: 'utf8' })
    .trim()
  if (!rawEnv) {
    throw new Error(`DATABASE_URL пуст внутри контейнера ${containerApp}`)
  }

  const portOutput = execFileSync('docker', ['port', containerDb, '5432'], { encoding: 'utf8' }).trim()
  const hostPort = portOutput.split(':').pop()
  if (!hostPort) {
    throw new Error(`Не удалось распарсить host-порт из "docker port ${containerDb} 5432": "${portOutput}"`)
  }

  return rawEnv.replace(`${containerDb}:5432`, `localhost:${hostPort}`)
}

if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] = resolveStagingDatabaseUrl()
}

type AnyPrisma = {
  user: Record<string, unknown>
  account: Record<string, unknown>
  translationRequest: Record<string, unknown>
  $disconnect: () => Promise<void>
}

let prisma: AnyPrisma | null = null

async function getPrisma(): Promise<AnyPrisma> {
  if (!prisma) {
    const mod = require('./prisma-cjs-wrapper')
    prisma = mod.createPrismaClient() as AnyPrisma
  }
  return prisma
}

/** Создаёт или обновляет тестового ADMIN-пользователя. Возвращает userId. */
export async function createTestAdmin(data: { email: string; password: string; name: string }): Promise<string> {
  const db = (await getPrisma()) as any
  const hashedPassword = await hashPasswordBetterAuth(data.password)

  const existing = await db.user.findUnique({ where: { email: data.email } })

  let userId: string

  if (existing) {
    await db.user.update({
      where: { email: data.email },
      data: { name: data.name, emailVerified: true, role: 'ADMIN' },
    })
    userId = existing.id
    await upsertCredentialAccount(db, { userId, hashedPassword })
  } else {
    const user = await db.user.create({
      data: { email: data.email, name: data.name, emailVerified: true, role: 'ADMIN' },
    })
    userId = user.id
    await upsertCredentialAccount(db, { userId, hashedPassword })
  }

  return userId
}

/** Создаёт тестовую заявку на перевод, возвращает её id. */
export async function createTestTranslationRequest(): Promise<string> {
  const db = (await getPrisma()) as any
  const req = await db.translationRequest.create({
    data: {
      name: 'E2E Тестов',
      email: 'e2e-request@example.com',
      phone: '+79990000000',
      status: 'NEW',
    },
    select: { id: true },
  })
  return req.id
}

/** Удаляет тестовую заявку по id (best-effort, не падает если уже удалена). */
export async function deleteTranslationRequest(id: string): Promise<void> {
  const db = (await getPrisma()) as any
  await db.translationRequest.delete({ where: { id } }).catch(() => undefined)
}

/** Закрывает соединение с БД. */
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
