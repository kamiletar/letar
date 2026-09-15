/**
 * Типы IPC каналов между main и renderer процессами
 */

import type { KeymapConfig } from '../src/types'

/** Запись символа для поиска */
export interface SymbolEntry {
  /** Hex-код (без U+) */
  c: string
  /** Название */
  n: string
  /** Синонимы (через запятую) */
  s?: string
}

/** Статистика символа */
export interface StatEntry {
  char: string
  count: number
}

/** Информация о раскладке */
export interface LayoutInfo {
  name: string
  count: number
}

/** API, доступный через window.electronAPI */
export interface ElectronAPI {
  config: {
    get(): Promise<KeymapConfig>
    save(config: KeymapConfig): Promise<void>
    cycleLayout(): Promise<KeymapConfig>
  }
  symbols: {
    getAll(): Promise<SymbolEntry[]>
  }
  stats: {
    getTop(n: number): Promise<StatEntry[]>
  }
  exclusions: {
    getList(): Promise<string[]>
    saveList(processes: string[]): Promise<void>
    getForegroundProcess(): Promise<string>
  }
  system: {
    getVersion(): Promise<string>
    getLayoutInfo(): Promise<LayoutInfo>
    isAutostartEnabled(): Promise<boolean>
    setAutostart(on: boolean): Promise<boolean>
    isHotkeyEnabled(): Promise<boolean>
    setHotkeyEnabled(on: boolean): Promise<void>
    checkForUpdates(): Promise<void>
  }
  /** Платформа процесса (process.platform) — нужна для расчёта отступа под системные кнопки окна */
  platform: string
  on: {
    configChanged(cb: (config: KeymapConfig) => void): () => void
    hotkeyEnabledChanged(cb: (on: boolean) => void): () => void
    navigate(cb: (page: 'editor' | 'settings') => void): () => void
  }
}
