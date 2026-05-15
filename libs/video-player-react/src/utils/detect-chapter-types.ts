/**
 * Определяет типы глав автоматически по названию или позиции
 *
 * Эвристики:
 * - Первые 90-120 сек обычно опенинг
 * - Последние 60-90 сек обычно эндинг
 * - Названия содержащие "OP", "Opening", "ED", "Ending"
 */

import type { Chapter, PlayerChapterType } from '../types'

export function detectChapterTypes(chapters: Chapter[], duration: number): Chapter[] {
  return chapters.map((chapter) => {
    // Если тип уже определён
    if (chapter.type) {
      return chapter
    }

    const title = chapter.title.toLowerCase()
    const chapterDuration = chapter.endTime - chapter.startTime

    // Определение по названию
    if (title.includes('opening') || title.includes('op') || title.includes('опенинг')) {
      return { ...chapter, type: 'OP' as PlayerChapterType }
    }
    if (title.includes('ending') || title.includes('ed') || title.includes('эндинг')) {
      return { ...chapter, type: 'ED' as PlayerChapterType }
    }
    if (title.includes('recap') || title.includes('ретроспектива') || title.includes('previously')) {
      return { ...chapter, type: 'RECAP' as PlayerChapterType }
    }
    if (title.includes('preview') || title.includes('превью') || title.includes('next')) {
      return { ...chapter, type: 'PREVIEW' as PlayerChapterType }
    }

    // Определение по позиции и длительности
    // Опенинг: в начале, 60-120 сек
    if (chapter.startTime < 180 && chapterDuration >= 60 && chapterDuration <= 150) {
      return { ...chapter, type: 'OP' as PlayerChapterType }
    }

    // Эндинг: в конце, 60-120 сек
    if (chapter.endTime > duration - 180 && chapterDuration >= 60 && chapterDuration <= 150) {
      return { ...chapter, type: 'ED' as PlayerChapterType }
    }

    return { ...chapter, type: 'CHAPTER' as PlayerChapterType }
  })
}
