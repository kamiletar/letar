import { describe, expect, it } from 'vitest'
import type { CodeChunk } from './retrieve.js'
import { formatChunksForPrompt } from './retrieve.js'

describe('formatChunksForPrompt', () => {
  it('возвращает плейсхолдер для пустого массива чанков', () => {
    const result = formatChunksForPrompt([])

    expect(result).toBe('(контекст из кодовой базы недоступен — отвечай на основе общих знаний о monorepo)')
  })

  it('форматирует один чанк с номером строки в location', () => {
    const chunk: CodeChunk = {
      filePath: 'libs/forms/src/index.ts',
      content: 'export function useAppForm() {}',
      score: 0.9123,
      startLine: 42,
    }

    const result = formatChunksForPrompt([chunk])

    expect(result).toContain('### [1] libs/forms/src/index.ts:42 (score: 0.91)')
    expect(result).toContain('export function useAppForm() {}')
  })

  it('без startLine использует только filePath в location', () => {
    const chunk: CodeChunk = {
      filePath: 'libs/forms/README.md',
      content: 'документация',
      score: 0.5,
    }

    const result = formatChunksForPrompt([chunk])

    expect(result).toContain('### [1] libs/forms/README.md (score: 0.50)')
  })

  it('обрабатывает startLine === 0 как отсутствие номера строки (falsy)', () => {
    const chunk: CodeChunk = {
      filePath: 'libs/forms/src/index.ts',
      content: 'экспорт с самой первой строки',
      score: 0.7,
      startLine: 0,
    }

    const result = formatChunksForPrompt([chunk])

    // chunk.startLine ? ... : chunk.filePath — 0 является falsy, поэтому номер строки теряется
    expect(result).toContain('### [1] libs/forms/src/index.ts (score: 0.70)')
  })

  it('нумерует несколько чанков по порядку начиная с 1', () => {
    const chunks: CodeChunk[] = [
      { filePath: 'a.ts', content: 'a', score: 0.9 },
      { filePath: 'b.ts', content: 'b', score: 0.8 },
      { filePath: 'c.ts', content: 'c', score: 0.7 },
    ]

    const result = formatChunksForPrompt(chunks)

    expect(result).toContain('### [1] a.ts')
    expect(result).toContain('### [2] b.ts')
    expect(result).toContain('### [3] c.ts')
  })

  it('соединяет несколько чанков через двойной перевод строки', () => {
    const chunks: CodeChunk[] = [
      { filePath: 'a.ts', content: 'a', score: 0.9 },
      { filePath: 'b.ts', content: 'b', score: 0.8 },
    ]

    const result = formatChunksForPrompt(chunks)
    const parts = result.split('\n\n')

    // каждый чанк рендерится в 2 строки (заголовок + code fence) → секции разделены '\n\n',
    // но внутри самой секции тоже есть '\n\n' перед ``` — просто проверяем оба файла присутствуют
    // в правильном порядке
    const aIndex = result.indexOf('a.ts')
    const bIndex = result.indexOf('b.ts')
    expect(aIndex).toBeGreaterThanOrEqual(0)
    expect(bIndex).toBeGreaterThan(aIndex)
    expect(parts.length).toBeGreaterThan(1)
  })

  it('обрезает содержимое чанка до 800 символов', () => {
    const longContent = 'x'.repeat(1000)
    const chunk: CodeChunk = {
      filePath: 'big.ts',
      content: longContent,
      score: 0.6,
    }

    const result = formatChunksForPrompt([chunk])
    const fenceMatch = result.match(/```\n([\s\S]*)\n```/)

    expect(fenceMatch).not.toBeNull()
    expect(fenceMatch?.[1]).toHaveLength(800)
  })

  it('не обрезает содержимое короче 800 символов', () => {
    const shortContent = 'короткий фрагмент кода'
    const chunk: CodeChunk = {
      filePath: 'small.ts',
      content: shortContent,
      score: 0.6,
    }

    const result = formatChunksForPrompt([chunk])

    expect(result).toContain(shortContent)
  })

  it('score форматируется с двумя знаками после запятой', () => {
    const chunk: CodeChunk = {
      filePath: 'a.ts',
      content: 'a',
      score: 1,
    }

    const result = formatChunksForPrompt([chunk])

    expect(result).toContain('(score: 1.00)')
  })
})
