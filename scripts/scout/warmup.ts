#!/usr/bin/env bun
/**
 * Фоновое обновление скаута, всё fail-open: ничего не печатает, код выхода всегда 0.
 * Запускается отсоединённым процессом (`requestVectorRefresh`) при старте сессии и при устаревших векторах:
 * 1. пересобирает индекс, если источники новее;
 * 2. будит эмбеддер запросом «прогрев» (GPU и модель после простоя отвечают долго);
 * 3. досчитывает векторы карточек, у которых их нет или хеш текста другой.
 *
 * Запуск: bun scripts/scout/warmup.ts
 */
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { collectCards, embedTexts } from '../../libs/scout/src/index'
import { freshIndex } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutHome } from './paths'
import { buildVectors, EMBED_URL, loadVectorStore, staleCards, vectorsLockPath } from './vectors'

/** Блокировка моложе этого срока — пересчёт уже идёт */
const LOCK_TTL_MS = 15 * 60 * 1000

/** Карточки, чьи векторы обязаны быть актуальными */
const VECTOR_KINDS = ['field', 'pattern', 'doc', 'rule', 'section'] as const

/** Взять блокировку: `wx`; моложе 15 минут — занято, старше — перезаписываем */
function takeLock(path: string): boolean {
  mkdirSync(dirname(path), { recursive: true })
  try {
    writeFileSync(path, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    try {
      if (Date.now() - statSync(path).mtimeMs < LOCK_TTL_MS) {
        return false
      }
      writeFileSync(path, String(process.pid))
      return true
    } catch {
      return false
    }
  }
}

try {
  const root = findRepoRoot(process.cwd())
  if (root) {
    const home = scoutHome()
    freshIndex(root, home)
    await embedTexts(['прогрев'], { url: EMBED_URL, timeoutMs: 5000 })
    const cards = collectCards(root)
    if (staleCards(cards, loadVectorStore(home), VECTOR_KINDS).length) {
      const lock = vectorsLockPath(home)
      if (takeLock(lock)) {
        try {
          await buildVectors(cards, EMBED_URL, home, () => {})
        } finally {
          if (existsSync(lock)) {
            rmSync(lock, { force: true })
          }
        }
      }
    }
  }
} catch {
  // fail-open: прогрев — удобство
}
process.exit(0)
