#!/usr/bin/env bun
/**
 * Эталон «какой инструмент подходит к задаче» для замера выбора инструмента скаутом.
 *
 * `goldTools` в `eval-cases.jsonl` — это то, что агент вызвал; вызовов мало (агенты редко зовут скилы),
 * поэтому по ним нельзя сравнивать поиски. Здесь — разметка судьёй по всем задачам набора.
 *
 * `--prepare` — кандидаты (`tool-candidates.json`) и пачки задач без подсказок (`tool-gold-batches/NN.md`):
 * ни выдачи поиска, ни `goldTools` в пачки не попадает, разметка идёт вслепую.
 * `--check <a.jsonl> <b.jsonl>` — согласованность двух разметок («пусто/не пусто» и первый инструмент).
 * `--recheck-sample` — 50 случайных задач (зерно фиксировано) в пачку `recheck.md` + `tool-gold-recheck-ids.json`.
 *
 * Данные — только в `scoutDataDir()`.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IndexedCard } from '../../libs/scout/src/index'
import { readJsonl } from './cli'
import { advisableTools, type EvalCase } from './eval'
import { freshIndex } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutDataDir, scoutHome } from './paths'

/** Запись эталона: инструменты, которые сэкономят агенту работу в этой задаче */
export interface ToolGoldRow {
  sessionId: string
  tools: string[]
  judge: string
}

export interface ToolCandidate {
  name: string
  kind: string
  summary: string
}

export const BATCH_SIZE = 40
export const QUERY_CHARS = 600
export const SUMMARY_CHARS = 300
export const RECHECK_SIZE = 50
export const RECHECK_SEED = 'tool-gold-recheck-v1'

/** Кандидаты: советуемые инструменты, по имени один раз (скил и команда с одним именем — первый) */
export function toolCandidates(cards: IndexedCard[]): ToolCandidate[] {
  const names = advisableTools(cards)
  const seen = new Set<string>()
  const out: ToolCandidate[] = []
  for (const c of cards) {
    if (!names.has(c.title) || c.scope || seen.has(c.title)) {
      continue
    }
    if (c.kind !== 'skill' && c.kind !== 'command' && c.kind !== 'agent') {
      continue
    }
    seen.add(c.title)
    out.push({ name: c.title, kind: c.kind, summary: c.summary.replace(/\s+/g, ' ').slice(0, SUMMARY_CHARS) })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/** Пачка задач текстом: номер, идентификатор сессии, обрезанный текст */
export function batchText(cases: EvalCase[], offset: number): string {
  return cases.map((c, i) => `### ${offset + i + 1} ${c.sessionId}\n${c.query.slice(0, QUERY_CHARS)}`).join('\n\n')
    + '\n'
}

/** Детерминированная выборка: сортировка по хешу с зерном */
export function sampleBySeed<T>(items: T[], key: (t: T) => string, n: number, seed: string): T[] {
  return [...items]
    .map((t) => ({ t, h: createHash('sha1').update(seed + key(t)).digest('hex') }))
    .sort((a, b) => a.h.localeCompare(b.h))
    .slice(0, n)
    .map((x) => x.t)
}

/** Согласованность двух разметок: «пусто/не пусто» и первый инструмент среди непустых у обеих */
export function agreement(a: ToolGoldRow[], b: ToolGoldRow[]) {
  const byId = new Map(a.map((r) => [r.sessionId, r]))
  let common = 0
  let sameEmpty = 0
  let bothNonEmpty = 0
  let sameFirst = 0
  for (const r of b) {
    const o = byId.get(r.sessionId)
    if (!o) {
      continue
    }
    common++
    sameEmpty += (o.tools.length === 0) === (r.tools.length === 0) ? 1 : 0
    if (o.tools.length && r.tools.length) {
      bothNonEmpty++
      sameFirst += o.tools[0] === r.tools[0] ? 1 : 0
    }
  }
  return { common, sameEmpty, bothNonEmpty, sameFirst }
}

function main() {
  const data = scoutDataDir()
  const casesFile = join(data, 'eval-cases.jsonl')
  const cases = readJsonl<EvalCase>(casesFile)
  if (process.argv.includes('--prepare')) {
    const root = findRepoRoot()
    if (!root) {
      throw new Error('Не найден корень репозитория')
    }
    const candidates = toolCandidates(freshIndex(root, scoutHome()).cards)
    writeFileSync(join(data, 'tool-candidates.json'), JSON.stringify(candidates, null, 2))
    const dir = join(data, 'tool-gold-batches')
    mkdirSync(dir, { recursive: true })
    let n = 0
    for (let i = 0; i < cases.length; i += BATCH_SIZE) {
      n++
      writeFileSync(join(dir, `${String(n).padStart(2, '0')}.md`), batchText(cases.slice(i, i + BATCH_SIZE), i))
    }
    console.log(`Кандидатов: ${candidates.length}, задач: ${cases.length}, пачек: ${n} → ${dir}`)
  } else if (process.argv.includes('--recheck-sample')) {
    const picked = sampleBySeed(cases, (c) => c.sessionId, RECHECK_SIZE, RECHECK_SEED)
    const dir = join(data, 'tool-gold-batches')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'recheck.md'), batchText(picked, 0))
    console.log(`Выборка для перепроверки: ${picked.length} → ${join(dir, 'recheck.md')}`)
  } else if (process.argv.includes('--check')) {
    const i = process.argv.indexOf('--check')
    const load = (p: string) => readJsonl<ToolGoldRow>(p)
    const r = agreement(load(process.argv[i + 1]), load(process.argv[i + 2]))
    const p = (x: number, y: number) => (y ? `${((x / y) * 100).toFixed(1)}%` : 'н/д')
    console.log(`общих задач: ${r.common}`)
    console.log(`то же «пусто/не пусто»: ${r.sameEmpty}/${r.common} = ${p(r.sameEmpty, r.common)}`)
    console.log(
      `первый инструмент совпал среди непустых у обеих: ${r.sameFirst}/${r.bothNonEmpty} = ${
        p(r.sameFirst, r.bothNonEmpty)
      }`,
    )
  } else {
    console.log('Запуск: bun scripts/scout/tool-gold.ts --prepare | --recheck-sample | --check <a.jsonl> <b.jsonl>')
  }
}

/** Читает эталон судьи; нет файла — пусто */
export function loadToolGold(dataDir: string = scoutDataDir()): ToolGoldRow[] {
  const file = join(dataDir, 'tool-gold.jsonl')
  return existsSync(file) ? readJsonl<ToolGoldRow>(file) : []
}

if (import.meta.main) {
  main()
}
