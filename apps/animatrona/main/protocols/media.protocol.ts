/**
 * Кастомный протокол media:// — тонкая обёртка над `@letar/folder-scan`
 *
 * Реализация протокола (MIME-типы, Range-запросы, стриминг) переиспользуется как есть —
 * здесь только подключение Animatrona-специфичного whitelist из `allowed-paths.ts`.
 */

import {
  registerMediaProtocol as registerMediaProtocolInLib,
  setupMediaProtocolHandler as setupMediaProtocolHandlerInLib,
} from '@letar/folder-scan'
import { isPathAllowed } from './allowed-paths'

/**
 * Регистрирует кастомный протокол media://
 * Должен вызываться ПЕРЕД app.whenReady()
 */
export function registerMediaProtocol(): void {
  registerMediaProtocolInLib('media')
}

/**
 * Настраивает обработчик запросов для media:// протокола
 * Должен вызываться ПОСЛЕ app.whenReady()
 */
export function setupMediaProtocolHandler(): void {
  setupMediaProtocolHandlerInLib(isPathAllowed, 'media')
}
