#!/usr/bin/env bun
// Сторож против брошенных git worktree фоновых агентов (Agent tool с
// isolation: "worktree") и осиротевших веток `worktree-agent-*`.
//
// Зачем: харнесс удаляет каталог worktree автоматически только если тот НЕ
// изменился с момента создания — а ветку `worktree-agent-*`, на которую
// worktree указывал, не подчищает вовсе, даже в этом случае. В C:\web\letar
// накопились каталоги двухнедельной давности плюс ветки без каталогов —
// разбор: PLAN-INFRA-4.md §120. Вред двойной: каждый каталог — полная копия
// монорепо (диск), и он засоряет `grep -r`/поиск по репозиторию устаревшим
// содержимым (в разборе — 9 ложных попаданий на состояние PLAN-INFRA.md ДО
// разрезания на части).
//
// Что делает: смотрит `git worktree list` и `git branch --list
// 'worktree-agent-*'`, ищет то, что старше STALE_DAYS, и печатает, что с этим
// можно сделать. НИЧЕГО не удаляет — worktree может держать незакоммиченную
// работу параллельного агента, а `git worktree remove --force` необратим.
//
// ⚠️ Проверка «есть ли уникальная работа» — через `git log
// origin/main..<ref>`, а НЕ через `git diff --stat origin/main..<ref>`.
// Двухточечный diff между разошедшимися ветками показывает ВЕСЬ прогресс
// main как «удаления» стороны ветки — сотни тысяч строк на ветке, которая
// реально добавила пять файлов. `git log` считает только коммиты, реально
// принадлежащие ветке.
//
// ⚠️ Свежая параллельная работа не должна выглядеть мусором из-за имени —
// фильтр только по возрасту HEAD, не по префиксу пути/ветки. Активная сессия
// с worktree младше STALE_DAYS не попадёт в отчёт.
//
// Не делает fetch — сверяет с тем, что локально известно как origin/main на
// момент запуска. Свежий `git fetch` перед прогоном — на усмотрение вызывающего.
//
// Использование: bun scripts/check-stale-worktrees.mjs
// Код возврата: 1, если нашлось что-то с потенциально уникальной работой
// (незакоммиченные изменения или коммиты вне origin/main). Чистые хвосты без
// такой работы — предупреждение с кодом 0, иначе сторож валит check-all на
// безобидном мусоре, который снести можно не глядя.

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// Порог «заброшенности». 7 дней — по образцу разбора в PLAN-INFRA-4.md §120,
// где найденные каталоги были двухнедельной давности; неделя даёт запас на
// многодневную, но всё ещё активную задачу.
const STALE_DAYS = 7
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function gitOrNull(args, cwd = repoRoot) {
  try {
    return git(args, cwd)
  } catch {
    return null
  }
}

/** Разбор `git worktree list --porcelain` в массив {path, head, branch}. */
function parseWorktrees(porcelain) {
  const entries = []
  let current = null
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) { entries.push(current) }
      current = { path: line.slice('worktree '.length).trim(), head: null, branch: null }
    } else if (line.startsWith('HEAD ')) {
      if (current) { current.head = line.slice('HEAD '.length).trim() }
    } else if (line.startsWith('branch ')) {
      if (current) { current.branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '') }
    }
  }
  if (current) { entries.push(current) }
  return entries
}

/** Unix-время (мс) коммита `ref` внутри репозитория `cwd`, либо null. */
function commitTimeMs(ref, cwd) {
  const ts = gitOrNull(['log', '-1', '--format=%ct', ref], cwd)
  return ts ? Number(ts) * 1000 : null
}

const worktreesDir = resolve(repoRoot, '.claude', 'worktrees')
const isUnderWorktreesDir = (p) => resolve(p).startsWith(worktreesDir + sep)

const originMainKnown = gitOrNull(['rev-parse', '--verify', 'origin/main']) !== null

// ─────────────────────────────────────────────────────────────────────────────
// 1. Worktree в .claude/worktrees/ старше порога

const allWorktrees = parseWorktrees(git(['worktree', 'list', '--porcelain']))
const candidateWorktrees = allWorktrees.filter((w) => isUnderWorktreesDir(w.path))

const staleWorktrees = []
for (const w of candidateWorktrees) {
  const headMs = commitTimeMs('HEAD', w.path)
  if (headMs === null) { continue } // не удалось прочитать HEAD — не наш случай, пропускаем молча
  const ageMs = Date.now() - headMs
  if (ageMs < STALE_MS) { continue }

  const uncommitted = gitOrNull(['status', '--porcelain'], w.path)
  const hasUncommitted = Boolean(uncommitted && uncommitted.length > 0)

  let commitsAhead = []
  if (originMainKnown) {
    const log = gitOrNull(['log', '--oneline', 'origin/main..HEAD'], w.path)
    commitsAhead = log ? log.split('\n').filter(Boolean) : []
  }

  staleWorktrees.push({
    path: w.path,
    branch: w.branch,
    ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
    hasUncommitted,
    commitsAhead,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ветки worktree-agent-*, которым не соответствует ни один worktree

const branchLines = gitOrNull(['branch', '--list', 'worktree-agent-*']) ?? ''
const allBranchNames = branchLines
  .split('\n')
  .map((l) => l.replace(/^\*?\s+/, '').trim())
  .filter(Boolean)

const worktreeBranches = new Set(allWorktrees.map((w) => w.branch).filter(Boolean))
const orphanBranches = []
for (const branch of allBranchNames) {
  if (worktreeBranches.has(branch)) { continue } // за веткой стоит живой worktree — не сирота

  let commitsAhead = []
  if (originMainKnown) {
    const log = gitOrNull(['log', '--oneline', `origin/main..${branch}`])
    commitsAhead = log ? log.split('\n').filter(Boolean) : []
  }
  orphanBranches.push({ branch, commitsAhead })
}

// ─────────────────────────────────────────────────────────────────────────────
// Отчёт

let hasUniqueWork = false

if (staleWorktrees.length === 0 && orphanBranches.length === 0) {
  console.log(
    `✅ нет брошенных worktree в .claude/worktrees/ (старше ${STALE_DAYS} дн.) `
      + `и осиротевших веток worktree-agent-*`,
  )
  process.exit(0)
}

if (!originMainKnown) {
  console.log('⚠️  origin/main не резолвится локально — проверка "коммиты вне origin/main" пропущена\n')
}

if (staleWorktrees.length > 0) {
  console.log(`⚠️  ${staleWorktrees.length} устаревших worktree (старше ${STALE_DAYS} дн.):\n`)
  for (const w of staleWorktrees) {
    const flags = []
    if (w.hasUncommitted) { flags.push('незакоммиченные изменения') }
    if (w.commitsAhead.length > 0) { flags.push(`${w.commitsAhead.length} коммит(ов) вне origin/main`) }
    const unique = flags.length > 0
    if (unique) { hasUniqueWork = true }

    console.log(`  ${w.path}`)
    console.log(`    ветка: ${w.branch ?? '(detached)'}, возраст HEAD: ${w.ageDays} дн.`)
    console.log(`    ${unique ? '⚠️  ' + flags.join(', ') : '✅ уникальной работы не найдено'}`)
    console.log(`    команда: git worktree remove --force "${w.path}"`)
    console.log('')
  }
}

if (orphanBranches.length > 0) {
  console.log(`⚠️  ${orphanBranches.length} осиротевших веток worktree-agent-* (без своего worktree):\n`)
  for (const b of orphanBranches) {
    const unique = b.commitsAhead.length > 0
    if (unique) { hasUniqueWork = true }

    console.log(`  ${b.branch}`)
    console.log(
      `    ${
        unique
          ? `⚠️  ${b.commitsAhead.length} коммит(ов) вне origin/main`
          : '✅ чистый указатель, коммитов вне origin/main нет'
      }`,
    )
    console.log(`    команда: git branch -D ${b.branch}`)
    console.log('')
  }
}

console.log(
  'Команды выше — только предложение. Скрипт ничего не удаляет: рядом могут\n'
    + 'работать другие агенты, и потеря чужой незакоммиченной работы необратима.\n'
    + 'Выполняй вручную, проверив содержимое каждого worktree/ветки самостоятельно.',
)

if (hasUniqueWork) {
  console.log('\n❌ найдено потенциально уникальной работы — разберись перед удалением')
  process.exit(1)
}

console.log('\n✅ всё найденное — чистые хвосты без уникальной работы, удалять можно не глядя')
process.exit(0)
