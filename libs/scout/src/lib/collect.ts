import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { docCards, type IndexEntry, parseIndexEntries, toolCard, type ToolKind } from './sources'
import type { Card } from './types'

const DOCS_DIR = '.claude/docs'
const RULES_DIR = '.claude/rules'

/** Служебные файлы каталога доков: сами по себе не док */
const SKIP_DOC_FILES = new Set(['INDEX.md', 'README.md'])

function read(root: string, path: string): string | undefined {
  const full = join(root, path)
  return existsSync(full) ? readFileSync(full, 'utf8') : undefined
}

function listMarkdown(root: string, dir: string): string[] {
  const full = join(root, dir)
  if (!existsSync(full)) {
    return []
  }
  return readdirSync(full, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !SKIP_DOC_FILES.has(e.name))
    .map((e) => `${dir}/${e.name}`)
}

function listToolFiles(root: string, kind: ToolKind): Array<{ path: string; name: string }> {
  if (kind === 'skill') {
    const dir = '.claude/skills'
    const full = join(root, dir)
    if (!existsSync(full)) {
      return []
    }
    return readdirSync(full, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(full, e.name, 'SKILL.md')))
      .map((e) => ({ path: `${dir}/${e.name}/SKILL.md`, name: e.name }))
  }
  const dir = kind === 'command' ? '.claude/commands' : '.claude/agents'
  return listMarkdown(root, dir).map((path) => ({ path, name: path.replace(/^.*\//, '').replace(/\.md$/, '') }))
}

/**
 * Все карточки монорепо: доки `.claude/docs` (без `external/`) и доки из INDEX.md вне его,
 * правила, скилы, команды, субагенты. Корпус — только `.claude/` и то, на что ссылается индекс.
 */
export function collectCards(root: string): Card[] {
  const entries = new Map<string, IndexEntry>()
  for (const entry of parseIndexEntries(read(root, `${DOCS_DIR}/INDEX.md`) ?? '')) {
    entries.set(entry.path, entry)
  }
  const short = new Map<string, string>()
  for (const entry of parseIndexEntries(read(root, 'CLAUDE.md') ?? '')) {
    short.set(entry.path, entry.annotation)
  }
  const docPaths = new Set([...listMarkdown(root, DOCS_DIR), ...listMarkdown(root, RULES_DIR)])
  for (const path of entries.keys()) {
    if (path.endsWith('.md') && !path.startsWith(`${DOCS_DIR}/external/`)) {
      docPaths.add(path)
    }
  }
  const cards: Card[] = []
  for (const path of [...docPaths].sort()) {
    const markdown = read(root, path)
    if (markdown === undefined) {
      continue
    }
    cards.push(...docCards({ path, markdown, entry: entries.get(path), shortAnnotation: short.get(path) }))
  }
  for (const kind of ['skill', 'command', 'agent'] as const) {
    for (const { path, name } of listToolFiles(root, kind)) {
      const markdown = read(root, path)
      if (markdown === undefined) {
        continue
      }
      const card = toolCard(kind, path, markdown, name)
      if (kind === 'command' && existsSync(join(root, 'apps', name))) {
        card.scope = 'app'
      }
      cards.push(card)
    }
  }
  return cards
}
