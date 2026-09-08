/**
 * Конвертация глав из формата пробы (`MediaChapter`, main-процесс — mediainfo.js/ffprobe) в
 * формат UI плеера (`Chapter`/`ChapterInfo`, `@letar/video-player-react`) — вынесено из
 * `renderer/app/_hooks/use-chapter-skip.ts` в `shared/`, чтобы покрыть unit-тестами: рендерер
 * этого приложения не входит в `include` `vitest.config.mts` (та же конвенция, что у соседних
 * Electron-приложений — `animatrona`, `label-printer-desktop`, `poster-microtext-desktop`, ни у
 * одного из них нет тестов `renderer/`), а чистая логика без DOM в `shared/` — входит.
 */
import type { MediaChapter } from '@letar/folder-scan'
import { type Chapter, type ChapterInfo, detectChapterTypes } from '@letar/video-player-react'

function mediaChaptersToChapters(chapters: MediaChapter[]): Chapter[] {
  return chapters.map((chapter, index) => ({
    id: `chapter-${index}`,
    title: chapter.title || `Глава ${index + 1}`,
    startTime: chapter.start,
    endTime: chapter.end,
  }))
}

function chaptersToChapterInfos(chapters: Chapter[]): ChapterInfo[] {
  return chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, startTime: chapter.startTime }))
}

export interface ClassifiedChapters {
  /** Главы с определённым типом (OP/ED/RECAP/PREVIEW/CHAPTER) — для `ChapterSkipButton` */
  chapters: Chapter[]
  /** Те же главы в узком формате — для маркеров `SharedPlayerControls` */
  chapterInfos: ChapterInfo[]
}

const EMPTY_RESULT: ClassifiedChapters = { chapters: [], chapterInfos: [] }

/**
 * `mediaChapters`/`duration` не заданы или пусты — пустой результат, не ошибка (файл без глав
 * или ffmpeg недоступен, см. `main/services/ffmpeg/chapters.service.ts`).
 */
export function classifyMediaChapters(
  mediaChapters: MediaChapter[] | undefined,
  duration: number,
): ClassifiedChapters {
  if (!mediaChapters || mediaChapters.length === 0 || !duration) {
    return EMPTY_RESULT
  }
  const chapters = detectChapterTypes(mediaChaptersToChapters(mediaChapters), duration)
  return { chapters, chapterInfos: chaptersToChapterInfos(chapters) }
}
