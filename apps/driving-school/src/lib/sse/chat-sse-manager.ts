/**
 * Менеджер SSE подключений для чатов
 *
 * Управляет активными SSE подключениями и отправкой событий пользователям.
 * Включает автоматическую очистку мёртвых подписок (GC) и лимиты.
 */

// === Константы ===

/** Максимум подключений на одного пользователя */
const MAX_CLIENTS_PER_USER = 10

/** Интервал GC для очистки мёртвых подписок (30 секунд — memory leak fix) */
const GC_INTERVAL_MS = 30 * 1000

/** Тип колбэка для уведомлений об обновлениях */
type UpdateCallback = (userId: string, event: string, data: unknown) => void

class ChatSSEManager {
  private clients: Map<string, Set<ReadableStreamDefaultController>> = new Map()

  /** Колбэки для уведомлений об обновлениях (для unread-stream и т.п.) */
  private updateCallbacks: Map<string, UpdateCallback> = new Map()

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

    console.warn(`[Chat SSE] GC started, interval: ${GC_INTERVAL_MS / 1000}s`)
  }

  /**
   * Проверяет и удаляет мёртвые контроллеры
   */
  private cleanupDeadControllers() {
    let removed = 0

    this.clients.forEach((controllers, userId) => {
      controllers.forEach((controller) => {
        try {
          // Пробуем отправить ping для проверки соединения
          controller.enqueue(this.encoder.encode(': gc-ping\n\n'))
        } catch {
          // Контроллер мёртв — удаляем
          this.removeClient(userId, controller)
          removed++
        }
      })
    })

    if (removed > 0) {
      console.warn(`[Chat SSE] GC removed ${removed} dead controllers`)
    }
  }

  /**
   * Добавить SSE подключение для пользователя
   * @returns true если добавлено, false если достигнут лимит
   */
  addClient(userId: string, controller: ReadableStreamDefaultController): boolean {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }

    const userClients = this.clients.get(userId)

    if (!userClients) {
      return false
    }

    // Проверяем лимит подключений на пользователя
    if (userClients.size >= MAX_CLIENTS_PER_USER) {
      console.warn(`[Chat SSE] User ${userId} reached limit of ${MAX_CLIENTS_PER_USER} connections`)
      return false
    }

    userClients.add(controller)
    console.warn(`[Chat SSE] Client connected: ${userId}, total: ${this.getTotalClients()}`)
    return true
  }

  /**
   * Удалить SSE подключение
   */
  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const userClients = this.clients.get(userId)
    if (userClients) {
      userClients.delete(controller)
      if (userClients.size === 0) {
        this.clients.delete(userId)
      }
    }

    console.warn(`[Chat SSE] Client disconnected: ${userId}, total: ${this.getTotalClients()}`)
  }

  /**
   * Отправить событие конкретному пользователю
   */
  sendToUser(userId: string, event: string, data: unknown) {
    // Уведомляем подписчиков (unread-stream и т.п.)
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(userId, event, data)
      } catch (error) {
        console.error(`[Chat SSE] Update callback error:`, error)
      }
    })

    const userClients = this.clients.get(userId)
    if (!userClients || userClients.size === 0) {
      return
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    const encoded = this.encoder.encode(message)

    // Отправляем всем подключениям пользователя
    userClients.forEach((controller) => {
      try {
        controller.enqueue(encoded)
      } catch (error) {
        console.error(`[Chat SSE] Failed to send to ${userId}:`, error)
        // Удаляем неработающее подключение
        this.removeClient(userId, controller)
      }
    })
  }

  /**
   * Подписаться на уведомления об обновлениях
   * @returns id подписки для отписки
   */
  onUpdate(callback: UpdateCallback): string {
    const id = crypto.randomUUID()
    this.updateCallbacks.set(id, callback)
    return id
  }

  /**
   * Отписаться от уведомлений об обновлениях
   */
  offUpdate(id: string) {
    this.updateCallbacks.delete(id)
  }

  /**
   * Отправить событие нескольким пользователям
   */
  sendToUsers(userIds: string[], event: string, data: unknown) {
    userIds.forEach((userId) => {
      this.sendToUser(userId, event, data)
    })
  }

  /**
   * Получить количество активных подключений
   */
  getTotalClients(): number {
    let total = 0
    this.clients.forEach((controllers) => {
      total += controllers.size
    })
    return total
  }

  /**
   * Проверить, есть ли активные подключения у пользователя
   */
  hasClient(userId: string): boolean {
    const userClients = this.clients.get(userId)
    return !!userClients && userClients.size > 0
  }

  /**
   * Получить статистику подключений
   */
  getStats() {
    const userStats: Record<string, number> = {}
    this.clients.forEach((controllers, userId) => {
      userStats[userId] = controllers.size
    })

    return {
      totalUsers: this.clients.size,
      totalConnections: this.getTotalClients(),
      users: userStats,
    }
  }

  /**
   * Принудительная очистка (для тестов или shutdown)
   */
  forceCleanup() {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId)
      this.gcIntervalId = null
    }
    this.clients.clear()
    console.warn('[Chat SSE] Force cleanup completed')
  }
}

// MEMORY LEAK FIX: Кэширование через globalThis
// При hot reload в development создавался новый manager,
// но старый с его intervals не очищался
const globalForChatSSE = globalThis as unknown as {
  chatSSEManager: ChatSSEManager | undefined
}

export const chatSSEManager = globalForChatSSE.chatSSEManager ?? new ChatSSEManager()
globalForChatSSE.chatSSEManager = chatSSEManager
