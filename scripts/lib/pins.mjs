// Общие хелперы для скриптов, проверяющих точные пины версий в package.json —
// check-intentional-pins.mjs и check-pin-drift.mjs.
//
// Вынесено из двух независимых копий одной и той же логики (isExact, readJson,
// FIELDS) — оба скрипта читают package.json и реестр scripts/intentional-pins.json
// одинаково.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Поля package.json, в которых вообще ищем версии.
export const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies']

export function readJson(repoRoot, relPath) {
  return JSON.parse(readFileSync(join(repoRoot, relPath), 'utf8'))
}

// Точный пин — значение, начинающееся с цифры: «4.4.3», «0.87.1»,
// «2.0.0-rc.26», «3.3.0-nightly-20260824-5de6d2358». Всё остальное —
// диапазон (^ ~ >= *), алиас (npm:), workspace/file/git-спецификатор.
export function isExact(spec) {
  return typeof spec === 'string' && /^\d/.test(spec)
}
