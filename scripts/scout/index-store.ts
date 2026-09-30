import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { buildIndex, collectCards, INDEX_VERSION, type ScoutIndex } from '../../libs/scout/src/index'
import { scoutHome } from './paths'

/** Индекс на корень: worktree и основной чекаут не затирают друг другу файл (`C:\x` и `c:/x` — один корень) */
export function indexPath(home: string, root: string): string {
  const key = resolve(root).replaceAll('\\', '/').toLowerCase()
  return join(home, `index-${createHash('sha1').update(key).digest('hex').slice(0, 8)}.json`)
}

/** Корень репозитория: ближайший каталог вверх с `nx.json` и `.claude/` */
export function findRepoRoot(start = process.cwd()): string | undefined {
  let dir = start
  for (;;) {
    if (existsSync(join(dir, 'nx.json')) && existsSync(join(dir, '.claude'))) {
      return dir
    }
    const up = dirname(dir)
    if (up === dir) {
      return undefined
    }
    dir = up
  }
}

/** Самое свежее изменение среди источников индекса — дешёвый stat без чтения файлов */
export function sourcesMtime(root: string): number {
  let latest = 0
  const touch = (path: string) => {
    if (existsSync(path)) {
      latest = Math.max(latest, statSync(path).mtimeMs)
    }
  }
  touch(join(root, 'CLAUDE.md'))
  // Справка по формам: README и реестр паттернов form-mcp — отдельными файлами, доки — каталогом
  touch(join(root, 'libs/forms/README.md'))
  touch(join(root, 'libs/form-mcp/src/data/pattern-registry.ts'))
  for (const dir of ['.claude/docs', '.claude/rules', '.claude/commands', '.claude/agents', 'libs/forms/docs']) {
    const full = join(root, dir)
    if (existsSync(full)) {
      touch(full)
      for (const entry of readdirSync(full, { withFileTypes: true })) {
        touch(join(full, entry.name))
        // Команды лежат ещё и в подкаталогах первого уровня (`/audit:security-check`)
        if (dir === '.claude/commands' && entry.isDirectory()) {
          for (const nested of readdirSync(join(full, entry.name))) {
            touch(join(full, entry.name, nested))
          }
        }
      }
    }
  }
  const skills = join(root, '.claude/skills')
  if (existsSync(skills)) {
    touch(skills)
    for (const name of readdirSync(skills)) {
      touch(join(skills, name, 'SKILL.md'))
    }
  }
  return latest
}

export function loadIndex(home: string, root: string): ScoutIndex | undefined {
  const path = indexPath(home, root)
  if (!existsSync(path)) {
    return undefined
  }
  try {
    const index = JSON.parse(readFileSync(path, 'utf8')) as ScoutIndex
    return index.version === INDEX_VERSION ? index : undefined
  } catch {
    return undefined
  }
}

/** Запись через временный файл и rename — хук никогда не прочитает половину индекса */
export function saveIndex(index: ScoutIndex, home: string, root: string): string {
  const path = indexPath(home, root)
  mkdirSync(home, { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(index))
  renameSync(tmp, path)
  return path
}

export interface RebuildResult {
  rebuilt: boolean
  cards: number
  ms: number
  path: string
}

/** Пересобрать индекс; с `ifStale` — только если источники новее индекса */
export function rebuildIndex(root: string, options: { ifStale?: boolean; home?: string } = {}): RebuildResult {
  const home = options.home ?? scoutHome()
  const started = performance.now()
  if (options.ifStale) {
    const current = loadIndex(home, root)
    if (current && Date.parse(current.builtAt) >= sourcesMtime(root)) {
      return {
        rebuilt: false,
        cards: current.cards.length,
        ms: performance.now() - started,
        path: indexPath(home, root),
      }
    }
  }
  const index = buildIndex(collectCards(root))
  const path = saveIndex(index, home, root)
  return { rebuilt: true, cards: index.cards.length, ms: performance.now() - started, path }
}
