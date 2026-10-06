#!/usr/bin/env bun
// Проверяет, что блок `workspaces` в bun.lock совпадает с package.json каждого
// workspace-пакета: поле `version`, четыре карты зависимостей и состав самих
// workspace-путей.
//
// Зачем: `bun install --frozen-lockfile` на сервере (deploy-affected.sh) падает
// при ЛЮБОМ расхождении — даже когда «разошлась» одна строка version у пакета,
// который деплой вообще не касается. Падает не приложение-виновник, а вся очередь
// деплоев сразу. Ни typecheck, ни lint, ни build локально этого не видят — только
// сам bun и только на сервере (.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md).
//
// Три источника дрейфа, ни один из которых не ловится обычным воркфлоу:
//   1. Бамп `version` в package.json (app-workflow.md § «После завершения задачи»,
//      шаг 5) без последующего `bun install` — самый частый.
//   2. Бамп версии ВНУТРИ приватного submodule: `bun.lock` живёт в корне letar, а
//      submodule — отдельный репозиторий; коммит в нём физически не может включить
//      правку корневого lock. Следом идёт `chore: bump <submodule>` в letar, и
//      lock обновляют, только если про него вспомнят.
//   3. `bun install`, запущенный в дереве с чужим незакоммиченным WIP, записывает в
//      lock ЧУЖОЕ состояние (2026-09-21: libs/deploy-mcp получил 0.4.1 при
//      package.json 0.5.0 — lock оказался хуже коммитного). Поэтому эта проверка
//      сверяет lock именно с package.json, а не со «свежим bun install».
//
// Что НЕ проверяется: раздел `packages` (резолв внешних зависимостей) — он
// меняется только реальным `bun install` и от дрейфа version не страдает.
//
// Три режима — откуда брать «состояние»:
//   (по умолчанию) --worktree  рабочее дерево: ручной прогон «что у меня на диске».
//   --index                    записанное в ИНДЕКСЕ: bun.lock, корневой и обычные
//                              package.json — из индекса, package.json приватного
//                              submodule — по gitlink-SHA из индекса. Для pre-commit.
//   --ref=<коммит>             то же, но по коммиту (pre-push: вершина пушимого диапазона).
// Зачем git-режимы: в общем чекауте у submodule в рабочем дереве часто лежит версия НОВЕЕ
// записанного в letar SHA (2026-10-06: чужие расхождения блокировали правильный коммит lock,
// и гейт приходилось отключать целиком). Деплой на сервере видит именно записанное состояние.
//
// Код возврата 1 — есть расхождения. Всё, чего не удалось прочитать (submodule не выкачан,
// в нём нет объекта записанного SHA), — не ошибка, но печатается вслух как «неполное покрытие»:
// молчаливый пропуск читался бы как «проверено и чисто» (.claude/docs/verification-pitfalls.md).

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

/** bun.lock — JSONC: хвостовые запятые. Срезаем их перед JSON.parse. */
export function parseLock(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'))
}

function diffDeps(pkgDeps = {}, lockDeps = {}) {
  const out = []
  for (const name of new Set([...Object.keys(pkgDeps), ...Object.keys(lockDeps)])) {
    if (pkgDeps[name] !== lockDeps[name]) {
      out.push(`${name}: package.json=${pkgDeps[name] ?? '—'} lock=${lockDeps[name] ?? '—'}`)
    }
  }
  return out
}

/**
 * Чистая сверка — не знает, откуда пришли данные.
 *
 * @param {object} p
 * @param {Record<string, any>} p.lockWorkspaces блок `workspaces` из bun.lock
 * @param {(path: string) => ({ pkg: object } | { skip: string } | null)} p.readPackage
 *   package.json workspace-пути: `{pkg}` прочитан, `{skip: причина}` прочитать не вышло
 *   (неполное покрытие), `null` — пакета в источнике нет вовсе
 * @param {Iterable<string>} p.discovered workspace-пути, существующие в источнике (для «нет записи в lock»)
 * @param {boolean} [p.absentIsProblem] `null` из readPackage — расхождение (git-режимы знают дерево целиком),
 *   а не «не выкачано» (рабочее дерево)
 */
export function compareLock({ lockWorkspaces, readPackage, discovered, absentIsProblem = false }) {
  const problems = []
  const skipped = []
  let checked = 0

  for (const [path, entry] of Object.entries(lockWorkspaces)) {
    const label = path === '' ? '(корень)' : path
    const res = readPackage(path)
    if (res === null) {
      if (absentIsProblem) {
        problems.push(`${label}: запись в bun.lock есть, пакета в дереве нет`)
      } else {
        skipped.push({ path, reason: 'package.json не выкачан — приватный submodule?' })
      }
      continue
    }
    if ('skip' in res) {
      skipped.push({ path, reason: res.skip })
      continue
    }
    checked++
    const { pkg } = res

    // Корень bun в блоке workspaces пишет без version всегда — это не расхождение.
    if (path !== '' && pkg.version !== entry.version) {
      problems.push(`${label}: version package.json=${pkg.version ?? '—'} lock=${entry.version ?? '—'}`)
    }
    for (const field of DEP_FIELDS) {
      for (const line of diffDeps(pkg[field], entry[field])) {
        problems.push(`${label}: ${field} — ${line}`)
      }
    }
  }

  // Workspace есть в источнике, а в lock его нет (новый пакет без `bun install`).
  for (const path of discovered) {
    if (!(path in lockWorkspaces)) {
      problems.push(`${path}: package.json есть, записи в bun.lock нет`)
    }
  }

  return { problems, skipped, checked }
}

// ───────────────────────── источники данных ─────────────────────────

// maxBuffer: листинг дерева libs/apps — десятки тысяч путей, дефолтных 1 МБ не хватает (ENOBUFS).
const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 512 * 1024 * 1024 })

/**
 * Содержимое объектов по спецификациям (`HEAD:path`, `:path`, `<sha>^{commit}`) одним процессом.
 * Отсутствующий объект — null.
 */
export function catBatch(cwd, specs) {
  if (specs.length === 0) { return [] }
  const buf = execFileSync('git', ['cat-file', '--batch'], {
    cwd,
    input: specs.join('\n') + '\n',
    stdio: ['pipe', 'pipe', 'ignore'],
    maxBuffer: 512 * 1024 * 1024,
  })
  const out = []
  let pos = 0
  for (let i = 0; i < specs.length; i++) {
    const eol = buf.indexOf(0x0a, pos)
    const header = buf.toString('utf8', pos, eol)
    pos = eol + 1
    if (header.endsWith(' missing') || header.endsWith(' ambiguous')) {
      out.push(null)
      continue
    }
    const size = Number(header.split(' ')[2])
    out.push(buf.toString('utf8', pos, pos + size))
    pos += size + 1
  }
  return out
}

/** Только `/*`-глобы: ровно то, что используют workspaces корня. */
function globBases(rootPkg) {
  return (rootPkg.workspaces ?? []).filter((g) => g.endsWith('/*')).map((g) => g.slice(0, -2))
}

/** Источник «рабочее дерево». */
function worktreeSource(repoRoot) {
  const readText = (rel) => readFileSync(join(repoRoot, rel), 'utf8')
  const rootPkg = JSON.parse(readText('package.json'))
  return {
    lockText: readText('bun.lock'),
    rootPkg,
    absentIsProblem: false,
    discovered() {
      const found = new Set()
      for (const base of globBases(rootPkg)) {
        let entries
        try {
          entries = readdirSync(join(repoRoot, base), { withFileTypes: true })
        } catch {
          continue
        }
        for (const e of entries) {
          if (e.isDirectory() && existsSync(join(repoRoot, base, e.name, 'package.json'))) {
            found.add(`${base}/${e.name}`)
          }
        }
      }
      return found
    },
    readPackage(path) {
      const pkgPath = join(repoRoot, path, 'package.json')
      return existsSync(pkgPath) ? { pkg: JSON.parse(readFileSync(pkgPath, 'utf8')) } : null
    },
  }
}

/** Разбор `git ls-files -s` / `git ls-tree -r` в Map путь → { mode, sha }. */
export function parseTreeListing(text, format) {
  const map = new Map()
  for (const line of text.split('\n')) {
    if (!line) { continue }
    const tab = line.indexOf('\t')
    if (tab < 0) { continue }
    const meta = line.slice(0, tab).split(' ')
    // ls-files -s: <mode> <sha> <stage>; ls-tree: <mode> <type> <sha>
    const [mode, sha] = format === 'index' ? [meta[0], meta[1]] : [meta[0], meta[2]]
    map.set(line.slice(tab + 1), { mode, sha })
  }
  return map
}

/** Источник «записанное состояние git»: индекс (`ref` = null) либо коммит. */
function gitSource(repoRoot, ref) {
  const spec = (rel) => (ref === null ? `:${rel}` : `${ref}:${rel}`)
  const show = (rel) => git(repoRoot, ['show', spec(rel)])
  const rootPkg = JSON.parse(show('package.json'))
  const bases = globBases(rootPkg)
  // Листинг только нужных уровней, не `-r` по всему apps/libs: рекурсивный обход — ~5 с на pre-commit.
  let tree
  if (ref === null) {
    tree = parseTreeListing(
      git(repoRoot, [
        'ls-files',
        '-s',
        '--',
        ...bases.flatMap((b) => [`:(glob)${b}/*`, `:(glob)${b}/*/package.json`]),
      ]),
      'index',
    )
  } else {
    // Шаг 1: содержимое `base/` (подкаталоги и gitlink'и submodule). Шаг 2: package.json подкаталогов — одним вызовом.
    tree = parseTreeListing(git(repoRoot, ['ls-tree', ref, ...bases.map((b) => `${b}/`)]), 'tree')
    const dirs = [...tree].filter(([, v]) => v.mode === '040000').map(([p]) => `${p}/package.json`)
    if (dirs.length > 0) {
      for (const [p, v] of parseTreeListing(git(repoRoot, ['ls-tree', ref, '--', ...dirs]), 'tree')) { tree.set(p, v) }
    }
  }

  // Один `git cat-file --batch` на репозиторий вместо ~140 процессов: на Windows запуск git ~40 мс.
  const cache = new Map()
  let prefetched = false
  const prefetch = () => {
    if (prefetched) { return }
    prefetched = true
    const plain = []
    for (const [path, { mode }] of tree) {
      if (mode !== '160000' && path.endsWith('/package.json')) { plain.push(path.slice(0, -'/package.json'.length)) }
    }
    const blobs = catBatch(repoRoot, plain.map((p) => spec(`${p}/package.json`)))
    plain.forEach((p, i) => cache.set(p, blobs[i] === null ? null : { pkg: JSON.parse(blobs[i]) }))

    for (const [path, { mode, sha }] of tree) {
      if (mode !== '160000') { continue }
      // Submodule: package.json — по SHA, записанному в letar, а не по тому, что лежит в его рабочем дереве.
      const dir = join(repoRoot, path)
      const short = sha.slice(0, 9)
      if (!existsSync(join(dir, '.git'))) {
        cache.set(path, { skip: `submodule не выкачан (записан ${short})` })
        continue
      }
      let commit, file
      try {
        ;[commit, file] = catBatch(dir, [`${sha}^{commit}`, `${sha}:package.json`])
      } catch {
        commit = null
      }
      if (commit === null) {
        cache.set(path, { skip: `в локальном submodule нет объекта ${short} (git -C ${path} fetch)` })
      } else if (file === null) {
        cache.set(path, { skip: `в ${short} нет package.json` })
      } else {
        cache.set(path, { pkg: JSON.parse(file) })
      }
    }
  }

  return {
    lockText: show('bun.lock'),
    rootPkg,
    absentIsProblem: true,
    discovered() {
      const found = new Set()
      for (const base of bases) {
        const prefix = `${base}/`
        for (const [path, { mode }] of tree) {
          if (!path.startsWith(prefix)) { continue }
          const rest = path.slice(prefix.length)
          if (mode === '160000' && !rest.includes('/')) {
            found.add(path)
          } else if (rest.endsWith('/package.json') && rest.split('/').length === 2) {
            found.add(path.slice(0, -'/package.json'.length))
          }
        }
      }
      return found
    },
    readPackage(path) {
      if (path === '') { return { pkg: rootPkg } }
      prefetch()
      return cache.get(path) ?? null
    },
  }
}

/** Точка входа для тестов и хуков: источник + сверка. */
export function checkLockVersions(source) {
  const lock = parseLock(source.lockText)
  const lockWorkspaces = lock.workspaces ?? {}
  const result = compareLock({
    lockWorkspaces,
    readPackage: (p) => source.readPackage(p),
    discovered: source.discovered(),
    absentIsProblem: source.absentIsProblem,
  })
  return { ...result, total: Object.keys(lockWorkspaces).length }
}

export function makeSource(mode, repoRoot) {
  if (mode.kind === 'index') { return gitSource(repoRoot, null) }
  if (mode.kind === 'ref') { return gitSource(repoRoot, mode.ref) }
  return worktreeSource(repoRoot)
}

export function parseArgs(argv) {
  let mode = { kind: 'worktree' }
  for (const a of argv) {
    if (a === '--index') { mode = { kind: 'index' } }
    else if (a === '--worktree') { mode = { kind: 'worktree' } }
    else if (a.startsWith('--ref=')) { mode = { kind: 'ref', ref: a.slice(6) } }
  }
  return mode
}

function main() {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  // Хуки передают корень явно: копия скрипта может лежать в .git/hooks, а не в scripts/.
  const repoRoot = process.env.LOCK_CHECK_REPO_ROOT ?? defaultRoot
  const mode = parseArgs(process.argv.slice(2))
  const modeLabel = mode.kind === 'index'
    ? 'индекс'
    : mode.kind === 'ref'
    ? `коммит ${mode.ref.slice(0, 9)}`
    : 'рабочее дерево'

  let res
  try {
    res = checkLockVersions(makeSource(mode, repoRoot))
  } catch (e) {
    console.log(`❌ не удалось прочитать состояние (${modeLabel}): ${e.message.split('\n')[0]}`)
    process.exit(2)
  }
  const { problems, skipped, checked, total } = res

  if (skipped.length > 0) {
    console.log(`ℹ️  неполное покрытие — не проверено ${skipped.length} из ${total} workspace (${modeLabel}):`)
    for (const s of skipped) { console.log(`   • ${s.path}: ${s.reason}`) }
  }

  if (problems.length === 0) {
    console.log(`✅ bun.lock согласован с package.json (${modeLabel}, проверено ${checked} workspace)`)
    process.exit(0)
  }

  console.log(`❌ bun.lock расходится с package.json (${modeLabel}) — ${problems.length} расхождений:`)
  for (const p of problems) { console.log(`   • ${p}`) }
  console.log(`
Деплой ЛЮБОГО приложения упадёт на \`bun install --frozen-lockfile\` (весь workspace, не одно приложение).
Что делать: bun install --lockfile-only  — но ТОЛЬКО в чистом дереве. В дереве с чужим WIP lock
запишет чужие версии (там это уже случалось); сверяй диф lock построчно с package.json.
Если расхождение из-за bump'а внутри приватного submodule — сначала запушь submodule
(bash scripts/check-submodule-push-state.sh), lock коммить только вместе с уже валидным SHA.
Разбор: .claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md`)
  process.exit(1)
}

// Запуск как скрипта (bun/node), но не при import из тестов.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
