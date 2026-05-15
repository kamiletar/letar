/**
 * Категории символов по Unicode-блокам
 *
 * Категория определяется по codepoint — не нужно модифицировать symbols.json
 */

export interface SymbolCategory {
  id: string
  label: string
  ranges: [number, number][]
}

export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  { id: 'all', label: 'Все', ranges: [] },
  { id: 'punctuation', label: 'Пунктуация', ranges: [[0x2000, 0x206f]] },
  {
    id: 'currency',
    label: 'Валюты',
    ranges: [
      [0x20a0, 0x20cf],
      [0x00a2, 0x00a5], // ¢ £ ¤ ¥
    ],
  },
  { id: 'arrows', label: 'Стрелки', ranges: [[0x2190, 0x21ff]] },
  { id: 'math', label: 'Математика', ranges: [[0x2200, 0x22ff]] },
  {
    id: 'letterlike',
    label: 'Буквенные',
    ranges: [
      [0x2100, 0x214f],
      [0x2150, 0x218f],
    ],
  },
  { id: 'technical', label: 'Технические', ranges: [[0x2300, 0x23ff]] },
  {
    id: 'box',
    label: 'Рамки',
    ranges: [
      [0x2500, 0x257f],
      [0x2580, 0x259f],
    ],
  },
  { id: 'geometric', label: 'Геометрия', ranges: [[0x25a0, 0x25ff]] },
  {
    id: 'misc',
    label: 'Разные',
    ranges: [
      [0x2600, 0x26ff],
      [0x2700, 0x27bf],
    ],
  },
  {
    id: 'latin',
    label: 'Latin-1',
    ranges: [
      [0x0080, 0x00ff],
      [0x0100, 0x024f],
    ],
  },
]

/** Определить принадлежит ли codepoint категории */
export function matchesCategory(cp: number, category: SymbolCategory): boolean {
  if (category.id === 'all') {
    return true
  }
  return category.ranges.some(([from, to]) => cp >= from && cp <= to)
}
