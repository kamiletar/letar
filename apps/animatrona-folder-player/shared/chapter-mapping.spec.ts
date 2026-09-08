import type { MediaChapter } from '@letar/folder-scan'
import { describe, expect, it } from 'vitest'

import { classifyMediaChapters } from './chapter-mapping'

describe('classifyMediaChapters', () => {
  it('undefined mediaChapters — пустой результат', () => {
    expect(classifyMediaChapters(undefined, 1400)).toEqual({ chapters: [], chapterInfos: [] })
  })

  it('пустой массив mediaChapters — пустой результат', () => {
    expect(classifyMediaChapters([], 1400)).toEqual({ chapters: [], chapterInfos: [] })
  })

  it('duration 0 при непустых главах — пустой результат', () => {
    const mediaChapters: MediaChapter[] = [{ start: 0, end: 90, title: 'Opening' }]
    expect(classifyMediaChapters(mediaChapters, 0)).toEqual({ chapters: [], chapterInfos: [] })
  })

  it('duration NaN при непустых главах — пустой результат', () => {
    const mediaChapters: MediaChapter[] = [{ start: 0, end: 90, title: 'Opening' }]
    expect(classifyMediaChapters(mediaChapters, Number.NaN)).toEqual({ chapters: [], chapterInfos: [] })
  })

  it('глава с названием Opening в начале файла — распознаётся как OP', () => {
    const mediaChapters: MediaChapter[] = [{ start: 0, end: 90, title: 'Opening' }]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapters).toHaveLength(1)
    expect(result.chapters[0]).toMatchObject({
      id: 'chapter-0',
      title: 'Opening',
      startTime: 0,
      endTime: 90,
      type: 'OP',
    })
  })

  it('глава с названием Ending в конце файла — распознаётся как ED', () => {
    const mediaChapters: MediaChapter[] = [{ start: 1310, end: 1400, title: 'Ending' }]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapters[0]).toMatchObject({ type: 'ED' })
  })

  it('глава без названия (пустая строка) — подставляется "Глава N" по индексу+1', () => {
    const mediaChapters: MediaChapter[] = [
      { start: 0, end: 90, title: '' },
      { start: 90, end: 200, title: '' },
    ]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapters[0].title).toBe('Глава 1')
    expect(result.chapters[1].title).toBe('Глава 2')
  })

  it('несколько глав — id присваиваются по порядку chapter-0, chapter-1, ...', () => {
    const mediaChapters: MediaChapter[] = [
      { start: 0, end: 90, title: 'Opening' },
      { start: 90, end: 1310, title: 'Episode' },
      { start: 1310, end: 1400, title: 'Ending' },
    ]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapters.map((c) => c.id)).toEqual(['chapter-0', 'chapter-1', 'chapter-2'])
  })

  it('chapterInfos — та же длина, что chapters, только id/title/startTime', () => {
    const mediaChapters: MediaChapter[] = [
      { start: 0, end: 90, title: 'Opening' },
      { start: 1310, end: 1400, title: 'Ending' },
    ]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapterInfos).toHaveLength(result.chapters.length)
    result.chapterInfos.forEach((info, index) => {
      expect(info).toEqual({
        id: result.chapters[index].id,
        title: result.chapters[index].title,
        startTime: result.chapters[index].startTime,
      })
    })
  })

  it('startTime/endTime главы переносятся из start/end MediaChapter без изменений', () => {
    const mediaChapters: MediaChapter[] = [{ start: 12.5, end: 103.75, title: 'Chapter 1' }]
    const result = classifyMediaChapters(mediaChapters, 1400)

    expect(result.chapters[0].startTime).toBe(12.5)
    expect(result.chapters[0].endTime).toBe(103.75)
  })
})
