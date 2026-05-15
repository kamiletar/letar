/**
 * JSON-конфиг в %APPDATA%/KamiKeyThe/keymap.json
 *
 * Чтение/запись конфигурации с маппингами, раскладками и настройками.
 * При ошибке чтения или отсутствии файла — возвращает дефолтный конфиг.
 * Запись атомарная: tmp + renameSync.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { KeymapConfig, LayoutProfile } from './types.js'

/** Путь к файлу конфига */
export function getConfigPath(): string {
  const appData = process.env.APPDATA
  if (!appData) {
    throw new Error('Переменная окружения APPDATA не определена')
  }
  return join(appData, 'KamiKeyThe', 'keymap.json')
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

/** Загрузить конфиг из файла. При ошибке — дефолтный конфиг. */
export function loadConfig(): KeymapConfig {
  const configPath = getConfigPath()

  try {
    if (!existsSync(configPath)) {
      console.log(`Конфиг не найден: ${configPath}`)
      console.log('Создаю дефолтный конфиг...')
      const config = getDefaultConfig()
      saveConfig(config)
      return config
    }

    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw) as KeymapConfig

    // Минимальная валидация
    if (!parsed.layouts || !Array.isArray(parsed.layouts) || parsed.layouts.length === 0) {
      console.warn('Конфиг невалиден (нет раскладок), использую дефолт')
      return getDefaultConfig()
    }

    return parsed
  } catch (err) {
    console.warn('Ошибка чтения конфига, использую дефолт:', err)
    return getDefaultConfig()
  }
}

/** Атомарная запись конфига: tmp + renameSync */
export function saveConfig(config: KeymapConfig): void {
  const configPath = getConfigPath()
  const dir = dirname(configPath)
  const tmpPath = configPath + '.tmp'

  // Создаём директорию если не существует
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const json = JSON.stringify(config, null, 2)
  writeFileSync(tmpPath, json, 'utf-8')
  renameSync(tmpPath, configPath)
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
