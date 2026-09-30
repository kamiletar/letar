#!/usr/bin/env bun
/**
 * Формулировки задач к докам (doc2query): локальная 9B пишет для каждого дока 6 фраз «как с этим приходят
 * к агенту», эмбеддер считает по ним векторы, боевой поиск берёт их третьим списком слияния.
 * Файлы в `SCOUT_HOME`: `phrases.jsonl` (тексты), `phrase-vectors.json` (meta) + `phrase-vectors.f32` (матрица).
 *
 * Запуск: bun scripts/scout/phrases.ts [--generate] [--limit N]
 * Без `--generate` только досчитывает векторы; с ним сначала пишет формулировки докам без них (нужна 9B на 8092).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Card, collectCards, DenseIndex, embedTexts, phraseHash } from '../../libs/scout/src/index'
import { arg, readJsonl } from './cli'
import { findRepoRoot } from './index-store'
import { EMBED_MODEL, readMatrixStore, writeMatrixStore } from './matrix-store'
import { scoutHome } from './paths'
import { EMBED_URL } from './vectors'

interface PhraseRow {
  path: string
  hash: string
  phrases: string[]
}

export interface PhraseStore {
  index: DenseIndex
  /** path дока → хеш, по которому посчитаны его формулировки */
  hashByPath: Map<string, string>
}

const BATCH = 32

/** Формулировки пишем и ищем только для доков и правил */
const isDoc = (c: Card) => c.kind === 'doc' || c.kind === 'rule'

/** Адрес генератора (Qwen3.5-9B в llama-server) */
export const GEN_URL = process.env.SCOUT_GEN_URL ?? 'http://127.0.0.1:8092'

function phrasesPath(home: string): string {
  return join(home, 'phrases.jsonl')
}

/** Строки файла формулировок; при повторе `path` берётся последняя */
export function readPhraseRows(home = scoutHome()): Map<string, PhraseRow> {
  const path = phrasesPath(home)
  const rows = new Map<string, PhraseRow>()
  if (!existsSync(path)) {
    return rows
  }
  for (const row of readJsonl<PhraseRow>(path)) {
    rows.set(row.path, row)
  }
  return rows
}

/** id карточки → path (у доков и правил id = `<kind>:<path>`) */
function pathOfId(id: string): string {
  return id.slice(id.indexOf(':') + 1)
}

/** Хранилище с проверками целостности, как у `loadVectorStore`; любое расхождение — `undefined` */
export function loadPhraseStore(home = scoutHome()): PhraseStore | undefined {
  const stored = readMatrixStore(home, 'phrase-vectors')
  if (!stored) {
    return undefined
  }
  const { meta, matrix } = stored
  const hashByPath = new Map<string, string>()
  meta.ids.forEach((id, i) => hashByPath.set(pathOfId(id), meta.hashes[i]))
  return { index: new DenseIndex(meta.ids, matrix, meta.dims), hashByPath }
}

/** Досчитать векторы формулировок для доков, у которых их нет или хеш другой; вернуть число доков */
export async function buildPhraseVectors(cards: Card[], home = scoutHome(), url = EMBED_URL): Promise<number> {
  const rows = readPhraseRows(home)
  const old = loadPhraseStore(home)
  const docs = cards.filter((c) => isDoc(c) && rows.has(c.path))
  const todo = docs.filter((c) => old?.hashByPath.get(c.path) !== rows.get(c.path)?.hash)
  const docIds = new Set(docs.map((c) => c.id))
  const orphaned = old ? old.index.ids.some((id) => !docIds.has(id)) : false
  if (old && !todo.length && !orphaned) {
    return 0
  }
  const ids: string[] = []
  const hashes: string[] = []
  const vectors: Float32Array[] = []
  // Доки с прежним хешем переносим из старой матрицы
  if (old) {
    const fresh = new Set(todo.map((c) => c.id))
    old.index.ids.forEach((id, row) => {
      if (docIds.has(id) && !fresh.has(id)) {
        ids.push(id)
        hashes.push(old.hashByPath.get(pathOfId(id)) as string)
        vectors.push(old.index.matrix.subarray(row * old.index.dims, (row + 1) * old.index.dims))
      }
    })
  }
  const lines = todo.flatMap((c) => {
    const row = rows.get(c.path) as PhraseRow
    return row.phrases.map((text) => ({ id: c.id, hash: row.hash, text }))
  })
  for (let b = 0; b < lines.length; b += BATCH) {
    const batch = lines.slice(b, b + BATCH)
    // Документная сторона: без инструкции, как `cardEmbedText`
    const embedded = await embedTexts(batch.map((l) => l.text), { url, timeoutMs: 120_000 })
    batch.forEach((l, j) => {
      ids.push(l.id)
      hashes.push(l.hash)
      vectors.push(embedded[j])
    })
  }
  const dims = vectors[0]?.length ?? old?.index.dims ?? 0
  const matrix = new Float32Array(vectors.length * dims)
  vectors.forEach((v, i) => matrix.set(v, i * dims))
  writeMatrixStore(home, 'phrase-vectors', { model: EMBED_MODEL, dims, ids, hashes }, matrix)
  return todo.length
}

const SYSTEM = 'Ты помогаешь строить поиск по документации монорепо (Next.js, Nx, Chakra UI, ZenStack, Bun, Docker). '
  + 'По тексту документа пиши, с какими задачами и симптомами разработчик приходит, когда этот документ ему нужен. '
  + 'Пиши так, как пишут задачу агенту в чате: коротко, по-русски, без названия документа и без слов «документ», «док».'

function prompt(title: string, summary: string, body: string): string {
  return `Документ «${title}». Аннотация: ${summary}\n\n${body}\n\n`
    + 'Напиши 6 разных формулировок (каждая 5–20 слов, по одной на строку, без нумерации): '
    + '2 — задача, которую человек ставит («добавь…», «сделай…»), 2 — симптом ошибки, как его описывают '
    + '(«падает…», «не работает…», текст ошибки), 2 — вопрос («почему…», «как…»). Только строки, ничего больше.'
}

/** Сервер отвечает на `/health` за секунду */
async function alive(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })
    return response.ok
  } catch {
    return false
  }
}

/** Три ошибки подряд — считаем, что сервер лёг */
const MAX_FAILS_IN_ROW = 3

/** Один запрос к генератору; сетевая ошибка, не-2xx или битый JSON — исключение */
async function generateOne(url: string, card: Card, body: string): Promise<string> {
  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt(card.title, card.summary, body) },
      ],
      temperature: 0.7,
      max_tokens: 400,
      chat_template_kwargs: { enable_thinking: false },
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const json = (await response.json()) as { choices?: Array<{ message: { content: string } }> }
  return json.choices?.[0]?.message.content ?? ''
}

/** Сгенерировать формулировки 9B для доков без них или с другим хешем; сервер недоступен — нули; `skipped` — доки, на которых запрос упал */
export async function generatePhrases(
  root: string,
  cards: Card[],
  home = scoutHome(),
  options: { url?: string; limit?: number } = {},
): Promise<{ done: number; skipped: number }> {
  const url = options.url ?? GEN_URL
  const limit = options.limit ?? Infinity
  const rows = readPhraseRows(home)
  const todo: Array<{ card: Card; body: string; hash: string }> = []
  for (const card of cards.filter(isDoc)) {
    const full = join(root, card.path)
    if (!existsSync(full)) {
      continue
    }
    const markdown = readFileSync(full, 'utf8')
    const hash = phraseHash(card.path, markdown)
    if (rows.get(card.path)?.hash !== hash) {
      todo.push({ card, body: markdown.slice(0, 3000), hash })
    }
  }
  if (!todo.length || !(await alive(url))) {
    return { done: 0, skipped: 0 }
  }
  mkdirSync(home, { recursive: true })
  let done = 0
  let skipped = 0
  let streak = 0
  for (const { card, body, hash } of todo.slice(0, limit)) {
    // Три ошибки подряд — сервер лёг, дальше не идём
    if (streak >= MAX_FAILS_IN_ROW) {
      break
    }
    let text = ''
    try {
      text = await generateOne(url, card, body)
      streak = 0
    } catch {
      skipped++
      streak++
      continue
    }
    const phrases = text.split('\n').map((l) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter((l) => l.length > 8)
      .slice(0, 8)
    if (!phrases.length) {
      continue
    }
    appendFileSync(phrasesPath(home), `${JSON.stringify({ path: card.path, hash, phrases })}\n`)
    done++
  }
  return { done, skipped }
}

if (import.meta.main) {
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const cards = collectCards(root)
  if (process.argv.includes('--generate')) {
    const limit = arg('--limit')
    const { done, skipped } = await generatePhrases(root, cards, scoutHome(), limit ? { limit: Number(limit) } : {})
    console.log(`Формулировки: написано для ${done} доков${skipped ? `, пропущено из-за ошибок: ${skipped}` : ''}`)
  }
  const started = performance.now()
  const built = await buildPhraseVectors(cards)
  console.log(
    `Векторы формулировок: посчитано для ${built} доков, ${Math.round((performance.now() - started) / 1000)} с`,
  )
}
