/**
 * Данные клавиатуры для редактора — физический макет вынесен в общий
 * `shared/keyboard-layout.ts` (используется и нативным GDI-оверлеем, `src/overlay.ts`).
 * Здесь остаётся то, что нужно только визуальной клавиатуре редактора: физический блок
 * стрелок, набор модификаторов и поиск клавиши по VK.
 */

import type { KeyDef } from '../../../shared/keyboard-layout'
import { KEYBOARD_ROWS } from '../../../shared/keyboard-layout'

export type { KeyDef } from '../../../shared/keyboard-layout'
export { KEYBOARD_ROWS } from '../../../shared/keyboard-layout'

/** VK-коды для спецклавиш (не имеют символьного маппинга) */
export const MODIFIER_VKS = new Set([0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x5b, 0x5c, 0x5d, 0x14, 0x09])

/** Физический блок стрелок (VK_LEFT/UP/RIGHT/DOWN) — отдельно от основного блока, как на реальной клавиатуре */
export const ARROW_KEYS = {
  up: { label: '↑', vk: 0x26 },
  left: { label: '←', vk: 0x25 },
  down: { label: '↓', vk: 0x28 },
  right: { label: '→', vk: 0x27 },
} satisfies Record<string, KeyDef>

/** Плоский список всех клавиш (основной блок + физические стрелки) — для поиска по VK */
const ALL_KEYS: KeyDef[] = [...KEYBOARD_ROWS.flat(), ARROW_KEYS.up, ARROW_KEYS.left, ARROW_KEYS.down, ARROW_KEYS.right]

/** Найти определение клавиши по VK-коду (для восстановления route из URL) */
export function findKeyByVk(vk: number): KeyDef | undefined {
  return ALL_KEYS.find((k) => k.vk === vk)
}

/** Отображаемый символ для невидимых Unicode */
export function displayChar(char: string): string {
  if (char === '\u2009') {
    return '\u23B5'
  } // тонкий пробел → ⎵
  if (char === '\u0301') {
    return '\u00B4'
  } // combining accent → ´
  return char
}

/** Hex представление VK */
export function toHex(n: number): string {
  return '0x' + n.toString(16).toUpperCase().padStart(2, '0')
}

/** Unicode представление символа */
export function toUnicode(char: string): string {
  return 'U+' + (char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')
}
