import type { DocSection } from './loader.js'

/** Field categories */
export type FieldCategory =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'special'
  | 'survey'
  | 'table'
  | 'payment'
  | 'document'
  | 'utility'
  | 'security'

/** Field description in the registry */
export interface FieldInfo {
  /** Component name, e.g. "String" */
  name: string
  /** Full name, e.g. "Form.Field.String" */
  fullName: string
  /** Description */
  description: string
  /** Category */
  category: FieldCategory
  /** Detailed documentation (from H2 section below the table) */
  details?: string
}

/** Mapping of section headings -> categories */
const CATEGORY_MAP: Record<string, FieldCategory> = {
  'Текстовые поля': 'text',
  'Числовые поля': 'number',
  'Дата и время': 'date',
  'Выбор из списка': 'select',
  'Множественный выбор': 'multi-select',
  Специализированные: 'special',
  'Опросные поля': 'survey',
  'Табличные поля': 'table',
  'Платёжные поля': 'payment',
  'Защитные поля': 'security',
  'Утилитарные поля': 'utility',
  'Документные поля (Россия)': 'document',
}

/** Parses a markdown table row: | `Component` | Description | */
function parseTableRow(line: string): { component: string; description: string } | null {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/)
  if (!match) {
    return null
  }
  return { component: match[1], description: match[2] }
}

/** Extracts the short name from the full name: "Form.Field.String" -> "String" */
function shortName(fullName: string): string {
  const parts = fullName.split('.')
  return parts.at(-1) ?? fullName
}

/** Builds the field registry from fields.md sections */
export function buildFieldRegistry(fieldSections: DocSection[]): Map<string, FieldInfo> {
  const registry = new Map<string, FieldInfo>()
  /** Sections with detailed documentation (H2 with component name) */
  const detailSections = new Map<string, string>()

  // First pass: collect detail sections (e.g. "Form.Field.RichText — WYSIWYG editor")
  for (const section of fieldSections) {
    if (section.level === 2 && section.heading.includes('Form.Field.')) {
      const fieldMatch = section.heading.match(/Form\.Field\.(\w+)/)
      if (fieldMatch) {
        detailSections.set(fieldMatch[1], section.content)
      }
    }
  }

  // Second pass: parse tables from categories
  for (const section of fieldSections) {
    const category = CATEGORY_MAP[section.heading]
    if (!category) {
      continue
    }

    const lines = section.content.split('\n')
    for (const line of lines) {
      const row = parseTableRow(line)
      if (!row) {
        continue
      }

      const name = shortName(row.component)
      const info: FieldInfo = {
        name,
        fullName: row.component,
        description: row.description,
        category,
        details: detailSections.get(name),
      }
      registry.set(name.toLowerCase(), info)
    }
  }

  return registry
}

/** Returns all fields, optionally filtering by category */
export function getFields(registry: Map<string, FieldInfo>, category?: FieldCategory): FieldInfo[] {
  const all = Array.from(registry.values())
  if (!category) {
    return all
  }
  return all.filter((f) => f.category === category)
}
