import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadDocs, parseMarkdownSections } from './loader.js'

describe('parseMarkdownSections', () => {
  it('разбивает markdown на секции по заголовкам H2', () => {
    const markdown = ['## Первая секция', 'Текст первой секции.', '', '## Вторая секция', 'Текст второй секции.'].join(
      '\n',
    )
    const sections = parseMarkdownSections(markdown)
    expect(sections).toEqual([
      { heading: 'Первая секция', level: 2, content: 'Текст первой секции.' },
      { heading: 'Вторая секция', level: 2, content: 'Текст второй секции.' },
    ])
  })

  it('различает уровни H2 и H3', () => {
    const markdown = ['## Раздел', 'вступление', '### Подраздел', 'детали подраздела'].join('\n')
    const sections = parseMarkdownSections(markdown)
    expect(sections).toEqual([
      { heading: 'Раздел', level: 2, content: 'вступление' },
      { heading: 'Подраздел', level: 3, content: 'детали подраздела' },
    ])
  })

  it('текст до первого заголовка отбрасывается', () => {
    const markdown = ['Преамбула без заголовка', '## Секция', 'содержимое'].join('\n')
    const sections = parseMarkdownSections(markdown)
    expect(sections).toEqual([{ heading: 'Секция', level: 2, content: 'содержимое' }])
  })

  it('пустая строка даёт пустой массив секций', () => {
    expect(parseMarkdownSections('')).toEqual([])
  })

  it('обрезает конечные пустые строки в content', () => {
    const markdown = ['## Секция', 'строка 1', '', '', '## Следующая', 'x'].join('\n')
    const sections = parseMarkdownSections(markdown)
    expect(sections[0].content).toBe('строка 1')
  })
})

describe('loadDocs', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'form-mcp-docs-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('читает существующие файлы и парсит их на секции', () => {
    writeFileSync(join(dir, 'fields.md'), '## Текстовые поля\n| `Form.Field.String` | Текст |\n', 'utf-8')
    writeFileSync(join(dir, 'zenstack.md'), '## @form.title\nЗаголовок поля\n', 'utf-8')

    const docs = loadDocs(dir)

    expect(docs.raw.fields).toContain('Текстовые поля')
    expect(docs.sections.fields).toEqual([
      { heading: 'Текстовые поля', level: 2, content: '| `Form.Field.String` | Текст |' },
    ])
    expect(docs.sections.zenstack).toEqual([{ heading: '@form.title', level: 2, content: 'Заголовок поля' }])
  })

  it('для отсутствующих файлов возвращает пустую строку и пустой массив секций', () => {
    // Директория пуста — ни один из DOC_FILES не существует
    const docs = loadDocs(dir)

    expect(docs.raw.fields).toBe('')
    expect(docs.sections.fields).toEqual([])
    expect(docs.raw['api-reference']).toBe('')
    expect(docs.sections['api-reference']).toEqual([])
  })

  it('загружает только существующие файлы, остальные ключи остаются пустыми', () => {
    writeFileSync(join(dir, 'i18n.md'), '## Локализация\nПеревод сообщений об ошибках.\n', 'utf-8')

    const docs = loadDocs(dir)

    expect(docs.raw.i18n).toContain('Локализация')
    expect(docs.raw.offline).toBe('')
    expect(docs.sections.offline).toEqual([])
  })

  it('несуществующая директория не бросает исключение — все ключи пустые', () => {
    const missingDir = join(dir, 'does-not-exist')
    const docs = loadDocs(missingDir)
    expect(docs.raw.fields).toBe('')
    expect(docs.sections.fields).toEqual([])
  })
})
