import { makeRouteHandler } from '@keystatic/next/route-handler'
import config from '../../../../../keystatic.config'

// force-dynamic: route handler зависит от env-переменных Keystatic,
// которые доступны только на проде — не рендерить при build
export const dynamic = 'force-dynamic'

const baseHandler = makeRouteHandler({ config })

/**
 * В Docker standalone за reverse proxy Next.js строит req.url с внутренним хостом (0.0.0.0:3005).
 * Keystatic берёт redirect_uri из req.url — подменяем на публичный URL.
 */
function fixRequestUrl(request: Request): Request {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!publicUrl) {
    return request
  }

  const url = new URL(request.url)
  const publicOrigin = new URL(publicUrl)
  url.protocol = publicOrigin.protocol
  url.hostname = publicOrigin.hostname
  url.port = '' // Убираем внутренний порт 3005

  return new Request(url.toString(), request)
}

export async function GET(request: Request) {
  return baseHandler.GET(fixRequestUrl(request))
}

export async function POST(request: Request) {
  return baseHandler.POST(fixRequestUrl(request))
}
