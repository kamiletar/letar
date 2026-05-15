import { getSession } from '@/lib/auth'
import { realtimeSSEManager } from '@/lib/sse/realtime-sse-manager'
import type { NextRequest } from 'next/server'

/**
 * GET /api/realtime
 *
 * SSE endpoint для real-time обновлений dashboard
 *
 * Query params:
 * - channels: comma-separated list (e.g., "dashboard,school:abc123")
 *
 * Примеры использования:
 * - /api/realtime?channels=dashboard — общие обновления
 * - /api/realtime?channels=school:abc123 — обновления конкретной школы
 * - /api/realtime?channels=dashboard,school:abc123 — несколько каналов
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    // Парсим каналы из query params
    const channelsParam = request.nextUrl.searchParams.get('channels')
    const channels = channelsParam
      ? channelsParam
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : ['dashboard'] // По умолчанию подписываемся на dashboard

    // Добавляем персональный канал пользователя
    channels.push(`user:${userId}`)

    // Создаем ReadableStream для SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        // Подписываемся на все каналы
        channels.forEach((channel) => {
          realtimeSSEManager.subscribe(channel, controller)
        })

        // Отправляем начальное событие подключения
        const connectMessage = `event: connected\ndata: ${JSON.stringify({
          channels,
          timestamp: Date.now(),
        })}\n\n`
        controller.enqueue(encoder.encode(connectMessage))

        // Keep-alive каждые 30 секунд
        const keepAliveInterval = setInterval(() => {
          try {
            const pingMessage = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`
            controller.enqueue(encoder.encode(pingMessage))
          } catch {
            clearInterval(keepAliveInterval)
          }
        }, 30000)

        // Cleanup при отключении
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAliveInterval)
          realtimeSSEManager.unsubscribe(controller)
          try {
            controller.close()
          } catch {
            // Игнорируем ошибки при закрытии
          }
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Для Nginx
      },
    })
  } catch (error) {
    console.error('[Realtime API] Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * GET /api/realtime/stats
 *
 * Статистика подключений (только для OWNER)
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Проверяем роль OWNER
    if (!session.user.roles?.includes('OWNER')) {
      return new Response('Forbidden', { status: 403 })
    }

    const stats = realtimeSSEManager.getStats()

    return Response.json(stats)
  } catch (error) {
    console.error('[Realtime API] Stats error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
