import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * API роут для ZenStack CRUD операций (v3 API)
 * Путь: /api/model/[...path]
 *
 * Lazy-load handler для обхода проблем с Turbopack при сборке.
 * Модули загружаются только в runtime.
 */

// Используем dynamic route config для отключения prerendering
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

// Ленивая загрузка handler
let handlerPromise: Promise<(req: NextRequest, ctx: Context) => Promise<Response>> | null = null

async function getHandler() {
  if (handlerPromise) {
    return handlerPromise
  }

  handlerPromise = (async () => {
    // Ленивый импорт — только в runtime
    const { RPCApiHandler } = await import('@zenstackhq/server/api')
    const { NextRequestHandler } = await import('@zenstackhq/server/next')
    const { getOrmClient, schema } = await import('@/lib/db-orm')

    return NextRequestHandler({
      apiHandler: new RPCApiHandler({ schema }),
      getClient: async () => await getOrmClient(),
      useAppDir: true,
    })
  })()

  return handlerPromise
}

async function handleRequest(req: NextRequest, ctx: Context) {
  try {
    const handler = await getHandler()
    return handler(req, ctx)
  } catch (error) {
    console.error('[API model] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export {
  handleRequest as DELETE,
  handleRequest as GET,
  handleRequest as PATCH,
  handleRequest as POST,
  handleRequest as PUT,
}
