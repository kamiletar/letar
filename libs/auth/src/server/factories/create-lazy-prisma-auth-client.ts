import { PrismaPg } from '@prisma/adapter-pg'

export interface CreateLazyPrismaAuthClientOptions {
  /** Строка подключения. По умолчанию — `process.env.DATABASE_URL` */
  connectionString?: string
}

/**
 * Ленивая обёртка нативного `PrismaClient` для better-auth `prismaAdapter()`.
 *
 * Better Auth требует нативный Prisma-клиент — ZenStack v3 ORM (`db.ts` приложения) использует
 * Kysely под капотом и с `prismaAdapter()` несовместим (падает 500 без логов на каждом
 * `/api/auth/*`). Поэтому у приложения два клиента: ZenStack ORM для остального кода и этот,
 * только для better-auth.
 *
 * Prisma 7 требует driver adapter — `url` в `schema.prisma` больше не поддерживается. Реальная
 * инициализация клиента откладывается до первого обращения через `Proxy`: Turbopack выполняет
 * top-level код модуля при сборке, и немедленный `new PrismaClientCtor(...)` там падает с
 * «Cannot read properties of undefined».
 *
 * `PrismaClientCtor` передаётся приложением, т.к. кодогенерация ZenStack кладёт класс в
 * `@/generated/prisma/client` каждого приложения отдельно — унифицировать тип нельзя, только
 * саму обвязку.
 *
 * @example
 * ```typescript
 * // apps/my-app/src/lib/prisma.ts
 * import { PrismaClient } from '@/generated/prisma/client'
 * import { createLazyPrismaAuthClient } from '@letar/auth/server'
 *
 * export const prismaAuth = createLazyPrismaAuthClient(PrismaClient)
 * ```
 */
export function createLazyPrismaAuthClient<T extends object>(
  PrismaClientCtor: new(options: { adapter: PrismaPg }) => T,
  options: CreateLazyPrismaAuthClientOptions = {},
): T {
  let instance: T | null = null

  function getInstance(): T {
    if (!instance) {
      const adapter = new PrismaPg({
        connectionString: options.connectionString ?? process.env['DATABASE_URL']!,
      })
      instance = new PrismaClientCtor({ adapter })
    }
    return instance
  }

  return new Proxy({} as T, {
    get(_target, prop) {
      return (getInstance() as unknown as Record<string | symbol, unknown>)[prop]
    },
  })
}
