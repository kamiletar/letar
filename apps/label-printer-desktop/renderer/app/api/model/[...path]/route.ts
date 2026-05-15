import { NextRequest, NextResponse } from 'next/server'

/**
 * API роут для ZenStack CRUD операций (v3 API)
 * Путь: /api/model/[...path]
 *
 * Lazy-load handler для обхода проблем с Turbopack при сборке.
 * Модули загружаются только в runtime.
 */

// Отключаем prerendering
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
    const { path: _path } = await ctx.params
    const url = req.nextUrl.pathname

    // Логируем тело запроса для мутаций
    let bodyText: string | null = null
    if (req.method !== 'GET') {
      bodyText = await req.text()
      console.warn(`[API model] ${req.method} ${url} body:`, bodyText)
      // Пересоздаём request с тем же телом (text() уже прочитал поток)
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: bodyText,
      })
    } else {
      console.warn(`[API model] ${req.method} ${url}`)
    }

    const handler = await getHandler()
    const response = await handler(req, ctx)

    // Логируем ответ при ошибках
    if (response.status >= 400) {
      const respBody = await response.text()
      console.error(`[API model] ${req.method} ${url} → ${response.status}:`, respBody)
      // Пересоздаём response (text() уже прочитал поток)
      return new Response(respBody, {
        status: response.status,
        headers: response.headers,
      })
    }

    return response
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
