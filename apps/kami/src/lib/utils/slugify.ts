import { slugify as slugifyBase } from '@letar/format-utils'

/** Генерация slug из строки (транслит + lowercase + дефисы), обрезано до 100 символов */
export function slugify(text: string): string {
  return slugifyBase(text).substring(0, 100)
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
