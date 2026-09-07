/**
 * Регистрация протокола `media://` — тонкая обёртка над `@letar/folder-scan`
 */

import {
  registerMediaProtocol as registerMediaProtocolInLib,
  setupMediaProtocolHandler as setupMediaProtocolHandlerInLib,
} from '@letar/folder-scan'

import { isPathAllowed } from './allowed-paths'

/** Вызывать до app.whenReady() — регистрирует привилегии схемы */
export function registerMediaProtocol(): void {
  registerMediaProtocolInLib('media')
}

/** Вызывать после app.whenReady() — навешивает сам обработчик протокола */
export function setupMediaProtocolHandler(): void {
  setupMediaProtocolHandlerInLib(isPathAllowed, 'media')
}
