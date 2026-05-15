import { getLocalClient } from '@/lib/server-client'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/stream/deploy
 * SSE-поток статуса деплоя через dashboard-agent
 * Логи берутся из output[] в ответе getDeployStatus()
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (isClosed) {
          return
        }
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch {
          isClosed = true
        }
      }

      let lastOutputLength = 0

      req.signal.addEventListener('abort', () => {
        isClosed = true
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      const fetchAndSend = async (sendAll = false) => {
        if (isClosed) {
          return
        }
        try {
          const client = getLocalClient()
          const status = await client.getDeployStatus!()

          // Отправляем только новые строки логов
          const allOutput = status.output ?? []
          const newLogs = sendAll ? allOutput : allOutput.slice(lastOutputLength)
          lastOutputLength = allOutput.length

          sendEvent('deploy', {
            status,
            logs: newLogs,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          if (!isClosed) {
            console.error('[SSE] Error fetching deploy status:', error)
            sendEvent('error', { message: 'Failed to fetch deploy status' })
          }
        }
      }

      // Отправляем начальные данные сразу
      await fetchAndSend(true)

      // Далее каждые 2 секунды — только новые строки
      const interval = setInterval(() => fetchAndSend(false), 2000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
