#!/usr/bin/env node
// Ловит побочные .d.ts/.d.ts.map, которые typecheck:tsgo (typescript-go) иногда эмитит
// рядом с исходником в src/ вместо outDir, и которые кто-то по ошибке закоммитил.
//
// Не воспроизведено детерминированно на чистом дереве (см.
// .claude/docs/tsgo-stray-declarations.md) — поэтому единственная реальная защита не
// «почини баг tsgo», а «не дай артефакту доехать до git». .gitignore уже исключает
// **/src/**/*.d.ts.map, но НЕ *.d.ts — в src/ бывают легитимные рукописные ambient-
// декларации (css.d.ts, electron.d.ts и т.п.), которые матчить по расширению нельзя.
//
// Эвристика: артефакт tsgo всегда лежит рядом с одноимённым .ts/.tsx (index.ts →
// index.d.ts). Легитимный рукописный .d.ts описывает МОДУЛЬ БЕЗ СОБСТВЕННОЙ
// реализации — одноимённого .ts/.tsx источника у него нет. Проверено на всём
// репозитории (2026-09-06): 0 ложных срабатываний на существующих ambient-файлах,
// и это же правило поймало 2 уже закоммиченных артефакта в animatrona-e2e
// (app-launches.electron.spec.d.ts, empty-state.dev.spec.d.ts — оба с 69fdf2ea).
//
// Проверяет git-индекс (git ls-files), а не рабочее дерево — во время pre-commit это
// то, что реально попадёт в коммит; в CI на чистом checkout совпадает с HEAD.
// Untracked-артефакты от локального прогона typecheck:tsgo эта проверка не видит и
// не должна — это шум разработки, не риск коммита (чистка — команда из
// .claude/docs/tsgo-stray-declarations.md).
//
// Использование:
//   node scripts/check-stray-dts.mjs
//
// Exit code 0 — трекнутых артефактов нет. Exit code 1 — найдены (список в консоль,
// с готовой командой git rm --cached).

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

// НЕ резолвить repoRoot через путь этого файла (import.meta.url) — install.sh копирует
// чекер в .git/hooks/_check-stray-dts.mjs, и относительный путь "на уровень выше" там
// указывает на .git, а не на корень репозитория. git rev-parse работает из любого cwd
// внутри репозитория и не зависит от того, где физически лежит сам скрипт.
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()

function trackedFiles(pattern) {
  const out = execFileSync('git', ['ls-files', '-z', '--', pattern], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return out.split('\0').filter(Boolean)
}

const candidates = [
  ...trackedFiles('**/src/**/*.d.ts'),
  ...trackedFiles('**/src/**/*.d.ts.map'),
]

const stray = []
for (const relPath of candidates) {
  const isMap = relPath.endsWith('.d.ts.map')
  const base = relPath.slice(0, relPath.length - (isMap ? '.d.ts.map'.length : '.d.ts'.length))
  const hasSibling = existsSync(path.join(repoRoot, `${base}.ts`))
    || existsSync(path.join(repoRoot, `${base}.tsx`))
  if (hasSibling) {
    stray.push(relPath)
  }
}

if (stray.length === 0) {
  console.log('✅ трекнутых stray .d.ts/.d.ts.map не найдено')
  process.exit(0)
}

console.error(`❌ ${stray.length} трекнутых файл(а/ов) — похоже на артефакт typecheck:tsgo, не ручной код:\n`)
for (const f of stray) {
  console.error(`   ${f}`)
}
console.error('\n   Убери из git и удали (артефакт пересоздаётся сборкой, коммитить не нужно):')
console.error(`     git rm --cached -- ${stray.join(' ')}`)
console.error('     ' + stray.filter((f) => !f.endsWith('.map')).map((f) => `rm "${f}"`).join(' && '))
console.error('\n   Разбор: .claude/docs/tsgo-stray-declarations.md')
process.exit(1)
