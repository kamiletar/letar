'use server'

/**
 * Server Actions для жанров и тем
 * v0.28.0: Выделено из extended-metadata.action.ts после перехода на AnimeManifest
 */

import { prisma } from '@/lib/db'

/** Жанр или тема из Shikimori */
export interface ShikimoriGenreInput {
  id: string
  name: string
  russian: string
  kind: 'genre' | 'theme'
}

/**
 * Генерирует slug из названия
 * "Экшен" → "ekshen", "Action" → "action"
 */
function generateSlug(name: string): string {
  const translitMap: Record<string, string> = {
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

  return name
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Сохранить жанры и темы из Shikimori
 */
export async function saveGenresAndThemes(
  animeId: string,
  genres: ShikimoriGenreInput[],
): Promise<{ success: boolean; error?: string }> {
  try {
    // Удаляем старые связи
    await prisma.genreOnAnime.deleteMany({ where: { animeId } })
    await prisma.themeOnAnime.deleteMany({ where: { animeId } })

    for (const genreData of genres) {
      const shikimoriId = parseInt(genreData.id, 10)
      const name = genreData.russian || genreData.name

      if (genreData.kind === 'theme') {
        // Сохраняем как тему
        const theme = await prisma.theme.upsert({
          where: { shikimoriId },
          create: {
            name,
            nameRu: genreData.russian || null,
            shikimoriId,
          },
          update: {
            name,
            nameRu: genreData.russian || null,
          },
        })

        try {
          await prisma.themeOnAnime.create({
            data: {
              animeId,
              themeId: theme.id,
            },
          })
        } catch {
          // Игнорируем дубликаты
        }
      } else {
        // Сохраняем как жанр
        const slug = generateSlug(name)
        const genre = await prisma.genre.upsert({
          where: { shikimoriId },
          create: {
            name,
            slug,
            shikimoriId,
          },
          update: {
            name,
          },
        })

        try {
          await prisma.genreOnAnime.create({
            data: {
              animeId,
              genreId: genre.id,
            },
          })
        } catch {
          // Игнорируем дубликаты
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[saveGenresAndThemes] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Получить все жанры для фильтра
 */
export async function getAllGenres(): Promise<{ id: string; name: string; slug: string }[]> {
  return prisma.genre.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
}

/**
 * Получить все темы для фильтра
 */
export async function getAllThemes(): Promise<{ id: string; name: string; nameRu: string | null }[]> {
  return prisma.theme.findMany({
    select: { id: true, name: true, nameRu: true },
    orderBy: { name: 'asc' },
  })
}
