/**
 * PlayerEventEmitter — базовый класс для событий плеера
 *
 * Типобезопасная реализация EventEmitter для плеера
 */

import type { PlayerEventHandler, PlayerEventMap, PlayerEventUnsubscribe } from '../types'

/**
 * Типобезопасный EventEmitter для плеера
 */
export class PlayerEventEmitter {
  private listeners: Map<keyof PlayerEventMap, Set<PlayerEventHandler<keyof PlayerEventMap>>> = new Map()

  /**
   * Подписаться на событие
   *
   * @returns Функция отписки
   */
  on<K extends keyof PlayerEventMap>(event: K, handler: PlayerEventHandler<K>): PlayerEventUnsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const handlers = this.listeners.get(event)!
    handlers.add(handler as PlayerEventHandler<keyof PlayerEventMap>)

    return () => {
      handlers.delete(handler as PlayerEventHandler<keyof PlayerEventMap>)
    }
  }

  /**
   * Отписаться от события
   */
  off<K extends keyof PlayerEventMap>(event: K, handler: PlayerEventHandler<K>): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler as PlayerEventHandler<keyof PlayerEventMap>)
    }
  }

  /**
   * Отправить событие
   */
  protected emit<K extends keyof PlayerEventMap>(
    event: K,
    ...args: PlayerEventMap[K] extends void ? [] : [PlayerEventMap[K]]
  ): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          if (args.length > 0) {
            ;(handler as (data: unknown) => void)(args[0])
          } else {
            ;(handler as () => void)()
          }
        } catch (error) {
          console.error(`[PlayerEventEmitter] Error in handler for "${event}":`, error)
        }
      }
    }
  }

  /**
   * Удалить все подписки
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Удалить все подписки для конкретного события
   */
  removeListeners<K extends keyof PlayerEventMap>(event: K): void {
    this.listeners.delete(event)
  }
}
