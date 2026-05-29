/**
 * RegenerationState — singleton хранилище состояния регенерации манифестов.
 *
 * Renderer может потерять локальный state при навигации (компонент размонтируется),
 * но процесс регенерации продолжается в main. Renderer запрашивает текущий стейт
 * через IPC `animeManifest:getRegenerationStatus` и подписывается на live-события.
 */

export interface RegenLogEntry {
  /** Уникальный ID для дедупа на стороне renderer */
  id: string
  /** Время события */
  timestamp: number
  /** Уровень — для подсветки в UI */
  level: 'info' | 'warn' | 'error' | 'success'
  /** Текст сообщения */
  message: string
  /** Доп. данные (например, animeName, missingCount) */
  meta?: Record<string, unknown>
}

export interface RegenerationStatus {
  isRegenerating: boolean
  startedAt: number | null
  finishedAt: number | null
  current: number
  total: number
  currentAnimeName: string | null
  log: RegenLogEntry[]
  result: {
    success: number
    failed: number
    errors: Array<{ animeId: string; error: string }>
  } | null
}

const MAX_LOG_ENTRIES = 2000

class RegenerationStateStore {
  private state: RegenerationStatus = {
    isRegenerating: false,
    startedAt: null,
    finishedAt: null,
    current: 0,
    total: 0,
    currentAnimeName: null,
    log: [],
    result: null,
  }

  private idCounter = 0

  /** Старт нового цикла регенерации */
  start(total: number): void {
    this.idCounter = 0
    this.state = {
      isRegenerating: true,
      startedAt: Date.now(),
      finishedAt: null,
      current: 0,
      total,
      currentAnimeName: null,
      log: [],
      result: null,
    }
  }

  /** Завершение цикла */
  finish(result: RegenerationStatus['result']): void {
    this.state.isRegenerating = false
    this.state.finishedAt = Date.now()
    this.state.result = result
  }

  /** Обновить прогресс (текущее аниме) */
  updateProgress(current: number, total: number, animeName: string): void {
    this.state.current = current
    this.state.total = total
    this.state.currentAnimeName = animeName
  }

  /** Добавить запись в лог + broadcast в renderer (если регенерация активна) */
  appendLog(level: RegenLogEntry['level'], message: string, meta?: Record<string, unknown>): RegenLogEntry {
    this.idCounter++
    const entry: RegenLogEntry = {
      id: `${this.state.startedAt ?? 0}-${this.idCounter}`,
      timestamp: Date.now(),
      level,
      message,
      meta,
    }
    this.state.log.push(entry)
    // Ограничиваем размер лога — старые записи отбрасываем
    if (this.state.log.length > MAX_LOG_ENTRIES) {
      this.state.log = this.state.log.slice(-MAX_LOG_ENTRIES)
    }
    // Broadcast в renderer — только пока активна регенерация (избегаем спама вне сессии).
    // Lazy import чтобы избежать циклической зависимости с ipc-handler-factory.
    if (this.state.isRegenerating) {
      import('../utils/ipc-handler-factory')
        .then(({ broadcastToWindows }) => {
          broadcastToWindows('manifest:regenerateLog', entry)
        })
        .catch(() => {
          /* broadcast опционален */
        })
    }
    return entry
  }

  /** Получить полный snapshot состояния */
  getStatus(): RegenerationStatus {
    return {
      ...this.state,
      log: [...this.state.log],
      result: this.state.result ? { ...this.state.result, errors: [...this.state.result.errors] } : null,
    }
  }

  /** Очистить состояние (например, после ack пользователем) */
  reset(): void {
    this.state = {
      isRegenerating: false,
      startedAt: null,
      finishedAt: null,
      current: 0,
      total: 0,
      currentAnimeName: null,
      log: [],
      result: null,
    }
    this.idCounter = 0
  }
}

export const regenerationState = new RegenerationStateStore()
