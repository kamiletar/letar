/**
 * Фабрика адаптеров серверов
 *
 * Создаёт подходящий адаптер на основе типа сервера.
 */

import type { ServerConfig } from '@/types/server'
import { createDesktopAdapter } from './desktop'
import { createTrackerAdapter } from './tracker'
import type { ServerAdapter } from './types'

export type { EpisodeVideoInfo, LibraryOptions, ProgressSaveData, ServerAdapter } from './types'

/** Создать адаптер для сервера */
export function createAdapter(server: ServerConfig): ServerAdapter {
  switch (server.type) {
    case 'desktop':
      return createDesktopAdapter(server)
    case 'tracker':
      return createTrackerAdapter(server)
    default:
      throw new Error(`Неизвестный тип сервера: ${(server as ServerConfig).type}`)
  }
}
