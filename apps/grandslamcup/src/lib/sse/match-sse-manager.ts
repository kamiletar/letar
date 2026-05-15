/**
 * SSE менеджер для live scoring матчей
 *
 * Адаптация из driving-school/src/lib/sse/realtime-sse-manager.ts.
 * Поддерживает каналы match:{id}, типизированные события, GC мёртвых подключений.
 *
 * @module match-sse-manager
 */

// === Типы событий ===

export type MatchEventType =
  | 'judge:connected' // Судья подключился
  | 'judge:disconnected' // Судья отключился
  | 'vote:received' // Получен голос судьи
  | 'vote:complete' // Все 5 судей проголосовали за измерение
  | 'phase:changed' // Фаза голосования изменилась
  | 'player:sent' // Тренер отправил поэта
  | 'score:calculated' // Баллы подсчитаны
  | 'match:started' // Матч начался
  | 'match:finished' // Матч завершён
  | 'timer:started' // Таймер выступления запущен
  | 'timer:stopped' // Таймер остановлен
  | 'timer:reset' // Таймер сброшен
  | 'voting:cancelled' // Голосование отменено ведущим
  | 'card:issued' // Выдана карточка (жёлтая/красная)
  | 'audience:voted' // Зрительский голос (для проектора)
  | 'coach:signal' // Сигнал от тренера (запрос паузы)
  | 'vote:timeout' // Таймаут голосования судьи
  | 'lineup:updated' // Счётовод заявил состав команды
  | 'coin:flipped' // Жеребьёвка проведена
  | 'victory-poem:set' // Победное стихотворение выбрано
  | 'ping' // Heartbeat

export interface MatchEventData {
  type: MatchEventType
  payload: unknown
  timestamp: number
}

// === Константы ===

/** Максимум подписок на один канал */
const MAX_CLIENTS_PER_CHANNEL = 50

/** Интервал GC для очистки мёртвых подписок */
const GC_INTERVAL_MS = 30 * 1000

/** Интервал heartbeat */
const HEARTBEAT_INTERVAL_MS = 15 * 1000

// === SSE Manager ===

class MatchSSEManager {
  /** Клиенты по каналам: channel -> Set<controller> */
  private channels: Map<string, Set<ReadableStreamDefaultController>> = new Map()

  /** Маппинг controller -> channels для cleanup */
  private controllerChannels: Map<ReadableStreamDefaultController, Set<string>> = new Map()

  /** Переиспользуемый TextEncoder */
  private readonly encoder = new TextEncoder()

  /** ID интервала GC */
  private gcIntervalId: ReturnType<typeof setInterval> | null = null

  /** ID интервала heartbeat */
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.startGC()
    this.startHeartbeat()
  }

  /** Запускает GC мёртвых подписок */
  private startGC() {
    if (this.gcIntervalId) return
    this.gcIntervalId = setInterval(() => this.cleanupDeadControllers(), GC_INTERVAL_MS)
  }

  /** Запускает heartbeat для всех каналов */
  private startHeartbeat() {
    if (this.heartbeatIntervalId) return
    this.heartbeatIntervalId = setInterval(() => {
      this.channels.forEach((_, channel) => {
        this.broadcast(channel, { type: 'ping', payload: null, timestamp: Date.now() })
      })
    }, HEARTBEAT_INTERVAL_MS)
  }

  /** Очищает мёртвые контроллеры */
  private cleanupDeadControllers() {
    let removed = 0
    this.controllerChannels.forEach((_, controller) => {
      try {
        controller.enqueue(this.encoder.encode(': gc-ping\n\n'))
      } catch {
        this.unsubscribe(controller)
        removed++
      }
    })
    if (removed > 0) {
      // eslint-disable-next-line no-console -- диагностика GC
      console.log(`[Match SSE] GC: удалено ${removed} мёртвых подключений`)
    }
  }

  /** Подписать клиента на канал */
  subscribe(channel: string, controller: ReadableStreamDefaultController): boolean {
    const existingClients = this.channels.get(channel)
    if (existingClients && existingClients.size >= MAX_CLIENTS_PER_CHANNEL) {
      console.error(`[Match SSE] Канал ${channel}: лимит ${MAX_CLIENTS_PER_CHANNEL} подключений`)
      return false
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(controller)

    if (!this.controllerChannels.has(controller)) {
      this.controllerChannels.set(controller, new Set())
    }
    this.controllerChannels.get(controller)!.add(channel)

    return true
  }

  /** Отписать клиента от всех каналов */
  unsubscribe(controller: ReadableStreamDefaultController) {
    const channels = this.controllerChannels.get(controller)
    if (!channels) return

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
  }

  /** Отправить событие всем подписчикам канала */
  broadcast(channel: string, event: MatchEventData) {
    const clients = this.channels.get(channel)
    if (!clients || clients.size === 0) return

    const data = this.encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)

    const dead: ReadableStreamDefaultController[] = []
    clients.forEach((controller) => {
      try {
        controller.enqueue(data)
      } catch {
        dead.push(controller)
      }
    })

    // Удаляем мёртвые подключения
    dead.forEach((c) => this.unsubscribe(c))
  }

  /** Количество подключений в канале */
  getClientCount(channel: string): number {
    return this.channels.get(channel)?.size ?? 0
  }
}

// === Singleton через globalThis ===

const globalForSSE = globalThis as unknown as {
  matchSSEManager?: MatchSSEManager
}

/** Получить SSE менеджер (singleton) */
export function getMatchSSEManager(): MatchSSEManager {
  if (!globalForSSE.matchSSEManager) {
    globalForSSE.matchSSEManager = new MatchSSEManager()
  }
  return globalForSSE.matchSSEManager
}
