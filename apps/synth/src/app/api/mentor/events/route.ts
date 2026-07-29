import { subscribeMentorEvents } from '@/lib/mentor/event-bus'
import { trackClientConnected, trackClientDisconnected } from '@/lib/mentor/state'

// SSE обязан быть динамическим — иначе Next.js попытается статически закэшировать поток
export const dynamic = 'force-dynamic'

export function GET() {
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      trackClientConnected()
      controller.enqueue(encoder.encode(': connected\n\n'))
      unsubscribe = subscribeMentorEvents((event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      })
    },
    cancel() {
      unsubscribe?.()
      trackClientDisconnected()
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
