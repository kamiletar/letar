/**
 * Fallback IPFS прокси
 *
 * Основной доступ к IPFS — через nginx gateway напрямую (getIpfsUrl).
 * Этот роут — запасной вариант на случай проблем с gateway.
 *
 * GET /api/ipfs/[cid] — проксирует запросы к IPFS gateway
 * Поддержка Range requests для seek в видео.
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getIpfsUrl } from '@/lib/ipfs'

type Params = Promise<{ path: string[] }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  const cid = path.join('/')

  if (!cid) {
    return NextResponse.json({ error: 'CID обязателен' }, { status: 400 })
  }

  const url = getIpfsUrl(cid)

  // Проксируем Range header для seek в видео
  const headers: HeadersInit = {}
  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    headers['Range'] = rangeHeader
  }

  try {
    const response = await fetch(url, {
      headers,
      // IPFS gateway может долго качать блоки через relay — даём 2 минуты
      signal: AbortSignal.timeout(120_000),
    })

    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: `Gateway error: ${response.status}` }, { status: response.status })
    }

    // Копируем важные заголовки из gateway
    const responseHeaders = new Headers()
    const copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges']
    for (const header of copyHeaders) {
      const value = response.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    }

    // CID иммутабельный — кэшируем агрессивно
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable')
    responseHeaders.set('Access-Control-Allow-Origin', '*')

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error(`[ipfs-proxy] Ошибка для CID ${cid}:`, error)
    return NextResponse.json({ error: 'IPFS gateway недоступен' }, { status: 502 })
  }
}

/** HEAD запрос для проверки размера (нужен плееру) */
export async function HEAD(_request: NextRequest, { params }: { params: Params }) {
  const { path } = await params
  const cid = path.join('/')
  const url = getIpfsUrl(cid)

  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(120_000) })

    const headers = new Headers()
    headers.set('Content-Length', response.headers.get('content-length') || '0')
    headers.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new NextResponse(null, { status: 200, headers })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
