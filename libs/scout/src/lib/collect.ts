import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  docCards,
  fieldCatalogCards,
  type IndexEntry,
  parseIndexEntries,
  patternCard,
  type PatternInput,
  toolCard,
  type ToolKind,
} from './sources'
import type { Card } from './types'

const DOCS_DIR = '.claude/docs'
const RULES_DIR = '.claude/rules'

/** Документация библиотеки форм: поля и паттерны — отдельные карточки, доки — как обычные */
const FORMS_DOCS_DIR = 'libs/forms/docs'
const FORMS_README = 'libs/forms/README.md'
const FIELD_CATALOG = `${FORMS_DOCS_DIR}/fields.md`
const PATTERN_REGISTRY = 'libs/form-mcp/src/data/pattern-registry.ts'

/**
 * Русские описания паттернов реестра form-mcp: в реестре они английские, а BM25 по-русски их не
 * найдёт. Новый паттерн без подсказки всё равно попадёт в индекс — с английским описанием;
 * дымовая проверка `scripts/scout/smoke.ts` напоминает дописать строку.
 */
export const PATTERN_HINTS: Record<string, string> = {
  'crud-create': 'форма создания новой записи, добавление',
  'crud-edit': 'форма редактирования существующей записи, начальные значения, сохранение изменений',
  'multi-step': 'многошаговая форма, пошаговый мастер, визард, шаги оформления',
  offline: 'офлайн-форма без интернета, отправка позже, синхронизация очереди',
  i18n: 'перевод и локализация формы, несколько языков',
  'from-schema': 'форма из Zod-схемы, поля генерируются автоматически по схеме',
  declarative: 'декларативная форма, поля из конфигурации',
  'server-action': 'отправка формы в server action, сохранение на сервере',
  analytics: 'аналитика формы, цели Метрики, отслеживание заполнения и отказов',
  'server-errors': 'ошибки с сервера под полями формы, серверная валидация',
  'undo-redo': 'отмена и повтор правок в форме, история изменений',
  'reference-select': 'выбор связанной записи из справочника, поиск по длинному списку, подгрузка вариантов',
  'reference-zenstack': 'выбор связанной модели ZenStack из базы, relation',
  'dependent-select': 'зависимые списки: страна, затем город, каскадный выбор',
}

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
  const docPaths = new Set([
    ...listMarkdown(root, DOCS_DIR),
    ...listMarkdown(root, RULES_DIR),
    ...listMarkdown(root, FORMS_DOCS_DIR),
    FORMS_README,
  ])
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
  const catalog = read(root, FIELD_CATALOG)
  if (catalog !== undefined) {
    cards.push(...fieldCatalogCards(FIELD_CATALOG, catalog))
  }
  const registry = read(root, PATTERN_REGISTRY)
  if (registry !== undefined) {
    cards.push(
      ...parsePatternRegistry(PATTERN_REGISTRY, registry).map((p) =>
        patternCard({ ...p, hint: PATTERN_HINTS[p.name] })
      ),
    )
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

/**
 * Паттерны из реестра form-mcp читаются как текст, без импорта библиотеки: объект начинается строкой
 * `    name: 'x'`, за ней `title` и `description` в одинарных кавычках.
 */
export function parsePatternRegistry(path: string, source: string): PatternInput[] {
  const lines = source.split(/\r?\n/)
  const patterns: PatternInput[] = []
  lines.forEach((line, i) => {
    const name = line.match(/^ {4}name: '([\w-]+)'/)?.[1]
    if (!name) {
      return
    }
    const next = lines.slice(i + 1, i + 6).join('\n')
    const title = next.match(/^ {4}title: '([^']*)'/m)?.[1]
    // Длинное описание переносится на следующую строку: `description:\n      '…'`
    const description = next.match(/^ {4}description:\s*'([^']*)'/m)?.[1]
    if (title && description) {
      patterns.push({ name, title, description, path, line: i + 1 })
    }
  })
  return patterns
}
