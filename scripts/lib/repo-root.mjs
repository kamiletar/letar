// Общий resolver корня репозитория для скриптов scripts/*.mjs.
//
// Вынесено из трёх независимых копий (check-section-numbers.mjs, next-section-number.mjs,
// check-stray-dts.mjs). Все три копировались install.sh в .git/hooks/_*.mjs для
// pre-commit-хуков — относительный путь от import.meta.url там ломается (скрипт лежит в
// .git/hooks, а не в исходном scripts/), поэтому единственный надёжный способ найти корень —
// спросить git, а не path.resolve(scriptDir, '..').
//
// Используем execFileSync из node:child_process (не Bun.spawnSync) — доступен и под bun,
// и под node, поэтому один хелпер годится для обоих рантаймов.

import { execFileSync } from 'node:child_process'

export function repoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
}
