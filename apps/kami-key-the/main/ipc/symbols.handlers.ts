/**
 * IPC handlers для symbols.json
 *
 * symbols:getAll — загрузить все символы (с кэшированием)
 */

import { ipcMain } from 'electron'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SymbolEntry } from '../../shared/ipc-types'

/** Кэш символов в памяти */
let symbolsCache: SymbolEntry[] | null = null

/** Загрузить symbols.json из нескольких кандидатов пути */
function loadSymbols(): SymbolEntry[] {
  if (symbolsCache) {
    return symbolsCache
  }

  const candidates = [
    // Production (extraResources)
    path.join(process.resourcesPath ?? '', 'data', 'symbols.json'),
    // Dev (из корня проекта)
    path.join(__dirname, '..', '..', 'data', 'symbols.json'),
    // Dev (из CWD)
    path.join(process.cwd(), 'apps', 'kami-key-the', 'data', 'symbols.json'),
  ]

  for (const candidate of candidates) {
    try {
      const raw = readFileSync(candidate, 'utf-8')
      symbolsCache = JSON.parse(raw) as SymbolEntry[]
      console.log(`Символы загружены: ${symbolsCache.length} записей (${candidate})`)
      return symbolsCache
    } catch {
      // Пробуем следующий путь
    }
  }

  console.warn('symbols.json не найден')
  symbolsCache = []
  return symbolsCache
}

export function registerSymbolsHandlers(): void {
  ipcMain.handle('symbols:getAll', (): SymbolEntry[] => {
    return loadSymbols()
  })
}
