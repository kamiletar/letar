#!/usr/bin/env bun
/**
 * Сборка индекса скаута в `SCOUT_HOME/index.json`.
 *
 * Запуск: bun scripts/scout/build-index.ts [--if-stale]
 * `--if-stale` — выйти сразу, если доки, правила, скилы, команды и агенты не менялись с прошлой сборки
 * (так его зовёт SessionStart-хук, отдельным процессом без ожидания).
 */
import { findRepoRoot, rebuildIndex } from './index-store'

const root = findRepoRoot()
if (!root) {
  console.error('Не найден корень репозитория (nx.json + .claude/)')
  process.exit(1)
}
const result = rebuildIndex(root, { ifStale: process.argv.includes('--if-stale') })
console.log(
  result.rebuilt
    ? `Индекс собран: ${result.cards} карточек за ${Math.round(result.ms)} мс → ${result.path}`
    : `Индекс свежий (${result.cards} карточек), пересборка не нужна`,
)
