import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * SSE endpoint для отслеживания статуса сброса пароля
 * Клиент подписывается и получает событие когда пароль сброшен (токен использован)
 */
export async function GET(request: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  // Проверяем существует ли токен сброса
  const resetToken = await prisma.verification.findFirst({
    where: { identifier: decodedEmail, type: 'PASSWORD_RESET' },
    orderBy: { expiresAt: 'desc' },
  })

  // Если токена нет - возможно уже сброшен или не запрашивался
  if (!resetToken) {
    const encoder = new TextEncoder()
    const data = encoder.encode(`data: ${JSON.stringify({ reset: true, token: null })}\n\n`)
    return new Response(data, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // Создаём SSE stream
  const encoder = new TextEncoder()
  let isActive = true

  // Храним ссылки на интервалы для очистки при abort
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let checkInterval: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  // Функция очистки всех ресурсов
  const cleanup = () => {
    if (!isActive) {
      return
    }
    isActive = false
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    if (checkInterval) {
      clearInterval(checkInterval)
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Отправляем heartbeat каждые 15 секунд
      heartbeatInterval = setInterval(() => {
        if (!isActive) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
          }
          return
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          cleanup()
        }
      }, 15000)

      // Проверяем статус токена каждые 2 секунды
      let openedEventSent = false
      checkInterval = setInterval(async () => {
        if (!isActive) {
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          return
        }

        try {
          // Проверяем, существует ли ещё токен
          const currentToken = await prisma.verification.findFirst({
            where: { identifier: decodedEmail, type: 'PASSWORD_RESET' },
            orderBy: { expiresAt: 'desc' },
          })

          // Если токен удалён — пароль был сброшен
          if (!currentToken) {
            const data = encoder.encode(`data: ${JSON.stringify({ reset: true })}\n\n`)
            controller.enqueue(data)

            // Закрываем соединение
            cleanup()
            try {
              controller.close()
            } catch {
              // Уже закрыт
            }
            return
          }

          // Проверяем, открыта ли страница сброса в другой вкладке
          if (!openedEventSent) {
            const openedMarker = await prisma.verification.findFirst({
              where: { identifier: `reset-opened:${decodedEmail}`, type: 'RESET_OPENED_MARKER' },
            })

            if (openedMarker) {
              const data = encoder.encode(`data: ${JSON.stringify({ opened: true })}\n\n`)
              controller.enqueue(data)
              openedEventSent = true
            }
          }
        } catch {
          // Игнорируем ошибки проверки
        }
      }, 2000)

      // Закрываем через 5 минут (уменьшено с 1 часа для экономии памяти)
      timeoutId = setTimeout(
        () => {
          cleanup()
          try {
            controller.close()
          } catch {
            // Уже закрыт
          }
        },
        5 * 60 * 1000
      )
    },
    cancel() {
      cleanup()
    },
  })

  // Немедленно очищаем ресурсы при disconnect клиента
  request.signal.addEventListener('abort', () => {
    cleanup()
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
