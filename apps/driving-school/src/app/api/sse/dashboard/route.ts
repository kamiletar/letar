/**
 * SSE API для real-time обновлений dashboard
 *
 * Отправляет обновления алертов и метрик в реальном времени.
 *
 * @module sse-dashboard-route
 */

import { getSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

import { getInstructorAlerts, getOwnerAlerts, getSchoolAdminAlerts } from '../../../dashboard/_actions/alerts.action'

export const dynamic = 'force-dynamic'

/**
 * Интервал обновления в миллисекундах (2 минуты)
 *
 * ⚠️ Dashboard alerts не требуют real-time обновлений (в отличие от чатов/уведомлений).
 * Увеличен с 30s до 2 минут для снижения нагрузки на сервер и БД.
 */
const UPDATE_INTERVAL = 2 * 60 * 1000 // 2 минуты

/**
 * SSE endpoint для dashboard
 *
 * Клиент подключается и получает обновления каждые 30 секунд.
 *
 * Формат событий:
 * - `alerts` — обновлённый список алертов
 * - `heartbeat` — проверка соединения
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let intervalId: NodeJS.Timeout | null = null
      let isActive = true

      // Функция очистки
      const cleanup = () => {
        if (!isActive) {
          return
        }
        isActive = false
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }

      // MEMORY LEAK FIX: Используем abort signal вместо cancel()
      // cancel() может не вызываться при некоторых типах отключений
      request.signal.addEventListener('abort', () => {
        cleanup()
        try {
          controller.close()
        } catch {
          // Игнорируем ошибки при закрытии
        }
      })

      // Отправка начального heartbeat
      controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ connected: true })}\n\n`))

      // Функция отправки обновлений
      const sendUpdate = async () => {
        if (!isActive) {
          return
        }
        try {
          // Получаем алерты в зависимости от роли
          const [instructorAlerts, schoolAdminAlerts, ownerAlerts] = await Promise.all([
            getInstructorAlerts(),
            getSchoolAdminAlerts(),
            session.user.roles?.includes('OWNER') ? getOwnerAlerts() : Promise.resolve({ alerts: [], totalCount: 0 }),
          ])

          // Объединяем все алерты
          const allAlerts = [...instructorAlerts.alerts, ...schoolAdminAlerts.alerts, ...ownerAlerts.alerts]

          const data = {
            alerts: allAlerts,
            totalCount: allAlerts.reduce((sum, a) => sum + a.count, 0),
            timestamp: new Date().toISOString(),
          }

          controller.enqueue(encoder.encode(`event: alerts\ndata: ${JSON.stringify(data)}\n\n`))
        } catch (error) {
          console.error('[SSE] Error sending update:', error)
          // Отправляем heartbeat при ошибке
          try {
            controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ error: true })}\n\n`))
          } catch {
            cleanup()
          }
        }
      }

      // Первое обновление сразу
      await sendUpdate()

      // Периодические обновления
      intervalId = setInterval(sendUpdate, UPDATE_INTERVAL)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Для nginx
    },
  })
}
