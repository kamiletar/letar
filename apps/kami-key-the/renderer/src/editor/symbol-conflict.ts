/**
 * Проверка конфликтов символов внутри одной раскладки
 *
 * Ничего не блокирует — только даёт пользователю явную подсказку, что символ
 * уже назначен на другую клавишу/слот, прежде чем он повторит это незаметно
 * для себя. Проверка только внутри активной раскладки, не между раскладками —
 * разные раскладки осознанно независимы друг от друга (переключение между
 * ними — уже способ иметь разные наборы символов).
 */

import type { KeyMapping } from '../../../src/types'
import { findKeyByVk } from './keyboard-data'

export interface SymbolConflict {
  vk: number
  slot: 'char' | 'shiftChar'
}

/**
 * Ищет, назначен ли уже символ `char` на другую клавишу/слот раскладки —
 * кроме той пары (vk, slot), в которую его сейчас записывают.
 */
export function findSymbolConflict(
  mappings: KeyMapping[],
  char: string,
  targetVk: number,
  targetSlot: 'char' | 'shiftChar',
): SymbolConflict | null {
  for (const m of mappings) {
    if (m.char === char && !(m.vk === targetVk && targetSlot === 'char')) {
      return { vk: m.vk, slot: 'char' }
    }
    if (m.shiftChar === char && !(m.vk === targetVk && targetSlot === 'shiftChar')) {
      return { vk: m.vk, slot: 'shiftChar' }
    }
  }
  return null
}

/** Человекочитаемое описание конфликта для тоста */
export function describeSymbolConflict(conflict: SymbolConflict): string {
  const key = findKeyByVk(conflict.vk)
  const keyLabel = key?.label ?? conflict.vk.toString(16).toUpperCase()
  const slotLabel = conflict.slot === 'char' ? `AltGr+${keyLabel}` : `AltGr+Shift+${keyLabel}`
  return `Символ уже назначен на ${slotLabel}`
}
