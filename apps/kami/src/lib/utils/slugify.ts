/** Таблица транслитерации кириллицы */
const TRANSLIT: Record<string, string> = {
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
  х: 'kh',
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

/** Генерация slug из строки (транслит + lowercase + дефисы) */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

/** Интерфейс для проверки уникальности slug */
interface SlugChecker {
  audioFile: {
    findUnique: (args: { where: { slug: string } }) => Promise<unknown>
  }
}

/** Генерация уникального slug с проверкой в БД */
export async function uniqueSlug(text: string, prisma: SlugChecker): Promise<string> {
  const base = slugify(text) || 'audio'

  const existing = await prisma.audioFile.findUnique({ where: { slug: base } })
  if (!existing) {
    return base
  }

  // Ищем свободный суффикс
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    const found = await prisma.audioFile.findUnique({ where: { slug: candidate } })
    if (!found) {
      return candidate
    }
  }

  // Fallback — добавить timestamp
  return `${base}-${Date.now()}`
}
