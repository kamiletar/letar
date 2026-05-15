import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { chatSSEManager } from '@/lib/sse/chat-sse-manager'
import type { NextRequest } from 'next/server'

/**
 * GET /api/chats/unread-stream
 * SSE endpoint для real-time обновления счетчика непрочитанных сообщений
 *
 * Рефакторинг: убрана модификация controller.enqueue
 * Теперь используется чистый callback механизм через chatSSEManager.onUpdate()
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id
    const encoder = new TextEncoder()

    /**
     * Функция для подсчета непрочитанных сообщений
     *
     * ⚠️ Оптимизация N+1 query:
     * Вместо загрузки всех messages в память и фильтрации на стороне приложения,
     * используем single SQL query с JOIN для подсчета непрочитанных сообщений.
     *
     * Было: O(N) queries + O(M) memory (N чатов, M сообщений)
     * Стало: O(1) query + O(1) memory
     */
    const getUnreadCount = async (): Promise<number> => {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT CAST(COUNT(DISTINCT m.id) AS INTEGER) as count
        FROM "ChatMessage" m
        INNER JOIN "ChatParticipant" cp ON m."chatId" = cp."chatId"
        WHERE cp."userId" = ${userId}
          AND cp."leftAt" IS NULL
          AND m."authorId" != ${userId}
          AND (
            cp."lastReadAt" IS NULL
            OR m."createdAt" > cp."lastReadAt"
          )
      `

      return Number(result[0]?.count ?? 0)
    }

    // Создаем ReadableStream для SSE
    const stream = new ReadableStream({
      async start(controller) {
        let isActive = true
        let updateCallbackId: string | null = null

        // Функция для отправки счётчика
        const sendCount = async () => {
          if (!isActive) {
            return
          }
          try {
            const count = await getUnreadCount()
            const message = `event: unread-count\ndata: ${JSON.stringify({ count })}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch (err) {
            console.error('[SSE] Failed to send unread count:', err)
          }
        }

        // Подписываемся на уведомления об обновлениях чатов
        // При любом событии для этого пользователя — пересчитываем счётчик
        updateCallbackId = chatSSEManager.onUpdate((targetUserId, event) => {
          if (targetUserId === userId && event === 'chat-update') {
            sendCount()
          }
        })

        // Отправляем начальное значение счетчика
        await sendCount()

        // Отправляем keep-alive каждые 30 секунд
        const keepAliveInterval = setInterval(() => {
          if (!isActive) {
            clearInterval(keepAliveInterval)
            return
          }
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'))
          } catch (error) {
            console.error('[SSE] Keep-alive failed:', error)
            clearInterval(keepAliveInterval)
            isActive = false
          }
        }, 30000)

        // Функция очистки
        const cleanup = () => {
          if (!isActive) {
            return
          }
          isActive = false
          clearInterval(keepAliveInterval)
          if (updateCallbackId) {
            chatSSEManager.offUpdate(updateCallbackId)
          }
        }

        // Очистка при закрытии соединения
        request.signal.addEventListener('abort', () => {
          cleanup()
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
    console.error('Error in SSE endpoint:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
