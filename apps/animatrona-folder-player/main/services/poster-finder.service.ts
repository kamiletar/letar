/**
 * Поиск локального постера серии в папке — по распространённым именам файлов у raw-раздач
 * (PLAN.md §11, разбор фидбека «постер не подгрузился»). Никаких внешних API — только то, что
 * уже лежит рядом с видео.
 */

import { readdir } from 'node:fs/promises'
import path from 'node:path'

const POSTER_BASENAMES = ['poster', 'cover', 'folder']
const POSTER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

/**
 * Ищет файл-постер в корне папки (без рекурсии — постер кладут рядом с сериями, не внутри них).
 * Возвращает абсолютный путь к первому найденному совпадению или `null`.
 */
export async function findFolderPoster(folderPath: string): Promise<string | null> {
  let entries: string[]
  try {
    entries = await readdir(folderPath)
  } catch {
    return null
  }

  const byLowerName = new Map(entries.map((name) => [name.toLowerCase(), name]))

  for (const basename of POSTER_BASENAMES) {
    for (const ext of POSTER_EXTENSIONS) {
      const match = byLowerName.get(`${basename}${ext}`)
      if (match) {
        return path.join(folderPath, match)
      }
    }
  }

  return null
}
