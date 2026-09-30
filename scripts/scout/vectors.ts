#!/usr/bin/env bun
/**
 * Эмбеддинги карточек скаута: `SCOUT_HOME/vectors.json` (id, хеш текста) + `vectors.f32` (матрица).
 * Пересчитываются только карточки, у которых изменился текст, — правка одного дока не гоняет весь корпус.
 *
 * Запуск: bun scripts/scout/vectors.ts [--url http://127.0.0.1:8090]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Card, cardEmbedText, collectCards, DenseIndex, embedTexts } from '../../libs/scout/src/index'
import { findRepoRoot } from './index-store'
import { scoutHome } from './paths'

export const EMBED_URL = process.env.SCOUT_EMBED_URL ?? 'http://127.0.0.1:8090'
export const RERANK_URL = process.env.SCOUT_RERANK_URL ?? 'http://127.0.0.1:8091'

interface VectorMeta {
  model: string
  dims: number
  ids: string[]
  hashes: string[]
}

const BATCH = 16

function hashText(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 16)
}

export function loadDense(home = scoutHome()): DenseIndex | undefined {
  const metaPath = join(home, 'vectors.json')
  const binPath = join(home, 'vectors.f32')
  if (!existsSync(metaPath) || !existsSync(binPath)) {
    return undefined
  }
  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as VectorMeta
    const bytes = readFileSync(binPath)
    const matrix = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
    return matrix.length === meta.ids.length * meta.dims ? new DenseIndex(meta.ids, matrix, meta.dims) : undefined
  } catch {
    return undefined
  }
}

/** Досчитать недостающие векторы и записать хранилище атомарно */
export async function buildVectors(
  cards: Card[],
  url: string,
  home = scoutHome(),
  log = console.error,
): Promise<{ computed: number; total: number }> {
  const oldMeta = existsSync(join(home, 'vectors.json'))
    ? (JSON.parse(readFileSync(join(home, 'vectors.json'), 'utf8')) as VectorMeta)
    : undefined
  const old = loadDense(home)
  const oldRow = new Map(oldMeta?.ids.map((id, i) => [id, i]) ?? [])
  const texts = cards.map(cardEmbedText)
  const hashes = texts.map(hashText)
  const vectors: Array<Float32Array | undefined> = cards.map((card, i) => {
    const row = oldRow.get(card.id)
    if (old && oldMeta && row !== undefined && oldMeta.hashes[row] === hashes[i]) {
      return old.matrix.subarray(row * old.dims, (row + 1) * old.dims)
    }
    return undefined
  })
  const todo = vectors.flatMap((v, i) => (v ? [] : [i]))
  const started = performance.now()
  for (let b = 0; b < todo.length; b += BATCH) {
    const batch = todo.slice(b, b + BATCH)
    const embedded = await embedTexts(batch.map((i) => texts[i]), { url, timeoutMs: 120_000 })
    batch.forEach((i, j) => (vectors[i] = embedded[j]))
    if ((b / BATCH) % 20 === 0) {
      log(`… ${Math.min(b + BATCH, todo.length)}/${todo.length}, ${Math.round((performance.now() - started) / 1000)} с`)
    }
  }
  const dims = vectors[0]?.length ?? 0
  const matrix = new Float32Array(cards.length * dims)
  vectors.forEach((v, i) => matrix.set(v as Float32Array, i * dims))
  mkdirSync(home, { recursive: true })
  const meta: VectorMeta = { model: 'Qwen3-Embedding-0.6B-Q8_0', dims, ids: cards.map((c) => c.id), hashes }
  writeFileSync(join(home, 'vectors.f32.tmp'), Buffer.from(matrix.buffer))
  writeFileSync(join(home, 'vectors.json.tmp'), JSON.stringify(meta))
  renameSync(join(home, 'vectors.f32.tmp'), join(home, 'vectors.f32'))
  renameSync(join(home, 'vectors.json.tmp'), join(home, 'vectors.json'))
  return { computed: todo.length, total: cards.length }
}

if (import.meta.main) {
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const i = process.argv.indexOf('--url')
  const url = i === -1 ? EMBED_URL : process.argv[i + 1]
  const started = performance.now()
  const { computed, total } = await buildVectors(collectCards(root), url)
  console.log(`Векторы: посчитано ${computed}, всего ${total}, ${Math.round((performance.now() - started) / 1000)} с`)
}
