#!/usr/bin/env bun
// Сторож против дрейфа установленных pre-commit хуков submodule.
//
// Зачем: scripts/hooks/install.sh копирует текущий набор `_pre-commit-*.sh` в
// `.git/modules/<sm_path>/hooks/` (или `<sm_path>/.git/hooks/` для nested-repo
// submodule) ОДИН РАЗ, в момент запуска. Это не симлинк — новый скрипт,
// добавленный в scripts/hooks/ позже, не появляется в уже установленных копиях
// сам. 2026-09-01 это привело к тому, что pre-commit-schema-migration-check.sh
// не сработал в domwellbes на структурном изменении schema.zmodel без миграции —
// коммит прошёл чисто, прод получил 500 из-за отсутствующей таблицы. Тот же
// день нашёл ещё три отставших submodule (aboi, driving-school, dsperevod).
// Разбор — .claude/docs/precommit-hook-install-staleness.md, PLAN-INFRA-4.md §135.
//
// Что делает: для каждого выкаченного submodule находит его git-dir
// (`git rev-parse --git-dir`), читает установленный `hooks/pre-commit`, и
// сравнивает список вызываемых там `_pre-commit-*.sh` с актуальным списком,
// который `scripts/hooks/install.sh` копирует сейчас. Расхождение — набор
// устарел, независимо от того, когда submodule в последний раз клонировался.
//
// Что НЕ делает: ничего не чинит. Фикс один и тот же для любой находки —
// `bash scripts/hooks/install.sh --all-submodules` — печатается в подсказке.
//
// Использование: bun scripts/check-precommit-hook-staleness.mjs
// Код возврата: всегда 0 — это warn, не gate (см. шапку scripts/check-all.mjs).
// Накопленный долг: submodule без хуков вообще (никогда не проходил install.sh)
// и submodule с отставшим набором — обе находки одного типа, разгребаются одним
// прогоном install.sh, блокировать ими весь прогон check-all смысла нет.
//
// ⚠️ В CI это не запускается: приватные submodule там намеренно не выкачиваются
// (см. шапку .github/workflows/ci.yml), а на пустом каталоге сравнивать нечего.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Пути submodule из .gitmodules — порядок как в файле. */
function readSubmodulePaths() {
  const text = readFileSync(join(repoRoot, '.gitmodules'), 'utf8')
  return [...text.matchAll(/^\s*path\s*=\s*(.+)$/gm)].map((m) => m[1].trim())
}

/**
 * Актуальный список `_pre-commit-*.sh`, которые install.sh копирует в hooks_dir
 * сейчас. Источник истины — сами `cp ... "$hooks_dir/_pre-commit-XXX.sh"` строки,
 * не список в шапке-комментарии: комментарий может отстать от кода так же, как
 * установленная копия отстаёт от install.sh (это и есть предмет проверки).
 */
function readExpectedScripts() {
  const text = readFileSync(join(repoRoot, 'scripts/hooks/install.sh'), 'utf8')
  const names = new Set()
  for (const m of text.matchAll(/_pre-commit-[\w-]+\.sh/g)) {
    names.add(m[0])
  }
  return [...names].sort()
}

/** git-dir выкаченного submodule, либо null если не инициализирован. */
function gitDirOf(absPath) {
  try {
    return execFileSync('git', ['-C', absPath, 'rev-parse', '--absolute-git-dir'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return null
  }
}

const expected = readExpectedScripts()
if (expected.length === 0) {
  console.error('⛔ не нашёл ни одного _pre-commit-*.sh в scripts/hooks/install.sh — сам regex сломан?')
  process.exit(0)
}

const rows = []
const skipped = []

for (const path of readSubmodulePaths()) {
  const abs = join(repoRoot, path)

  if (!existsSync(join(abs, '.git'))) {
    skipped.push({ path, why: 'не выкачан' })
    continue
  }

  const gitDir = gitDirOf(abs)
  if (!gitDir) {
    skipped.push({ path, why: 'git-репозиторий не найден' })
    continue
  }

  const hookFile = join(gitDir, 'hooks', 'pre-commit')
  if (!existsSync(hookFile)) {
    rows.push({ path, missing: expected, installed: false })
    continue
  }

  const installed = readFileSync(hookFile, 'utf8')
  const missing = expected.filter((name) => !installed.includes(name))
  if (missing.length > 0) {
    rows.push({ path, missing, installed: true })
  }
}

if (rows.length === 0) {
  console.log(`✅ установленные pre-commit хуки актуальны во всех проверенных submodule (${expected.length} скриптов ожидается)`)
} else {
  const pad = Math.max(...rows.map((r) => r.path.length))
  console.log(`⚠️  ${rows.length} submodule с устаревшим или отсутствующим набором pre-commit хуков:\n`)
  for (const { path, missing, installed } of rows) {
    const label = installed ? 'не хватает' : 'хук не установлен вовсе, отсутствует'
    console.log(`  ${path.padEnd(pad)}  ${label}: ${missing.join(', ')}`)
  }
  console.log(
    '\nПричина: install.sh копирует текущий набор скриптов в hooks/ один раз при запуске — это\n'
      + 'не симлинк, поэтому новый скрипт в scripts/hooks/ не появляется в уже установленных копиях\n'
      + 'сам (.claude/docs/precommit-hook-install-staleness.md).\n\n'
      + 'Чинится одной командой из корня letar:\n'
      + '  bash scripts/hooks/install.sh --all-submodules',
  )
}

if (skipped.length > 0) {
  console.log('\nпропущено:')
  for (const { path, why } of skipped) {
    console.log(`  ${path} — ${why}`)
  }
}

// warn: находка — накопленный долг, чинится одной командой, не блокирует прогон.
process.exit(0)
