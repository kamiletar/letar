import { describe, expect, it } from 'vitest'

import { detectChapterTypes } from './detect-chapter-types'

import type { Chapter } from '../types'

function makeChapter(overrides: Partial<Chapter>): Chapter {
  return {
    title: 'Chapter',
    startTime: 0,
    endTime: 100,
    ...overrides,
  } as Chapter
}

describe('detectChapterTypes', () => {
  it('не трогает главу с уже определённым типом', () => {
    const chapters = [makeChapter({ title: 'что угодно', type: 'CHAPTER' })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('CHAPTER')
  })

  it('определяет OP по названию "Opening"', () => {
    const chapters = [makeChapter({ title: 'Opening', startTime: 500, endTime: 600 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('OP')
  })

  it('определяет OP по русскому названию "опенинг"', () => {
    const chapters = [makeChapter({ title: 'Опенинг', startTime: 500, endTime: 600 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('OP')
  })

  it('определяет ED по названию "Ending"', () => {
    const chapters = [makeChapter({ title: 'Ending', startTime: 500, endTime: 600 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('ED')
  })

  it('определяет RECAP по названию "Recap"', () => {
    const chapters = [makeChapter({ title: 'Recap', startTime: 500, endTime: 600 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('RECAP')
  })

  it('определяет RECAP по названию "Previously"', () => {
    const chapters = [makeChapter({ title: 'Previously on...', startTime: 0, endTime: 60 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('RECAP')
  })

  it('определяет PREVIEW по названию "Preview"', () => {
    const chapters = [makeChapter({ title: 'Preview', startTime: 940, endTime: 1000 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('PREVIEW')
  })

  it('определяет PREVIEW по названию "Next episode"', () => {
    const chapters = [makeChapter({ title: 'Next episode', startTime: 940, endTime: 1000 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('PREVIEW')
  })

  it('определяет OP по позиции и длительности (начало, 60-150 сек) без названия', () => {
    const chapters = [makeChapter({ title: 'Часть 1', startTime: 0, endTime: 90 })]
    const result = detectChapterTypes(chapters, 1400)
    expect(result[0].type).toBe('OP')
  })

  it('определяет ED по позиции и длительности (конец, 60-150 сек) без названия', () => {
    const chapters = [makeChapter({ title: 'Часть N', startTime: 1320, endTime: 1400 })]
    const result = detectChapterTypes(chapters, 1400)
    expect(result[0].type).toBe('ED')
  })

  it('падает в CHAPTER если ничего не подошло', () => {
    const chapters = [makeChapter({ title: 'Средняя часть', startTime: 500, endTime: 700 })]
    const result = detectChapterTypes(chapters, 1400)
    expect(result[0].type).toBe('CHAPTER')
  })

  it('не определяет OP по позиции, если длительность вне диапазона 60-150 сек', () => {
    const chapters = [makeChapter({ title: 'Слишком короткая', startTime: 0, endTime: 30 })]
    const result = detectChapterTypes(chapters, 1400)
    expect(result[0].type).toBe('CHAPTER')
  })

  it('обрабатывает пустой массив глав', () => {
    expect(detectChapterTypes([], 1000)).toEqual([])
  })

  it('обрабатывает несколько глав одновременно, каждую независимо', () => {
    const chapters = [
      makeChapter({ title: 'Opening', startTime: 0, endTime: 90 }),
      makeChapter({ title: 'Средняя часть', startTime: 90, endTime: 1300 }),
      makeChapter({ title: 'Ending', startTime: 1300, endTime: 1400 }),
    ]
    const result = detectChapterTypes(chapters, 1400)
    expect(result.map((c) => c.type)).toEqual(['OP', 'CHAPTER', 'ED'])
  })

  it('приоритет названия выше приоритета позиции — короткая глава с "OP" в начале всё равно OP', () => {
    const chapters = [makeChapter({ title: 'OP', startTime: 0, endTime: 10 })]
    const result = detectChapterTypes(chapters, 1000)
    expect(result[0].type).toBe('OP')
  })
})
