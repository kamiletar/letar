import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * SSE endpoint для отслеживания статуса верификации email
 * Клиент подписывается и получает событие когда email верифицирован
 */
export async function GET(request: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  // Проверяем существует ли пользователь
  const user = await prisma.user.findUnique({
    where: { email: decodedEmail },
    select: { id: true, emailVerified: true },
  })

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  // Если уже верифицирован - сразу отдаём событие и закрываем
  if (user.emailVerified) {
    const encoder = new TextEncoder()
    const data = encoder.encode(`data: ${JSON.stringify({ verified: true, token: null })}\n\n`)
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

      // Проверяем статус верификации каждые 2 секунды
      checkInterval = setInterval(async () => {
        if (!isActive) {
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          return
        }

        try {
          const currentUser = await prisma.user.findUnique({
            where: { email: decodedEmail },
            select: { emailVerified: true },
          })

          if (currentUser?.emailVerified) {
            // Email верифицирован! Отправляем событие
            // Находим токен для авто-логина
            const verification = await prisma.verification.findFirst({
              where: { identifier: decodedEmail, type: 'AUTO_LOGIN' },
              orderBy: { expiresAt: 'desc' },
            })

            const data = encoder.encode(
              `data: ${JSON.stringify({
                verified: true,
                token: verification?.value || null,
              })}\n\n`
            )
            controller.enqueue(data)

            // Закрываем соединение
            cleanup()
            try {
              controller.close()
            } catch {
              // Уже закрыт
            }
          }
        } catch {
          // Игнорируем ошибки проверки
        }
      }, 2000)

      // Закрываем через 5 минут (уменьшено с 10 для экономии памяти)
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
