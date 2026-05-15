import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Единый SSE поток для всех метрик Dashboard
 * Объединяет metrics и containers в один стрим для снижения нагрузки на память
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера для запроса
 *
 * Интервалы:
 * - Системные метрики (CPU, RAM, Disk): каждые 5 сек
 * - Docker контейнеры: каждые 15 сек (реже, т.к. тяжёлые запросы)
 */
export async function GET(req: NextRequest) {
  const serverId = req.nextUrl.searchParams.get('serverId')

  const encoder = new TextEncoder()
  let isClosed = false
  let metricsInterval: NodeJS.Timeout | null = null
  let containersInterval: NodeJS.Timeout | null = null

  // Получаем клиент для сервера до создания стрима
  let client: Awaited<ReturnType<typeof getClientByServerId>>['client']
  let server: Awaited<ReturnType<typeof getClientByServerId>>['server']

  try {
    const result = await getClientByServerId(serverId)
    client = result.client
    server = result.server
  } catch {
    // Если не удалось получить клиент, возвращаем ошибку
    return new Response(JSON.stringify({ error: 'Failed to connect to server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
          // Контроллер уже закрыт
          isClosed = true
        }
      }

      // Очистка при закрытии соединения
      const cleanup = () => {
        isClosed = true
        if (metricsInterval) {
          clearInterval(metricsInterval)
          metricsInterval = null
        }
        if (containersInterval) {
          clearInterval(containersInterval)
          containersInterval = null
        }
        try {
          controller.close()
        } catch {
          // Уже закрыт
        }
      }

      req.signal.addEventListener('abort', cleanup)

      // Функция получения системных метрик
      const fetchMetrics = async () => {
        if (isClosed) {
          return
        }
        try {
          // Последовательно вместо Promise.all для снижения пиковой нагрузки
          const cpu = await client.getCPUInfo()
          const memory = await client.getMemoryInfo()
          const disk = await client.getDiskInfo()

          // Обновляем lastSeen для удалённого сервера
          if (server) {
            updateServerLastSeen(server.id)
          }

          sendEvent('metrics', {
            cpu,
            memory,
            disk,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          if (!isClosed) {
            console.error('[Unified SSE] Error fetching metrics:', error)
            sendEvent('error', { type: 'metrics', message: 'Failed to fetch metrics' })
          }
        }
      }

      // Функция получения данных Docker (более тяжёлая операция)
      const fetchContainers = async () => {
        if (isClosed) {
          return
        }
        try {
          // Используем клиент для получения данных
          const [containers, memoryStats] = await Promise.all([
            client.getContainers(false), // Только запущенные
            client.getAllContainersMemory(),
          ])

          sendEvent('containers', {
            containers,
            memory: memoryStats,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          if (!isClosed) {
            console.error('[Unified SSE] Error fetching containers:', error)
            sendEvent('error', { type: 'containers', message: 'Failed to fetch containers' })
          }
        }
      }

      // Отправляем начальные данные сразу
      if (!isClosed) {
        await fetchMetrics()
        // Небольшая пауза между запросами
        await new Promise((resolve) => setTimeout(resolve, 100))
        await fetchContainers()
      }

      // Запускаем интервалы с разной частотой
      metricsInterval = setInterval(fetchMetrics, 5000) // Метрики каждые 5 сек
      containersInterval = setInterval(fetchContainers, 15000) // Docker каждые 15 сек
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Запрет буферизации для nginx
      'X-Accel-Buffering': 'no',
    },
  })
}
