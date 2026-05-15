/**
 * Универсальный менеджер SSE подключений для real-time обновлений
 *
 * Поддерживает:
 * - Подписку на каналы (dashboard, school:{id}, user:{id})
 * - Типизированные события
 * - Broadcast по каналам
 * - Автоматическую очистку мёртвых подписок (GC)
 * - Лимит подписок на канал
 *
 * @module realtime-sse-manager
 */

// === Типы событий ===

export type RealtimeEventType =
  | 'lesson:created'
  | 'lesson:updated'
  | 'lesson:cancelled'
  | 'payment:created'
  | 'payment:updated'
  | 'student:created'
  | 'student:updated'
  | 'instructor:updated'
  | 'schedule:changed'
  | 'alert:new'
  | 'stats:updated'
  | 'ping'

export interface RealtimeEventData {
  type: RealtimeEventType
  payload: unknown
  timestamp: number
  channel?: string
}

// === Константы ===

/** Максимум подписок на один канал */
const MAX_CLIENTS_PER_CHANNEL = 1000

/** Интервал GC для очистки мёртвых подписок (30 секунд — memory leak fix) */
const GC_INTERVAL_MS = 30 * 1000

// === SSE Manager ===

class RealtimeSSEManager {
  /** Клиенты по каналам: channel -> Set<controller> */
  private channels: Map<string, Set<ReadableStreamDefaultController>> = new Map()

  /** Маппинг controller -> channels для cleanup */
  private controllerChannels: Map<ReadableStreamDefaultController, Set<string>> = new Map()

  /** Переиспользуемый TextEncoder (экономия памяти) */
  private readonly encoder = new TextEncoder()

  /** ID интервала GC */
  private gcIntervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Запускаем периодическую очистку мёртвых подписок
    this.startGC()
  }

  /**
   * Запускает периодическую очистку мёртвых подписок
   */
  private startGC() {
    if (this.gcIntervalId) {
      return
    }

    this.gcIntervalId = setInterval(() => {
      this.cleanupDeadControllers()
    }, GC_INTERVAL_MS)

    // eslint-disable-next-line no-console -- диагностика GC
    console.log(`[Realtime SSE] GC started, interval: ${GC_INTERVAL_MS / 1000}s`)
  }

  /**
   * Проверяет и удаляет мёртвые контроллеры
   */
  private cleanupDeadControllers() {
    let removed = 0

    this.controllerChannels.forEach((channels, controller) => {
      try {
        // Пробуем отправить ping для проверки соединения
        controller.enqueue(this.encoder.encode(': gc-ping\n\n'))
      } catch {
        // Контроллер мёртв — удаляем
        this.unsubscribe(controller)
        removed++
      }
    })

    if (removed > 0) {
      // eslint-disable-next-line no-console -- диагностика GC
      console.log(`[Realtime SSE] GC removed ${removed} dead controllers`)
    }
  }

  /**
   * Подписать клиента на канал
   */
  subscribe(channel: string, controller: ReadableStreamDefaultController): boolean {
    // Проверяем лимит подписок на канал
    const existingClients = this.channels.get(channel)
    if (existingClients && existingClients.size >= MAX_CLIENTS_PER_CHANNEL) {
      console.error(`[Realtime SSE] Channel ${channel} reached limit of ${MAX_CLIENTS_PER_CHANNEL} clients`)
      return false
    }

    // Добавляем в канал
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }

    this.channels.get(channel)!.add(controller)

    // Отслеживаем каналы контроллера
    if (!this.controllerChannels.has(controller)) {
      this.controllerChannels.set(controller, new Set())
    }

    this.controllerChannels.get(controller)!.add(channel)

    // eslint-disable-next-line no-console -- диагностика SSE подключений
    console.log(`[Realtime SSE] Subscribed to ${channel}, clients: ${this.channels.get(channel)!.size}`)
    return true
  }

  /**
   * Отписать клиента от всех каналов
   */
  unsubscribe(controller: ReadableStreamDefaultController) {
    const channels = this.controllerChannels.get(controller)
    if (!channels) {
      return
    }

    channels.forEach((channel) => {
      const channelClients = this.channels.get(channel)
      if (channelClients) {
        channelClients.delete(controller)
        if (channelClients.size === 0) {
          this.channels.delete(channel)
        }
      }
    })

    this.controllerChannels.delete(controller)
    // eslint-disable-next-line no-console -- диагностика SSE подключений
    console.log(`[Realtime SSE] Client unsubscribed, total channels: ${this.channels.size}`)
  }

  /**
   * Отправить событие в канал
   */
  broadcast(channel: string, type: RealtimeEventType, payload: unknown) {
    const clients = this.channels.get(channel)
    if (!clients || clients.size === 0) {
      return
    }

    const event: RealtimeEventData = {
      type,
      payload,
      timestamp: Date.now(),
      channel,
    }

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`
    const encoded = this.encoder.encode(message)

    let sent = 0
    clients.forEach((controller) => {
      try {
        controller.enqueue(encoded)
        sent++
      } catch (error) {
        console.error(`[Realtime SSE] Failed to send to channel ${channel}:`, error)
        this.unsubscribe(controller)
      }
    })

    // eslint-disable-next-line no-console -- диагностика SSE broadcast
    console.log(`[Realtime SSE] Broadcast ${type} to ${channel}: ${sent}/${clients.size} clients`)
  }

  /**
   * Отправить событие во все каналы, начинающиеся с префикса
   */
  broadcastToPrefix(prefix: string, type: RealtimeEventType, payload: unknown) {
    this.channels.forEach((_, channel) => {
      if (channel.startsWith(prefix)) {
        this.broadcast(channel, type, payload)
      }
    })
  }

  /**
   * Отправить глобальное событие всем клиентам
   */
  broadcastGlobal(type: RealtimeEventType, payload: unknown) {
    const allControllers = new Set<ReadableStreamDefaultController>()
    this.channels.forEach((clients) => {
      clients.forEach((c) => allControllers.add(c))
    })

    const event: RealtimeEventData = {
      type,
      payload,
      timestamp: Date.now(),
    }

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`
    const encoded = this.encoder.encode(message)

    allControllers.forEach((controller) => {
      try {
        controller.enqueue(encoded)
      } catch {
        this.unsubscribe(controller)
      }
    })
  }

  /**
   * Статистика подключений
   */
  getStats() {
    const channelStats: Record<string, number> = {}
    this.channels.forEach((clients, channel) => {
      channelStats[channel] = clients.size
    })

    return {
      totalChannels: this.channels.size,
      totalControllers: this.controllerChannels.size,
      channels: channelStats,
    }
  }

  /**
   * Получить общее количество активных контроллеров
   */
  getTotalControllers(): number {
    return this.controllerChannels.size
  }

  /**
   * Принудительная очистка (для тестов или shutdown)
   */
  forceCleanup() {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId)
      this.gcIntervalId = null
    }
    this.channels.clear()
    this.controllerChannels.clear()
    // eslint-disable-next-line no-console -- диагностика очистки
    console.log('[Realtime SSE] Force cleanup completed')
  }
}

// MEMORY LEAK FIX: Кэширование через globalThis
// При hot reload в development создавался новый manager,
// но старый с его intervals не очищался
const globalForSSE = globalThis as unknown as {
  realtimeSSEManager: RealtimeSSEManager | undefined
}

export const realtimeSSEManager = globalForSSE.realtimeSSEManager ?? new RealtimeSSEManager()
globalForSSE.realtimeSSEManager = realtimeSSEManager

// === Хелперы для конкретных случаев ===

/**
 * Отправить обновление статистики школы
 */
export function broadcastSchoolStats(schoolId: string, stats: unknown) {
  realtimeSSEManager.broadcast(`school:${schoolId}`, 'stats:updated', stats)
}

/**
 * Отправить новый алерт
 */
export function broadcastAlert(schoolId: string, alert: unknown) {
  realtimeSSEManager.broadcast(`school:${schoolId}`, 'alert:new', alert)
}

/**
 * Отправить обновление занятия
 */
export function broadcastLessonUpdate(schoolId: string, lessonId: string, action: 'created' | 'updated' | 'cancelled') {
  realtimeSSEManager.broadcast(`school:${schoolId}`, `lesson:${action}`, { lessonId })
}
