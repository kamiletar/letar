/**
 * Данные клавиатуры — 5 рядов ANSI с русской раскладкой (ЙЦУКЕН)
 */

export interface KeyDef {
  /** Английский символ */
  label: string
  /** Русский символ */
  ru?: string
  /** Ширина в единицах (по умолчанию 1) */
  w?: number
  /** Virtual key code */
  vk: number
}

/** VK-коды для спецклавиш (не имеют символьного маппинга) */
export const MODIFIER_VKS = new Set([0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0x5b, 0x5c, 0x5d, 0x14, 0x09])

/** 5 рядов ANSI клавиатуры */
export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { label: '`', ru: 'Ё', vk: 0xc0 },
    { label: '1', vk: 0x31 },
    { label: '2', vk: 0x32 },
    { label: '3', vk: 0x33 },
    { label: '4', vk: 0x34 },
    { label: '5', vk: 0x35 },
    { label: '6', vk: 0x36 },
    { label: '7', vk: 0x37 },
    { label: '8', vk: 0x38 },
    { label: '9', vk: 0x39 },
    { label: '0', vk: 0x30 },
    { label: '-', vk: 0xbd },
    { label: '=', vk: 0xbb },
    { label: 'Bksp', w: 2, vk: 0x08 },
  ],
  [
    { label: 'Tab', w: 1.5, vk: 0x09 },
    { label: 'Q', ru: 'Й', vk: 0x51 },
    { label: 'W', ru: 'Ц', vk: 0x57 },
    { label: 'E', ru: 'У', vk: 0x45 },
    { label: 'R', ru: 'К', vk: 0x52 },
    { label: 'T', ru: 'Е', vk: 0x54 },
    { label: 'Y', ru: 'Н', vk: 0x59 },
    { label: 'U', ru: 'Г', vk: 0x55 },
    { label: 'I', ru: 'Ш', vk: 0x49 },
    { label: 'O', ru: 'Щ', vk: 0x4f },
    { label: 'P', ru: 'З', vk: 0x50 },
    { label: '[', ru: 'Х', vk: 0xdb },
    { label: ']', ru: 'Ъ', vk: 0xdd },
    { label: '\\', w: 1.5, vk: 0xdc },
  ],
  [
    { label: 'Caps', w: 1.75, vk: 0x14 },
    { label: 'A', ru: 'Ф', vk: 0x41 },
    { label: 'S', ru: 'Ы', vk: 0x53 },
    { label: 'D', ru: 'В', vk: 0x44 },
    { label: 'F', ru: 'А', vk: 0x46 },
    { label: 'G', ru: 'П', vk: 0x47 },
    { label: 'H', ru: 'Р', vk: 0x48 },
    { label: 'J', ru: 'О', vk: 0x4a },
    { label: 'K', ru: 'Л', vk: 0x4b },
    { label: 'L', ru: 'Д', vk: 0x4c },
    { label: ';', ru: 'Ж', vk: 0xba },
    { label: "'", ru: 'Э', vk: 0xde },
    { label: 'Enter', w: 2.25, vk: 0x0d },
  ],
  [
    { label: 'Shift', w: 2.25, vk: 0xa0 },
    { label: 'Z', ru: 'Я', vk: 0x5a },
    { label: 'X', ru: 'Ч', vk: 0x58 },
    { label: 'C', ru: 'С', vk: 0x43 },
    { label: 'V', ru: 'М', vk: 0x56 },
    { label: 'B', ru: 'И', vk: 0x42 },
    { label: 'N', ru: 'Т', vk: 0x4e },
    { label: 'M', ru: 'Ь', vk: 0x4d },
    { label: ',', ru: 'Б', vk: 0xbc },
    { label: '.', ru: 'Ю', vk: 0xbe },
    { label: '/', vk: 0xbf },
    { label: 'Shift', w: 2.75, vk: 0xa1 },
  ],
  [
    { label: 'Ctrl', w: 1.25, vk: 0xa2 },
    { label: 'Win', w: 1.25, vk: 0x5b },
    { label: 'Alt', w: 1.25, vk: 0xa4 },
    { label: '', w: 6.25, vk: 0x20 },
    { label: 'AltGr', w: 1.25, vk: 0xa5 },
    { label: 'Win', w: 1.25, vk: 0x5c },
    { label: 'Menu', w: 1.25, vk: 0x5d },
    { label: 'Ctrl', w: 1.25, vk: 0xa3 },
  ],
]

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
