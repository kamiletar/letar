/**
 * JSON-конфиг в userData/keymap.json (%APPDATA%/KamiKeyThe/keymap.json)
 *
 * Чтение/запись конфигурации с маппингами, раскладками и настройками.
 * При ошибке чтения, отсутствии файла или невалидных данных — возвращает дефолтный конфиг.
 * Запись атомарная: tmp + renameSync (см. `@letar/electron-storage`).
 */

import { createJsonStore } from '@letar/electron-storage'
import type { KeymapConfig, LayoutProfile } from './types.js'

const store = createJsonStore<KeymapConfig | null>('keymap.json', null, { atomic: true })

/** Путь к файлу конфига */
export function getConfigPath(): string {
  return store.getPath()
}

/** Дефолтный конфиг с 14 маппингами (литералы, без импорта из keymap.ts) */
export function getDefaultConfig(): KeymapConfig {
  return {
    version: 2,
    editorPort: 0,
    activeLayout: 'Типографика',
    layouts: [
      {
        name: 'Типографика',
        mappings: [
          { vk: 0xbd, char: '\u2014', shiftChar: '\u2013', label: '— длинное тире', shiftLabel: '– короткое тире' },
          { vk: 0xdb, char: '\u00AB', shiftChar: '\u201E', label: '« кавычка откр.', shiftLabel: '„ нижняя кавычка' },
          {
            vk: 0xdd,
            char: '\u00BB',
            shiftChar: '\u201C',
            label: '» кавычка закр.',
            shiftLabel: '\u201C верхняя кавычка',
          },
          { vk: 0xbe, char: '\u2026', label: '… многоточие' },
          { vk: 0x20, char: '\u2009', label: '(тонкий пробел)' },
          { vk: 0x43, char: '\u00A9', label: '© копирайт' },
          { vk: 0x52, char: '\u00AE', shiftChar: '\u2122', label: '® рег. знак', shiftLabel: '™ торговая марка' },
          { vk: 0x53, char: '\u00A7', label: '§ параграф' },
          { vk: 0x4e, char: '\u2116', label: '№ номер' },
          { vk: 0x44, char: '\u00B0', label: '° градус' },
          { vk: 0x45, char: '\u20AC', label: '€ евро' },
          { vk: 0x58, char: '\u00D7', label: '× умножение' },
          { vk: 0xbb, char: '\u2260', shiftChar: '\u2248', label: '≠ не равно', shiftLabel: '≈ приблизительно' },
          { vk: 0x0d, char: '\u0301', label: '◌́ ударение (U+0301)' },
        ],
      },
    ],
    specialActions: [
      {
        vk: 0x08,
        modifiers: 0x0002 | 0x0001 | 0x0004, // MOD_CONTROL | MOD_ALT | MOD_SHIFT
        label: '⌫ Камикадзе (очистка строки)',
        action: 'clear-line',
      },
    ],
  }
}

/** Загрузить конфиг из файла. При ошибке, отсутствии или невалидных данных — дефолтный конфиг. */
export function loadConfig(): KeymapConfig {
  if (!store.exists()) {
    console.log(`Конфиг не найден: ${getConfigPath()}`)
    console.log('Создаю дефолтный конфиг...')
    const config = getDefaultConfig()
    saveConfig(config)
    return config
  }

  const parsed = store.loadSync()

  // Минимальная валидация
  if (!parsed || !parsed.layouts || !Array.isArray(parsed.layouts) || parsed.layouts.length === 0) {
    console.warn('Конфиг невалиден (нет раскладок), использую дефолт')
    return getDefaultConfig()
  }

  return parsed
}

/** Атомарная запись конфига: tmp + renameSync */
export function saveConfig(config: KeymapConfig): void {
  store.saveSync(config)
}

/** Получить активную раскладку (по имени или первую) */
export function getActiveLayout(config: KeymapConfig): LayoutProfile {
  const found = config.layouts.find((l) => l.name === config.activeLayout)
  return found ?? config.layouts[0]
}

/** Переключить на следующую раскладку (чистая функция) */
export function cycleLayout(config: KeymapConfig): KeymapConfig {
  const currentIndex = config.layouts.findIndex((l) => l.name === config.activeLayout)
  const nextIndex = (currentIndex + 1) % config.layouts.length
  return {
    ...config,
    activeLayout: config.layouts[nextIndex].name,
  }
}
