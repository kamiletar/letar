/**
 * Утилиты для отображения имён игроков.
 *
 * Решает проблему однофамильцев: если поле disambiguation заполнено,
 * оно показывается в скобках рядом с именем.
 */

/** Минимальный набор полей для отображения имени */
interface PlayerLike {
  name: string
  disambiguation?: string | null
}

/**
 * Отображаемое имя игрока.
 * "Иван Шупляков" или "Иван Шупляков (НЕНАХОД НОГИ)"
 */
export function playerDisplayName(player: PlayerLike): string {
  if (player.disambiguation) {
    return `${player.name} (${player.disambiguation})`
  }
  return player.name
}

/**
 * Генерация уникального slug для игрока.
 * При коллизии добавляет суффикс -2, -3 и т.д.
 */
export function makePlayerSlug(name: string, existingSlugs: Set<string>): string {
  const base = transliterate(name)
  if (!existingSlugs.has(base)) {
    return base
  }

  let i = 2
  while (existingSlugs.has(`${base}-${i}`)) {
    i++
  }
  return `${base}-${i}`
}

/** Транслитерация кириллицы → латиница для slug */
function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }

  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
