// Общие хелперы для скриптов, обходящих submodule из .gitmodules.
//
// Вынесено из check-submodule-gitignore.mjs и check-precommit-hook-staleness.mjs —
// оба парсили .gitmodules одним и тем же регексом и одинаково определяли,
// выкачен ли submodule (PLAN-INFRA-4.md §135, устранение дублирования).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Пути submodule из .gitmodules репозитория `repoRoot` — порядок как в файле. */
export function readSubmodulePaths(repoRoot) {
  const text = readFileSync(join(repoRoot, '.gitmodules'), 'utf8')
  return [...text.matchAll(/^\s*path\s*=\s*(.+)$/gm)].map((m) => m[1].trim())
}

/** Выкачен ли submodule по абсолютному пути `absPath` (есть ли `.git`). */
export function isCheckedOut(absPath) {
  return existsSync(join(absPath, '.git'))
}
