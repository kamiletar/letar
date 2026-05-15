/**
 * Регистрация всех IPC handlers
 */

import { registerConfigHandlers } from './config.handlers'
import { registerExclusionsHandlers } from './exclusions.handlers'
import { registerSymbolsHandlers } from './symbols.handlers'
import { registerSystemHandlers } from './system.handlers'

export function registerAllHandlers(): void {
  registerConfigHandlers()
  registerExclusionsHandlers()
  registerSymbolsHandlers()
  registerSystemHandlers()
  console.log('IPC handlers зарегистрированы')
}
