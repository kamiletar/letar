import { parseFrontmatter } from './frontmatter'
import type { Card } from './types'

/** Запись индекса доков: `- [name](/path) [⭐|⚠️] аннотация` */
export interface IndexEntry {
  name: string
  path: string
  annotation: string
  star: boolean
  warn: boolean
  topic?: string
}

export interface DocSection {
  title: string
  level: number
  line: number
  body: string
}

const ENTRY_RE = /^- \[([^\]]+)\]\(\/?([^)\s]+)\)\s*(.*)$/
const STAR = '⭐'
const WARN_RE = /⚠️?/
const LEAD_MARKERS_RE = /^(\s*(⭐|⚠️?|✅|⛔)\s*)+/u

/** Длина summary у секции: хватает, чтобы понять, про что она */
const SECTION_SUMMARY_CHARS = 240

/** Разбор INDEX.md или карты в CLAUDE.md: одна запись на строку-ссылку, с разделом `## …` */
export function parseIndexEntries(markdown: string): IndexEntry[] {
  const entries: IndexEntry[] = []
  let topic: string | undefined
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^#{2,3}\s+(.+)$/.exec(line)
    if (heading) {
      topic = stripMarkdown(heading[1])
      continue
    }
    const match = ENTRY_RE.exec(line)
    if (!match) {
      continue
    }
    const [, name, path, rest] = match
    // Флаги — только маркеры в начале аннотации; ⚠️ в середине текста — упоминание, не флаг
    const markers = LEAD_MARKERS_RE.exec(rest)?.[0] ?? ''
    const star = markers.includes(STAR)
    const warn = WARN_RE.test(markers)
    const annotation = stripMarkdown(rest.slice(markers.length))
    entries.push({ name, path, annotation, star, warn, topic })
  }
  return entries
}

/** Заголовки markdown с номерами строк; блоки кода пропускаются */
export function parseSections(markdown: string): DocSection[] {
  const lines = markdown.split(/\r?\n/)
  const sections: DocSection[] = []
  let inFence = false
  let current: DocSection | undefined
  let bodyLines: string[] = []
  const flush = () => {
    if (current) {
      current.body = bodyLines.join('\n').trim()
      sections.push(current)
    }
  }
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      bodyLines.push(line)
      return
    }
    const heading = inFence ? null : /^(#{1,4})\s+(.+?)\s*#*$/.exec(line)
    if (heading) {
      flush()
      current = { title: stripMarkdown(heading[2]), level: heading[1].length, line: i + 1, body: '' }
      bodyLines = []
      return
    }
    bodyLines.push(line)
  })
  flush()
  return sections
}

/** Убирает разметку ссылок и выделения, оставляя читаемый текст */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Обрезка по границе слова с многоточием */
export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/, '')}…`
}

/** Первый абзац обычного текста — для доков без записи в INDEX.md */
function firstParagraph(sections: DocSection[]): string {
  for (const section of sections) {
    const paragraph = section.body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith('```') && !p.startsWith('|'))
    if (paragraph) {
      return stripMarkdown(paragraph.replace(/^>\s?/gm, ''))
    }
  }
  return ''
}

export interface DocInput {
  /** Путь от корня репозитория */
  path: string
  markdown: string
  /** Развёрнутая запись INDEX.md */
  entry?: IndexEntry
  /** Короткая строка карты в CLAUDE.md */
  shortAnnotation?: string
}

/** Карточки одного дока: сам док и его секции со ссылкой на строку */
export function docCards(input: DocInput): Card[] {
  const { path, markdown, entry, shortAnnotation } = input
  const sections = parseSections(markdown)
  const slug = path.replace(/^.*\//, '').replace(/\.md$/, '')
  const h1 = sections.find((s) => s.level === 1)?.title ?? slug
  const annotation = entry?.annotation || shortAnnotation || firstParagraph(sections)
  const headings = sections.filter((s) => s.level > 1).map((s) => s.title).join('. ')
  const kind = path.startsWith('.claude/rules/') ? 'rule' : 'doc'
  const cards: Card[] = [{
    id: `${kind}:${path}`,
    kind,
    path,
    line: 1,
    title: slug,
    summary: annotation || h1,
    star: entry?.star || undefined,
    warn: entry?.warn || undefined,
    topic: entry?.topic,
    fields: [
      { text: `${slug.replace(/-/g, ' ')} ${h1}`, weight: 3 },
      { text: `${shortAnnotation ?? ''} ${annotation}`, weight: 2 },
      { text: `${entry?.topic ?? ''} ${headings}`, weight: 1 },
    ],
  }]
  for (const section of sections) {
    if (section.level === 1 || !section.body) {
      continue
    }
    cards.push({
      id: `sec:${path}:${section.line}`,
      kind: 'section',
      path,
      line: section.line,
      title: section.title,
      summary: truncate(stripMarkdown(section.body.replace(/```[\s\S]*?```/g, ' ')), SECTION_SUMMARY_CHARS),
      warn: entry?.warn || undefined,
      topic: slug,
      fields: [
        { text: `${section.title} ${slug.replace(/-/g, ' ')}`, weight: 2 },
        { text: section.body, weight: 1 },
      ],
    })
  }
  return cards
}

export type ToolKind = 'skill' | 'command' | 'agent'

/** Карточка скила, команды или субагента из frontmatter */
export function toolCard(kind: ToolKind, path: string, markdown: string, fallbackName: string): Card {
  const { data, body } = parseFrontmatter(markdown)
  const name = data.name || fallbackName
  const heading = parseSections(body).find((s) => s.level === 1)?.title ?? ''
  const description = stripMarkdown(data.description ?? '') || heading
  return {
    id: `${kind}:${name}`,
    kind,
    path,
    line: 1,
    title: name,
    summary: description,
    fields: [
      { text: `${name.replace(/[-:]/g, ' ')} ${heading}`, weight: 3 },
      { text: description, weight: 2 },
    ],
  }
}
