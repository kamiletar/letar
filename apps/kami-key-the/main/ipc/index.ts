/**
 * Регистрация всех IPC handlers
 */

import { registerConfigHandlers } from './config.handlers'
import { registerExclusionsHandlers } from './exclusions.handlers'
import { registerStatsHandlers } from './stats.handlers'
import { registerSymbolsHandlers } from './symbols.handlers'
import { registerSystemHandlers } from './system.handlers'

export function registerAllHandlers(): void {
  registerConfigHandlers()
  registerExclusionsHandlers()
  registerStatsHandlers()
  registerSymbolsHandlers()
  registerSystemHandlers()
  console.log('IPC handlers зарегистрированы')
}
