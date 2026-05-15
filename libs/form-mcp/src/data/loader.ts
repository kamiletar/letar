import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Documentation file names -> keys */
const DOC_FILES = {
  fields: 'fields.md',
  'form-level': 'form-level.md',
  'schema-generation': 'schema-generation.md',
  offline: 'offline.md',
  i18n: 'i18n.md',
  zenstack: 'zenstack.md',
  'api-reference': 'api-reference.md',
} as const

export type DocKey = keyof typeof DOC_FILES

/** Document section parsed from markdown */
export interface DocSection {
  heading: string
  level: number
  content: string
}

/** Result of loading all documents */
export interface LoadedDocs {
  /** Full text of each document */
  raw: Record<DocKey, string>
  /** Sections of each document (by H2/H3) */
  sections: Record<DocKey, DocSection[]>
}

/** Parses markdown into sections by H2/H3 headings */
export function parseMarkdownSections(markdown: string): DocSection[] {
  const lines = markdown.split('\n')
  const sections: DocSection[] = []
  let current: DocSection | null = null

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/)
    const h3Match = line.match(/^### (.+)/)

    if (h2Match || h3Match) {
      if (current) {
        current.content = current.content.trimEnd()
        sections.push(current)
      }
      current = {
        heading: (h2Match?.[1] ?? h3Match?.[1])!,
        level: h2Match ? 2 : 3,
        content: '',
      }
    } else if (current) {
      current.content += line + '\n'
    }
  }

  if (current) {
    current.content = current.content.trimEnd()
    sections.push(current)
  }

  return sections
}

/** Loads all documentation files from the specified directory */
export function loadDocs(docsPath: string): LoadedDocs {
  const raw = {} as Record<DocKey, string>
  const sections = {} as Record<DocKey, DocSection[]>

  for (const [key, filename] of Object.entries(DOC_FILES)) {
    const filePath = join(docsPath, filename)
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      raw[key as DocKey] = content
      sections[key as DocKey] = parseMarkdownSections(content)
    } else {
      raw[key as DocKey] = ''
      sections[key as DocKey] = []
    }
  }

  return { raw, sections }
}
