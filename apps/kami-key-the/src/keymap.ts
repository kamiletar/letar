/**
 * Карта символов AltGr → Unicode
 *
 * Мутабельные данные — заполняются из config через updateKeymap().
 * Геттеры getKeymap()/getShiftKeymap()/getSpecialActions() возвращают текущее состояние.
 */

import { getActiveLayout } from './config.js'
import type { KeymapConfig, KeyMapping, SpecialAction } from './types.js'

// --- Мутабельное состояние (заполняется через updateKeymap) ---

let _keymap: KeyMapping[] = []
let _shiftKeymap: KeyMapping[] = []
let _specialActions: SpecialAction[] = []
let _activeLayoutName = ''

// --- Геттеры ---

/** Текущая карта символов (AltGr+клавиша) */
export function getKeymap(): readonly KeyMapping[] {
  return _keymap
}

/** Маппинги с shiftChar (AltGr+Shift+клавиша) */
export function getShiftKeymap(): readonly KeyMapping[] {
  return _shiftKeymap
}

/** Специальные действия (Камикадзе и т.д.) */
export function getSpecialActions(): readonly SpecialAction[] {
  return _specialActions
}

/** Имя активной раскладки */
export function getActiveLayoutName(): string {
  return _activeLayoutName
}

// --- Обновление ---

/** Обновить карту символов из конфига (активная раскладка) */
export function updateKeymap(config: KeymapConfig): void {
  const layout = getActiveLayout(config)
  _keymap = layout.mappings
  _shiftKeymap = _keymap.filter((m) => m.shiftChar != null)
  _specialActions = config.specialActions
  _activeLayoutName = layout.name
}

// --- Поиск ---

/**
 * Поиск символа по hotkey ID
 *
 * Схема ID:
 *   0..keymap.length-1              → AltGr (normal layer)
 *   keymap.length..+SHIFT_N         → AltGr+Shift (shift layer)
 *   дальше                          → null (спец. действия обрабатываются отдельно)
 */
export function getCharByHotkeyId(id: number): string | undefined {
  if (id < _keymap.length) {
    return _keymap[id]?.char
  }
  // Shift layer: ID смещён на keymap.length
  const shiftIndex = id - _keymap.length
  return _shiftKeymap[shiftIndex]?.shiftChar
}
