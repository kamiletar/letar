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

/** Дефолтный конфиг: раскладки «Типографика» и «Индексы» (литералы, без импорта из keymap.ts) */
export function getDefaultConfig(): KeymapConfig {
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
          {
            vk: 0xdd,
            char: '»',
            shiftChar: '“',
            label: '» кавычка закр.',
            shiftLabel: '“ верхняя кавычка',
          },
          { vk: 0xbe, char: '…', label: '… многоточие' },
          { vk: 0x20, char: ' ', label: '(тонкий пробел)' },
          { vk: 0x43, char: '©', shiftChar: '¢', label: '© копирайт', shiftLabel: '¢ цент' },
          { vk: 0x52, char: '®', shiftChar: '™', label: '® рег. знак', shiftLabel: '™ торговая марка' },
          { vk: 0x53, char: '§', label: '§ параграф' },
          { vk: 0x4e, char: '№', label: '№ номер' },
          { vk: 0x44, char: '°', label: '° градус' },
          { vk: 0x45, char: '€', label: '€ евро' },
          { vk: 0x59, char: '¥', label: '¥ иена' },
          { vk: 0x4c, char: '£', label: '£ фунт' },
          { vk: 0x58, char: '×', label: '× умножение' },
          { vk: 0xbf, char: '÷', label: '÷ деление' },
          { vk: 0x50, char: '±', label: '± плюс-минус' },
          { vk: 0x38, char: '•', label: '• маркер списка' },
          { vk: 0xbb, char: '≠', shiftChar: '≈', label: '≠ не равно', shiftLabel: '≈ приблизительно' },
          { vk: 0x0d, char: '́', label: '◌́ ударение (U+0301)' },
          { vk: 0x26, char: '↑', label: '↑ стрелка вверх' },
          { vk: 0x25, char: '←', label: '← стрелка влево' },
          { vk: 0x28, char: '↓', label: '↓ стрелка вниз' },
          { vk: 0x27, char: '→', label: '→ стрелка вправо' },
        ],
      },
      {
        name: 'Индексы',
        mappings: [
          // Цифры 0-9: без Shift — подстрочный индекс (U+2080-2089), с Shift — надстрочный.
          // 1/2/3 надстрочные — не 2074/2075 (блок 2070-209F), а historical Latin-1 00B9/00B2/00B3
          { vk: 0x30, char: '₀', shiftChar: '⁰', label: '₀ подстр. 0', shiftLabel: '⁰ надстр. 0' },
          { vk: 0x31, char: '₁', shiftChar: '¹', label: '₁ подстр. 1', shiftLabel: '¹ надстр. 1' },
          { vk: 0x32, char: '₂', shiftChar: '²', label: '₂ подстр. 2', shiftLabel: '² надстр. 2' },
          { vk: 0x33, char: '₃', shiftChar: '³', label: '₃ подстр. 3', shiftLabel: '³ надстр. 3' },
          { vk: 0x34, char: '₄', shiftChar: '⁴', label: '₄ подстр. 4', shiftLabel: '⁴ надстр. 4' },
          { vk: 0x35, char: '₅', shiftChar: '⁵', label: '₅ подстр. 5', shiftLabel: '⁵ надстр. 5' },
          { vk: 0x36, char: '₆', shiftChar: '⁶', label: '₆ подстр. 6', shiftLabel: '⁶ надстр. 6' },
          { vk: 0x37, char: '₇', shiftChar: '⁷', label: '₇ подстр. 7', shiftLabel: '⁷ надстр. 7' },
          { vk: 0x38, char: '₈', shiftChar: '⁸', label: '₈ подстр. 8', shiftLabel: '⁸ надстр. 8' },
          { vk: 0x39, char: '₉', shiftChar: '⁹', label: '₉ подстр. 9', shiftLabel: '⁹ надстр. 9' },
          // Операторы формул (например xⁿ⁺¹) — физические клавиши подобраны по смыслу:
          // -/+ на своих OEM-клавишах, [ ] → ( ) как визуально близкие к скобкам
          { vk: 0xbd, char: '₋', shiftChar: '⁻', label: '₋ подстр. минус', shiftLabel: '⁻ надстр. минус' },
          { vk: 0xbb, char: '₊', shiftChar: '⁺', label: '₊ подстр. плюс', shiftLabel: '⁺ надстр. плюс' },
          { vk: 0xdc, char: '₌', shiftChar: '⁼', label: '₌ подстр. равно', shiftLabel: '⁼ надстр. равно' },
          { vk: 0xdb, char: '₍', shiftChar: '⁽', label: '₍ подстр. (', shiftLabel: '⁽ надстр. (' },
          { vk: 0xdd, char: '₎', shiftChar: '⁾', label: '₎ подстр. )', shiftLabel: '⁾ надстр. )' },
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

  return migrateBuiltInLayouts(parsed)
}

/**
 * Добавить новые встроенные раскладки в уже сохранённый на диске конфиг.
 *
 * getDefaultConfig() применяется только при первом запуске (файла ещё нет) — у пользователя
 * с существующим keymap.json новая раскладка, добавленная в дефолт при обновлении приложения,
 * иначе никогда бы не появилась сама. Не трогает раскладки, которые пользователь уже завёл
 * под тем же именем (считаем их намеренной кастомизацией, не перезаписываем).
 */
function migrateBuiltInLayouts(config: KeymapConfig): KeymapConfig {
  const existingNames = new Set(config.layouts.map((l) => l.name))
  const missing = getDefaultConfig().layouts.filter((l) => !existingNames.has(l.name))
  if (missing.length === 0) {
    return config
  }
  console.log(`Добавляю новые встроенные раскладки: ${missing.map((l) => l.name).join(', ')}`)
  const migrated: KeymapConfig = { ...config, layouts: [...config.layouts, ...missing] }
  saveConfig(migrated)
  return migrated
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
