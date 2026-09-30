export interface Frontmatter {
  data: Record<string, string>
  /** Номер строки (с 1), с которой начинается тело после frontmatter */
  bodyLine: number
  body: string
}

/**
 * Минимальный разбор YAML-frontmatter скилов, команд, агентов и правил:
 * `key: value`, кавычки и блочные значения `key: |` / `key: >`.
 * Полный YAML здесь не нужен — только плоские строковые поля.
 */
export function parseFrontmatter(source: string): Frontmatter {
  const lines = source.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return { data: {}, bodyLine: 1, body: source }
  }
  const end = lines.indexOf('---', 1)
  if (end === -1) {
    return { data: {}, bodyLine: 1, body: source }
  }
  const data: Record<string, string> = {}
  let blockKey: string | undefined
  let blockLines: string[] = []
  const flush = () => {
    if (blockKey) {
      data[blockKey] = blockLines.join('\n').trim()
    }
    blockKey = undefined
    blockLines = []
  }
  for (const line of lines.slice(1, end)) {
    if (blockKey && (/^\s/.test(line) || line === '')) {
      blockLines.push(line.trim())
      continue
    }
    flush()
    const match = /^([\w-]+):\s*(.*)$/.exec(line)
    if (!match) {
      continue
    }
    const [, key, raw] = match
    const value = raw.trim()
    if (value === '|' || value === '>' || value === '|-' || value === '>-') {
      blockKey = key
      continue
    }
    data[key] = value.replace(/^(['"])(.*)\1$/, '$2')
  }
  flush()
  return { data, bodyLine: end + 2, body: lines.slice(end + 1).join('\n') }
}
