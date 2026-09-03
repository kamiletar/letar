#!/usr/bin/env bun
// Сверяет счётные утверждения в .claude/docs с фактическим состоянием репозитория.
//
// Зачем: аудит 2026-09-03 (коммит 6fb3f93d) нашёл семь устаревших абсолютных
// утверждений вида «единственное приложение», «все 44 библиотеки», «19 приложений
// на пресете» — доки фиксировали число как факт, число менялось, доки нет. Шесть
// из семи оказались обычными счётчиками, воспроизводимыми одной командой
// (`grep -l ... | wc -l`) — то есть автоматизируемыми. Седьмое (замкнутость
// семантического контракта Chakra в chakra-semantic-token-contract.md) —
// качественная оценка, грепом не проверяется, и намеренно не аннотируется.
//
// Пока эта проверка писалась, число из webpack-only-app-silent-export-drift.md
// (только что исправленное на 14) успело устареть ещё раз — стало 15. Это не
// довод против проверки, а довод за неё: ручной аудит не держит темп сам по себе.
//
// Как это работает: рядом с числом в тексте дока ставится HTML-комментарий вида
//   <!-- doc-count: {"cmd": "grep -rl 'theme:check' apps/*/project.json | wc -l", "expect": 4} -->
// Команда выполняется тем же бинарником bash, которым уже пользуются
// check-electron-drift.sh и check-submodule-push-state.sh в этом же раннере —
// не через `git grep`, который не заходит в submodule
// (.claude/docs/verification-pitfalls.md § «grep по копиям репо» — обратный
// случай той же ловушки, здесь про git grep, а не про worktree-копии).
//
// Аннотировать стоит ТОЛЬКО счётные/перечислимые утверждения с командой,
// которая уже приведена в тексте самого дока — не выдумывать новую метрику
// ради галочки. Качественные оценки («контракт замкнут», «паттерн общий для
// всех») не аннотируются вообще: у них нет способа фолсифицироваться грепом,
// а ложное чувство «это тоже проверяется» хуже отсутствия проверки.
//
// Использование: bun scripts/check-doc-counts.mjs
// Зарегистрирована в check-all.mjs уровнем `warn`: расхождение счётчика —
// повод перечитать абзац и поправить число, а не сигнал сломанной сборки.

import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = join(repoRoot, '.claude', 'docs')

const MARKER_RE = /<!--\s*doc-count:\s*(\{.*?\})\s*-->/g

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length
}

const files = readdirSync(docsDir).filter((f) => f.endsWith('.md'))

let checked = 0
let mismatches = 0
let errors = 0

for (const file of files) {
  const path = join(docsDir, file)
  const text = readFileSync(path, 'utf8')
  for (const match of text.matchAll(MARKER_RE)) {
    let spec
    try {
      spec = JSON.parse(match[1])
    } catch (e) {
      console.error(`❌ ${file}:${lineNumberAt(text, match.index)} — битый JSON в doc-count: ${e.message}`)
      errors++
      continue
    }
    if (typeof spec.cmd !== 'string' || spec.expect === undefined) {
      console.error(`❌ ${file}:${lineNumberAt(text, match.index)} — doc-count без обязательных полей cmd/expect`)
      errors++
      continue
    }
    checked++
    // Команда — строка из markdown-файла этого же репозитория (не внешний ввод),
    // выполняется через bash -c ровно так же, как остальные .sh-проверки в
    // check-all.mjs — им тоже нужен пайплайн (grep | wc -l), не голый бинарник.
    const res = spawnSync('bash', ['-c', spec.cmd], { cwd: repoRoot, encoding: 'utf8' })
    if (res.error || res.status !== 0) {
      console.error(`❌ ${file}:${lineNumberAt(text, match.index)} — команда упала: ${spec.cmd}`)
      console.error(`   ${res.error?.message ?? res.stderr}`)
      errors++
      continue
    }
    const actual = res.stdout.trim()
    const expected = String(spec.expect)
    if (actual !== expected) {
      console.error(
        `❌ ${file}:${
          lineNumberAt(text, match.index)
        } — расхождение: команда \`${spec.cmd}\` вернула ${actual}, в тексте ${expected}`,
      )
      mismatches++
    }
  }
}

console.log(`\nПроверено аннотаций: ${checked}`)
if (mismatches > 0 || errors > 0) {
  console.error(`Расхождений: ${mismatches}, ошибок разбора: ${errors}`)
  process.exit(1)
}
console.log('Все счётные утверждения совпадают с фактическим состоянием репозитория')
process.exit(0)
