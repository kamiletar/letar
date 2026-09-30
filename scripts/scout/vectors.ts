#!/usr/bin/env bun
/**
 * Эмбеддинги карточек скаута: `SCOUT_HOME/vectors.json` (id, хеш текста) + `vectors.f32` (матрица).
 * Пересчитываются только карточки, у которых изменился текст, — правка одного дока не гоняет весь корпус.
 *
 * Запуск: bun scripts/scout/vectors.ts [--url http://127.0.0.1:8090] [--if-stale]
 * `--if-stale` — пересчитывать, только если есть карточки без актуального вектора, иначе выйти молча.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Card, cardEmbedText, collectCards, DenseIndex, embedHash, embedTexts } from '../../libs/scout/src/index'
import { findRepoRoot } from './index-store'
import { scoutHome } from './paths'

export const EMBED_URL = process.env.SCOUT_EMBED_URL ?? 'http://127.0.0.1:8090'
export const RERANK_URL = process.env.SCOUT_RERANK_URL ?? 'http://127.0.0.1:8091'

/** Модель эмбеддера: векторы другой модели несовместимы, хранилище с чужой моделью не читается */
export const EMBED_MODEL = 'Qwen3-Embedding-0.6B-Q8_0'

interface VectorMeta {
  model: string
  dims: number
  ids: string[]
  hashes: string[]
}

/** Векторы вместе с хешами текстов карточек: по хешу хук сверяет их с индексом */
export interface VectorStore {
  dense: DenseIndex
  hashById: Map<string, string>
}

const BATCH = 16

/** Файл блокировки фонового пересчёта (создаёт `warmup.ts`) */
export function vectorsLockPath(home = scoutHome()): string {
  return join(home, 'state', 'vectors.lock')
}

/** Хранилище с проверками целостности; любое расхождение — `undefined` (считаем, что векторов нет) */
export function loadVectorStore(home = scoutHome()): VectorStore | undefined {
  const metaPath = join(home, 'vectors.json')
  const binPath = join(home, 'vectors.f32')
  if (!existsSync(metaPath) || !existsSync(binPath)) {
    return undefined
  }
  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as VectorMeta
    if (
      meta.model !== EMBED_MODEL
      || !(meta.dims > 0)
      || !Array.isArray(meta.ids)
      || !Array.isArray(meta.hashes)
      || meta.hashes.length !== meta.ids.length
    ) {
      return undefined
    }
    const bytes = readFileSync(binPath)
    const matrix = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
    if (matrix.length !== meta.ids.length * meta.dims) {
      return undefined
    }
    return {
      dense: new DenseIndex(meta.ids, matrix, meta.dims),
      hashById: new Map(meta.ids.map((id, i) => [id, meta.hashes[i]])),
    }
  } catch {
    return undefined
  }
}

export function loadDense(home = scoutHome()): DenseIndex | undefined {
  return loadVectorStore(home)?.dense
}

/** Карточки, у которых нет вектора или он посчитан по другому тексту; `kinds` сужает круг проверки */
export function staleCards(cards: Card[], store: VectorStore | undefined, kinds?: readonly string[]): Card[] {
  return cards.filter((c) => (!kinds || kinds.includes(c.kind)) && store?.hashById.get(c.id) !== embedHash(c))
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
  // Переиспользуем по хешу текста, не по id: у секций номер строки входит в id и сдвигается от правок выше
  const rowByHash = new Map<string, number>()
  if (old && oldMeta) {
    oldMeta.hashes.forEach((h, row) => {
      if (!rowByHash.has(h)) {
        rowByHash.set(h, row)
      }
    })
  }
  const texts = cards.map(cardEmbedText)
  const hashes = cards.map(embedHash)
  const vectors: Array<Float32Array | undefined> = hashes.map((h) => {
    const row = rowByHash.get(h)
    return old && row !== undefined ? old.matrix.subarray(row * old.dims, (row + 1) * old.dims) : undefined
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
  const meta: VectorMeta = { model: EMBED_MODEL, dims, ids: cards.map((c) => c.id), hashes }
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
  try {
    const cards = collectCards(root)
    const skip = process.argv.includes('--if-stale') && !staleCards(cards, loadVectorStore()).length
    if (!skip) {
      const started = performance.now()
      const { computed, total } = await buildVectors(cards, url)
      console.log(
        `Векторы: посчитано ${computed}, всего ${total}, ${Math.round((performance.now() - started) / 1000)} с`,
      )
    }
  } finally {
    // Блокировку фонового пересчёта снимаем и при успехе, и при ошибке
    rmSync(vectorsLockPath(), { force: true })
  }
}
