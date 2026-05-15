import { schema } from '@/generated/schema'
import { getEnhancedPrisma } from '@/lib/db'
import { RPCApiHandler } from '@zenstackhq/server/api'
import { NextRequestHandler } from '@zenstackhq/server/next'

/**
 * API route для ZenStack v3 ORM + TanStack Query
 *
 * Обрабатывает все CRUD операции для моделей через единый эндпоинт.
 * Использует ZenStack ORM (ZenStackClient + PolicyPlugin) с access control из schema.zmodel.
 *
 * Для песочницы — без аутентификации (@@allow('all', true))
 */
async function getClient() {
  return getEnhancedPrisma()
}

const handler = NextRequestHandler({
  getClient,
  useAppDir: true,
  apiHandler: new RPCApiHandler({ schema }),
})

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT }
