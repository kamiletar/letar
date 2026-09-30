import type { DocHit, FormHit, ScoutResult, ToolHit } from './search'
import { truncate } from './sources'

export const BRIEF_HEADER = 'подсказка скаута; не по теме — игнорируй'

export interface BriefOptions {
  /** Длина аннотации одного пункта */
  summaryChars?: number
}

function docLine(doc: DocHit, summaryChars: number): string {
  const star = doc.star ? ' ⭐' : ''
  const section = doc.section ? ` § ${doc.section}` : ''
  return `- ${doc.path}:${doc.line}${star}${section} — ${truncate(doc.summary, summaryChars)}`
}

function toolHow(tool: ToolHit): string {
  if (tool.kind === 'skill') {
    return `скил \`${tool.name}\` (Skill)`
  }
  if (tool.kind === 'command') {
    return `команда \`/${tool.name}\``
  }
  return `субагент \`${tool.name}\` (Agent)`
}

function fieldLine(field: FormHit): string {
  return `- \`${field.name}\` — ${truncate(field.summary, 120)} (${field.path}:${field.line})`
}

/** Короткое имя поля для строки владельца: `Form.Field.Date` → `Date` */
function shortField(name: string): string {
  return name.replace(/^Form\.(Field|Document)\./, '')
}

/** Полная справка для агента. Пустая строка — сказать нечего, хук молчит */
export function formatBrief(result: ScoutResult, options: BriefOptions = {}): string {
  const { summaryChars = 250 } = options
  if (!result.docs.length && !result.traps.length && !result.tool && !result.fields.length && !result.pattern) {
    return ''
  }
  const lines = [BRIEF_HEADER]
  if (result.fields.length) {
    lines.push('Поля формы (@letar/forms):', ...result.fields.map(fieldLine))
  }
  if (result.pattern) {
    const { name, summary } = result.pattern
    lines.push(`Паттерн формы: \`${name}\` — ${truncate(summary, 160)}; код — MCP \`get_form_pattern("${name}")\``)
  }
  if (result.docs.length) {
    lines.push('Доки:', ...result.docs.map((d) => docLine(d, summaryChars)))
  }
  if (result.traps.length) {
    lines.push('Ловушки ⚠️:', ...result.traps.map((d) => docLine(d, summaryChars)))
  }
  if (result.tool) {
    lines.push(`Инструмент: ${toolHow(result.tool)} — ${truncate(result.tool.summary, 200)} (${result.tool.path})`)
  }
  return lines.join('\n')
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few
  }
  return many
}

/** Одна строка для владельца: что скаут подсунул агенту */
export function formatOneLine(result: ScoutResult): string {
  const parts: string[] = []
  const docs = result.docs.length
  const traps = result.traps.length
  if (docs) {
    parts.push(`${docs} ${plural(docs, 'док', 'дока', 'доков')}`)
  }
  if (traps) {
    parts.push(`${traps} ${plural(traps, 'ловушка', 'ловушки', 'ловушек')}`)
  }
  if (result.fields.length) {
    parts.push(`поля ${result.fields.map((f) => shortField(f.name)).join(', ')}`)
  }
  if (result.pattern) {
    parts.push(`паттерн ${result.pattern.name}`)
  }
  if (result.tool) {
    const { kind, name } = result.tool
    parts.push(kind === 'skill' ? `скил ${name}` : kind === 'command' ? `команда /${name}` : `агент ${name}`)
  }
  return parts.length ? `🔎 скаут: ${parts.join(', ')}` : ''
}
