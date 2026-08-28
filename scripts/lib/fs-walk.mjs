// Общий рекурсивный обход каталога для скриптов scripts/*.mjs — с ограничением
// глубины и пропуском служебных директорий (node_modules, .next, dist, out,
// .git, .nx). Вынесено из трёх независимых копий одной и той же функции
// (check-lib-subpath-paths.mjs, add-lib-tsconfig-path.mjs, check-better-auth-schema.mjs).

import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'out', '.git', '.nx'])

// Возвращает список абсолютных путей к файлам, для которых predicate(entryName, fullPath)
// вернул true. depth — сколько уровней вложенности ещё можно спускаться (0 — только dir сам).
export function walk(dir, predicate, depth, skipDirs = DEFAULT_SKIP_DIRS) {
  const found = []
  if (depth < 0) { return found }
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const entry of entries) {
    if (skipDirs.has(entry)) { continue }
    const fullPath = path.join(dir, entry)
    let stats
    try {
      stats = statSync(fullPath)
    } catch {
      continue
    }
    if (stats.isDirectory()) {
      found.push(...walk(fullPath, predicate, depth - 1, skipDirs))
    } else if (predicate(entry, fullPath)) {
      found.push(fullPath)
    }
  }
  return found
}
