#!/usr/bin/env bun

/**
 * Пересобирает зеркало `.agents/skills/` из `.claude/skills/`.
 *
 * `.agents/` читают сторонние агенты (Codex/ChatGPT), которые не понимают формат `.claude/`.
 * Каталог не коммитится (см. `.gitignore`), источник истины — `.claude/`. Скрипт делает зеркало
 * производным артефактом: любое расхождение лечится повторным запуском, а не ручной правкой.
 *
 * ⚠️ Зона полного контроля скрипта — `.agents/skills/`. Всё, чего нет в источнике, оттуда
 * удаляется. Править содержимое зеркала руками бессмысленно — правь `.claude/skills/`.
 *
 * Использование:
 *   bun scripts/sync-agent-skills.ts           # пересобрать зеркало
 *   bun scripts/sync-agent-skills.ts --check   # только проверить, exit 1 при расхождении
 */

import chalk from 'chalk'
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'fs/promises'
import { dirname, join, relative, resolve, sep } from 'path'

const REPO_ROOT = resolve(import.meta.dir, '..')
const SOURCE_SKILLS = join(REPO_ROOT, '.claude', 'skills')
const SOURCE_COMMANDS = join(REPO_ROOT, '.claude', 'commands')
const MIRROR_ROOT = join(REPO_ROOT, '.agents')
const MIRROR_SKILLS = join(MIRROR_ROOT, 'skills')

/**
 * Команды из `.claude/commands/`, которые дополнительно едут в зеркало как скиллы.
 *
 * Список унаследован от первой (ручной) версии зеркала — это общерепные воркфлоу, полезные
 * без Claude Code. Приложенческие команды (`/aboi`, `/studio` и прочие 50+) сюда сознательно
 * не входят: для стороннего агента это шум. Путь указывается без расширения, разделитель `/`.
 */
const MIGRATED_COMMANDS = ['repo', 'workflow/archive-completed', 'workflow/update-docs']

/** Памятка в корне зеркала — чтобы агент, открывший `.agents/`, знал, где источник. */
const README = `# .agents/ — генерируемое зеркало

Каталог собирается автоматически из \`.claude/\` для сторонних агентов (Codex/ChatGPT).

**Не редактируй файлы здесь — правки затрутся.** Источник истины:

- \`.agents/skills/<name>/\` ← \`.claude/skills/<name>/\` (копия один в один)
- \`.agents/skills/source-command-<slug>/\` ← \`.claude/commands/<slug>.md\`

После правки \`.claude/skills/\` пересобери зеркало:

\`\`\`bash
bun scripts/sync-agent-skills.ts
\`\`\`

Проверить, разошлось ли зеркало с источником: \`bun scripts/sync-agent-skills.ts --check\`.

Каталог в \`.gitignore\` — в репозиторий не едет.
`

/** Приводит путь к posix-виду, чтобы ключи набора не зависели от платформы. */
function toPosix(path: string): string {
  return path.split(sep).join('/')
}

/** Рекурсивно собирает относительные пути всех файлов каталога. */
async function collectFiles(dir: string, base: string = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) { files.push(...(await collectFiles(full, base))) }
    else if (entry.isFile()) { files.push(toPosix(relative(base, full))) }
  }

  return files
}

/** Отрезает YAML-frontmatter, возвращая описание и тело команды. */
function parseFrontmatter(raw: string): { description: string; body: string } {
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!frontmatter) { return { description: '', body: raw.replace(/^[\r\n]+/, '') } }

  const description = frontmatter[1].match(/^description:\s*(.*)$/m)?.[1]?.trim() ?? ''
  return { description, body: raw.slice(frontmatter[0].length).replace(/^[\r\n]+/, '') }
}

/** Собирает SKILL.md из команды — формат унаследован от первой версии зеркала. */
function renderCommandSkill(slug: string, description: string, body: string): string {
  const flatSlug = slug.replace(/\//g, '-')
  const name = `source-command-${flatSlug}`

  return [
    '---',
    `name: '${name}'`,
    // В YAML внутри одинарных кавычек апостроф экранируется удвоением
    `description: '${description.replace(/'/g, "''")}'`,
    '---',
    '',
    `# ${name}`,
    '',
    `Use this skill when the user asks to run the migrated source command \`${flatSlug}\`.`,
    '',
    '## Command Template',
    '',
    `${body.trimEnd()}\n`,
  ].join('\n')
}

/** Строит желаемое содержимое зеркала: ключ — путь относительно `.agents/`. */
async function buildDesired(): Promise<Map<string, Buffer>> {
  const desired = new Map<string, Buffer>()

  for (const rel of await collectFiles(SOURCE_SKILLS)) {
    desired.set(`skills/${rel}`, await readFile(join(SOURCE_SKILLS, rel)))
  }

  for (const slug of MIGRATED_COMMANDS) {
    const commandPath = join(SOURCE_COMMANDS, `${slug}.md`)
    if (!existsSync(commandPath)) {
      console.warn(chalk.yellow(`⚠ команда не найдена, пропускаю: .claude/commands/${slug}.md`))
      continue
    }

    const { description, body } = parseFrontmatter(await readFile(commandPath, 'utf8'))
    const name = `source-command-${slug.replace(/\//g, '-')}`
    desired.set(`skills/${name}/SKILL.md`, Buffer.from(renderCommandSkill(slug, description, body)))
  }

  desired.set('README.md', Buffer.from(README))

  return desired
}

/** Удаляет пустые каталоги снизу вверх, не трогая сам корень зеркала. */
async function pruneEmptyDirs(dir: string): Promise<boolean> {
  if (!existsSync(dir)) { return true }

  const entries = await readdir(dir, { withFileTypes: true })
  let empty = true

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!(await pruneEmptyDirs(join(dir, entry.name)))) { empty = false }
    } else {
      empty = false
    }
  }

  if (empty && dir !== MIRROR_SKILLS) { await rmdir(dir) }
  return empty
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes('--check')

  if (!existsSync(SOURCE_SKILLS)) {
    console.error(chalk.red('✖ нет каталога .claude/skills/ — нечего зеркалить'))
    process.exit(1)
  }

  const desired = await buildDesired()

  // Текущее состояние: удалять можно только внутри skills/, остальное в .agents/ не наше
  const existing = new Set<string>()
  if (existsSync(MIRROR_SKILLS)) {
    for (const rel of await collectFiles(MIRROR_SKILLS)) { existing.add(`skills/${rel}`) }
  }

  const written: string[] = []
  const removed: string[] = []

  for (const [rel, content] of desired) {
    const target = join(MIRROR_ROOT, rel)
    const current = existsSync(target) ? await readFile(target) : null

    if (current && current.equals(content)) { continue }

    written.push(rel)
    if (checkOnly) { continue }

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }

  for (const rel of existing) {
    if (desired.has(rel)) { continue }

    removed.push(rel)
    if (checkOnly) { continue }

    await rm(join(MIRROR_ROOT, rel))
  }

  if (!checkOnly && removed.length > 0) { await pruneEmptyDirs(MIRROR_SKILLS) }

  const total = desired.size
  const inSync = written.length === 0 && removed.length === 0

  if (checkOnly) {
    if (inSync) {
      console.log(chalk.green(`✓ зеркало .agents/ совпадает с .claude/ (${total} файлов)`))
      return
    }

    console.error(chalk.red('✖ зеркало .agents/ разошлось с .claude/'))
    for (const rel of written) { console.error(chalk.yellow(`  устарел или отсутствует: ${rel}`)) }
    for (const rel of removed) { console.error(chalk.yellow(`  лишний файл: ${rel}`)) }
    console.error(chalk.dim('\n  почини: bun scripts/sync-agent-skills.ts'))
    process.exit(1)
  }

  if (inSync) {
    console.log(chalk.green(`✓ зеркало .agents/ уже в актуальном состоянии (${total} файлов)`))
    return
  }

  for (const rel of written) { console.log(chalk.cyan(`  обновлён: ${rel}`)) }
  for (const rel of removed) { console.log(chalk.magenta(`  удалён:   ${rel}`)) }
  console.log(
    chalk.green(
      `✓ зеркало .agents/ пересобрано: ${written.length} записано, ${removed.length} удалено, всего ${total} файлов`,
    ),
  )
}

await main()
