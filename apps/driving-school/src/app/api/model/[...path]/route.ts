import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { schema } from '@letar/driving-school-db/schema'
import { RPCApiHandler } from '@zenstackhq/server/api'
import { NextRequestHandler } from '@zenstackhq/server/next'

/**
 * API route для ZenStack v3 ORM + TanStack Query
 *
 * Обрабатывает все CRUD операции для моделей через единый эндпоинт.
 * Использует ZenStack ORM (ZenStackClient + PolicyPlugin) с access control из schema.zmodel.
 *
 * ZenStack v3 ORM API:
 * - `getClient` — возвращает ZenStackClient с PolicyPlugin
 * - `apiHandler` — RPCApiHandler для TanStack Query хуков
 */
async function getClient() {
  const session = await getSession()
  return getEnhancedPrisma(session?.user)
}

const handler = NextRequestHandler({
  getClient,
  useAppDir: true,
  apiHandler: new RPCApiHandler({ schema }),
})

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT }
