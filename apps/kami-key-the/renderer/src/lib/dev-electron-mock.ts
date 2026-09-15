/**
 * Dev-заглушка `window.electronAPI` — позволяет открывать renderer напрямую в Vite dev server
 * (браузер, Browser pane) без запущенного Electron main-процесса.
 *
 * Подключается только в dev-сборке и только если electronAPI ещё не проброшен preload-скриптом
 * (реальный Electron его уже выставляет). В прод-сборке ветка вызова вырезается статическим
 * анализом Vite (import.meta.env.DEV === false), сам файл в бандл не попадает.
 */

import type { ElectronAPI, StatEntry, SymbolEntry } from '../../../shared/ipc-types'
import type { KeymapConfig, LayoutProfile } from '../../../src/types'

/** Минимальный набор раскладок для разработки — сокращённая копия getDefaultConfig() из src/config.ts */
function createDevConfig(): KeymapConfig {
  return {
    version: 2,
    editorPort: 0,
    activeLayout: 'Типографика',
    layouts: [
      {
        name: 'Типографика',
        mappings: [
          { vk: 0xbd, char: '—', shiftChar: '–', label: '— длинное тире', shiftLabel: '– короткое тире' },
          { vk: 0xdb, char: '«', shiftChar: '„', label: '« кавычка откр.', shiftLabel: '„ нижняя кавычка' },
          { vk: 0xdd, char: '»', shiftChar: '"', label: '» кавычка закр.', shiftLabel: '" верхняя кавычка' },
          { vk: 0xbe, char: '…', label: '… многоточие' },
          { vk: 0x43, char: '©', shiftChar: '¢', label: '© копирайт', shiftLabel: '¢ цент' },
          { vk: 0x52, char: '®', shiftChar: '™', label: '® рег. знак', shiftLabel: '™ торговая марка' },
          { vk: 0x4e, char: '№', label: '№ номер' },
          { vk: 0x44, char: '°', label: '° градус' },
          { vk: 0x45, char: '€', label: '€ евро' },
          { vk: 0x26, char: '↑', label: '↑ стрелка вверх' },
          { vk: 0x25, char: '←', label: '← стрелка влево' },
          { vk: 0x28, char: '↓', label: '↓ стрелка вниз' },
          { vk: 0x27, char: '→', label: '→ стрелка вправо' },
        ],
      },
      {
        name: 'Индексы',
        mappings: [
          { vk: 0x30, char: '₀', shiftChar: '⁰', label: '₀ подстр. 0', shiftLabel: '⁰ надстр. 0' },
          { vk: 0x31, char: '₁', shiftChar: '¹', label: '₁ подстр. 1', shiftLabel: '¹ надстр. 1' },
        ],
      },
    ],
    specialActions: [
      {
        vk: 0x08,
        modifiers: 0x0002 | 0x0001 | 0x0004,
        label: '⌫ Камикадзе (очистка строки)',
        action: 'clear-line',
      },
    ],
  }
}

/** Установить заглушку electronAPI — вызывать до рендера, только в dev при отсутствии реального API */
export function installDevElectronMock(): void {
  let config = createDevConfig()
  let hotkeyEnabled = true
  const configListeners = new Set<(cfg: KeymapConfig) => void>()
  const hotkeyListeners = new Set<(on: boolean) => void>()
  const navigateListeners = new Set<(page: 'editor' | 'settings') => void>()
  const excludedProcesses: string[] = []

  const notifyConfigChanged = () => {
    for (const cb of configListeners) {
      cb(config)
    }
  }

  const mock: ElectronAPI = {
    config: {
      get: () => Promise.resolve(config),
      save: (next: KeymapConfig) => {
        config = next
        notifyConfigChanged()
        return Promise.resolve()
      },
      cycleLayout: () => {
        const idx = config.layouts.findIndex((l: LayoutProfile) => l.name === config.activeLayout)
        const next = config.layouts[(idx + 1) % config.layouts.length]
        config = { ...config, activeLayout: next.name }
        notifyConfigChanged()
        return Promise.resolve(config)
      },
    },
    symbols: {
      getAll: async (): Promise<SymbolEntry[]> => {
        const res = await fetch(new URL('../../../data/symbols.json', import.meta.url))
        return (await res.json()) as SymbolEntry[]
      },
    },
    stats: {
      getTop: (n: number): Promise<StatEntry[]> =>
        Promise.resolve(
          [
            { char: '—', count: 128 },
            { char: '€', count: 64 },
            { char: '№', count: 32 },
          ].slice(0, n),
        ),
    },
    exclusions: {
      getList: () => Promise.resolve(excludedProcesses),
      saveList: (processes: string[]) => {
        excludedProcesses.length = 0
        excludedProcesses.push(...processes)
        return Promise.resolve()
      },
      getForegroundProcess: () => Promise.resolve('devenv.exe'),
    },
    system: {
      getVersion: () => Promise.resolve('1.8.0-dev'),
      getLayoutInfo: () => Promise.resolve({ name: 'Русская (dev)', count: 1 }),
      isAutostartEnabled: () => Promise.resolve(false),
      setAutostart: (on: boolean) => Promise.resolve(on),
      isHotkeyEnabled: () => Promise.resolve(hotkeyEnabled),
      setHotkeyEnabled: (on: boolean) => {
        hotkeyEnabled = on
        for (const cb of hotkeyListeners) {
          cb(on)
        }
        return Promise.resolve()
      },
      checkForUpdates: () => Promise.resolve(),
    },
    platform: 'win32',
    on: {
      configChanged: (cb: (cfg: KeymapConfig) => void) => {
        configListeners.add(cb)
        return () => configListeners.delete(cb)
      },
      hotkeyEnabledChanged: (cb: (on: boolean) => void) => {
        hotkeyListeners.add(cb)
        return () => hotkeyListeners.delete(cb)
      },
      navigate: (cb: (page: 'editor' | 'settings') => void) => {
        navigateListeners.add(cb)
        return () => navigateListeners.delete(cb)
      },
    },
  }

  window.electronAPI = mock
}
