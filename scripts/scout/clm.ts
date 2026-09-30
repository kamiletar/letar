#!/usr/bin/env bun
/**
 * CLM-8B офлайн: кодировщик Qwen3-8B (llama-server на 8093, вектор последнего токена) плюс две головы
 * `state_head`/`action_head`, которые переводят ситуацию и действие в общее пространство (512).
 * Оценка пары = `100 · cos(state_head(s), action_head(a))`. Только для бенча: в хук не идёт.
 *
 * Голова: `x = gelu(inp(x))` → `x = gelu(layernorm(hidden.0(x)))` → `out(x)` → L2. GELU точный (erf),
 * LayerNorm eps = 1e-5, вес `nn.Linear` хранится как `[out, in]`.
 *
 * Запуск: bun scripts/scout/clm.ts --check   — сверка проекций с эталоном `head-ref.json`.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type DenseIndex, fuseWithDense, type Hit, type IndexedCard } from '../../libs/scout/src/index'
import { scoutHome } from './paths'

export const CLM_URL = process.env.SCOUT_CLM_URL ?? 'http://127.0.0.1:8093'
export const CLM_DIR = process.env.SCOUT_CLM_DIR ?? 'C:\\ai\\models\\clm'
export const CLM_TASK_CHARS = 600
export const CLM_ACTION_CHARS = 800
export const CLM_QUESTION_DOCS = 'Which documentation section should the agent read before starting this task?'
export const CLM_QUESTION_TOOLS = 'Which tool (skill, command or subagent) should the agent use for this task?'
export const CLM_NOTHING = 'No tool is needed; the agent does the task directly.'
const BATCH = 16
/** Множитель оценки ограничен 100, как в `heads.py` */
export const CLM_SCALE = 100

interface Tensor {
  data: Float32Array
  shape: number[]
}

/** Голова: тензоры по имени (`inp.weight`, `hidden.0.bias`, `norms.0.weight`, `out.weight` …) */
export type ClmHeadTensors = Record<string, Tensor>

export interface ClmHeads {
  state: ClmHeadTensors
  action: ClmHeadTensors
}

/** Точный GELU: `x · Φ(x)`, `erf` — Абрамовиц–Стиган 7.1.26 (ошибка ≈ 1,5e-7) */
export function gelu(x: number): number {
  return 0.5 * x * (1 + erf(x / Math.SQRT2))
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const poly = ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592
  return sign * (1 - poly * t * Math.exp(-a * a))
}

export function l2(v: Float32Array): Float32Array {
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i]
  }
  const norm = Math.sqrt(sum) || 1
  const out = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) {
    out[i] = v[i] / norm
  }
  return out
}

function linear(x: Float32Array, w: Tensor, b: Tensor): Float32Array {
  const [outDim, inDim] = w.shape
  const y = new Float32Array(outDim)
  for (let o = 0; o < outDim; o++) {
    let acc = b.data[o]
    const row = o * inDim
    for (let i = 0; i < inDim; i++) {
      acc += w.data[row + i] * x[i]
    }
    y[o] = acc
  }
  return y
}

function layerNorm(x: Float32Array, w: Tensor, b: Tensor, eps = 1e-5): Float32Array {
  let mean = 0
  for (const v of x) {
    mean += v
  }
  mean /= x.length
  let variance = 0
  for (const v of x) {
    variance += (v - mean) ** 2
  }
  variance /= x.length
  const scale = 1 / Math.sqrt(variance + eps)
  return x.map((v, i) => (v - mean) * scale * w.data[i] + b.data[i])
}

/** Проекция вектора кодировщика (уже L2-нормированного) в общее пространство */
export function applyHead(head: ClmHeadTensors, input: Float32Array): Float32Array {
  const first = linear(input, head['inp.weight'], head['inp.bias']).map(gelu)
  const hidden = layerNorm(
    linear(first, head['hidden.0.weight'], head['hidden.0.bias']),
    head['norms.0.weight'],
    head['norms.0.bias'],
  ).map(gelu)
  return l2(linear(hidden, head['out.weight'], head['out.bias']))
}

/** Головы из `head.json` + `head.f32` (смещения — в элементах float32) */
export function loadClmHead(dir = CLM_DIR): ClmHeads {
  const meta = JSON.parse(readFileSync(join(dir, 'head.json'), 'utf8')) as {
    layers: Array<{ head: string; name: string; shape: number[]; offset: number }>
  }
  const bytes = readFileSync(join(dir, 'head.f32'))
  // Копия: у Buffer смещение может быть не кратно 4
  const all = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const heads: ClmHeads = { state: {}, action: {} }
  for (const l of meta.layers) {
    const size = l.shape.reduce((a, b) => a * b, 1)
    const target = l.head === 'state_head' ? heads.state : heads.action
    target[l.name] = { data: all.subarray(l.offset, l.offset + size), shape: l.shape }
  }
  return heads
}

export function projectState(heads: ClmHeads, v: Float32Array): Float32Array {
  return applyHead(heads.state, v)
}

export function projectAction(heads: ClmHeads, v: Float32Array): Float32Array {
  return applyHead(heads.action, v)
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i]
  }
  return s
}

/** Текст ситуации — как `state_text` в `schema.py`: контекст, пустая строка, вопрос; задача обрезана */
export function situationText(task: string, question: string): string {
  return `${task.slice(0, CLM_TASK_CHARS)}\n\n${question}`
}

/** Текст действия карточки: `title` (+ ` § section`) + `. ` + `summary` */
export function actionText(card: Pick<IndexedCard, 'kind' | 'title' | 'summary' | 'topic' | 'path'>): string {
  const head = card.kind === 'section' ? `${card.topic ?? card.path} § ${card.title}` : card.title
  return `${head}. ${card.summary}`.slice(0, CLM_ACTION_CHARS)
}

/** Кандидаты-инструменты по оценке; «ничего» не ниже лучшего → инструмент не советуется */
export function rankToolCandidates(
  names: string[],
  scores: number[],
  nothingScore: number,
): { list: string[]; shown: boolean } {
  const order = names.map((name, i) => ({ name, score: scores[i] })).sort((a, b) => b.score - a.score)
  return { list: order.map((o) => o.name), shown: order.length > 0 && nothingScore < order[0].score }
}

/** Слияние текущих списков (BM25, плотный, формулировки) с CLM четвёртым списком; либа не меняется */
export function fuseWithClm(
  cards: IndexedCard[],
  bm25: Hit[],
  dense: DenseIndex,
  vector: Float32Array,
  extra: string[][],
  clmIds: string[],
): Hit[] {
  return fuseWithDense(cards, bm25, dense, vector, { extra: [...extra, clmIds] })
}

const sha = (text: string) => createHash('sha1').update(text).digest('hex')

/** Кодировщик: пачки по 16, L2-нормировка; понятная ошибка, если 8093 не отвечает */
export async function clmEmbed(texts: string[], url = CLM_URL): Promise<Float32Array[]> {
  const out: Float32Array[] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    let json: { data?: Array<{ embedding: number[]; index?: number }> }
    try {
      const r = await fetch(`${url}/v1/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: batch }),
        signal: AbortSignal.timeout(300_000),
      })
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
      }
      json = await r.json() as typeof json
    } catch (e) {
      throw new Error(
        `CLM-кодировщик на ${url} не отвечает (llama-server с Qwen3-8B, --embedding --pooling last): ${e}`,
      )
    }
    const data = [...(json.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    if (data.length !== batch.length) {
      throw new Error(`CLM: ждали ${batch.length} векторов, пришло ${data.length}`)
    }
    for (const d of data) {
      out.push(l2(Float32Array.from(d.embedding)))
    }
  }
  return out
}

/** Дисковый кеш векторов кодировщика: `clm-vectors.json` (хеши) + `.f32`, ключ — sha1 текста */
export class ClmCache {
  private vectors = new Map<string, Float32Array>()
  private dirty = 0
  constructor(private home = scoutHome(), private dims = 4096) {
    const meta = join(home, 'clm-vectors.json')
    const bin = join(home, 'clm-vectors.f32')
    if (existsSync(meta) && existsSync(bin)) {
      const hashes = JSON.parse(readFileSync(meta, 'utf8')) as string[]
      const bytes = readFileSync(bin)
      const m = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
      if (m.length === hashes.length * dims) {
        hashes.forEach((h, i) => this.vectors.set(h, m.subarray(i * dims, (i + 1) * dims)))
      }
    }
  }

  save(): void {
    mkdirSync(this.home, { recursive: true })
    const hashes = [...this.vectors.keys()]
    const m = new Float32Array(hashes.length * this.dims)
    hashes.forEach((h, i) => m.set(this.vectors.get(h)!, i * this.dims))
    const bin = join(this.home, 'clm-vectors.f32')
    const meta = join(this.home, 'clm-vectors.json')
    writeFileSync(`${bin}.tmp`, Buffer.from(m.buffer, m.byteOffset, m.byteLength))
    writeFileSync(`${meta}.tmp`, JSON.stringify(hashes))
    renameSync(`${bin}.tmp`, bin)
    renameSync(`${meta}.tmp`, meta)
    this.dirty = 0
  }

  has(text: string): boolean {
    return this.vectors.has(sha(text))
  }

  /** Векторы по порядку текстов; недостающие считаются пачками и сохраняются на диск */
  async get(texts: string[], url = CLM_URL, log?: (msg: string) => void): Promise<Float32Array[]> {
    const missing = [...new Set(texts.filter((t) => !this.has(t)))]
    for (let i = 0; i < missing.length; i += BATCH * 25) {
      const part = missing.slice(i, i + BATCH * 25)
      const vs = await clmEmbed(part, url)
      part.forEach((t, j) => this.vectors.set(sha(t), vs[j]))
      this.dirty += part.length
      log?.(`CLM: ${Math.min(i + part.length, missing.length)}/${missing.length}`)
      this.save()
    }
    return texts.map((t) => this.vectors.get(sha(t))!)
  }

  /** Один текст без пакета: время вызова в мс (`undefined`, если вектор уже был в кеше) */
  async getTimed(text: string, url = CLM_URL): Promise<{ vector: Float32Array; ms: number | undefined }> {
    if (this.has(text)) {
      return { vector: this.vectors.get(sha(text))!, ms: undefined }
    }
    const started = performance.now()
    const [vector] = await clmEmbed([text], url)
    const ms = performance.now() - started
    this.vectors.set(sha(text), vector)
    this.dirty++
    return { vector, ms }
  }

  flush(): void {
    if (this.dirty) {
      this.save()
    }
  }
}

async function check(): Promise<void> {
  const heads = loadClmHead()
  const ref = JSON.parse(readFileSync(join(CLM_DIR, 'head-ref.json'), 'utf8')) as {
    texts: string[]
    emb: number[][]
    state: number[][]
    action: number[][]
  }
  const cos = (a: Float32Array, b: number[]) => dot(a, l2(Float32Array.from(b)))
  let worst = 1
  console.log('Головы на эталонных векторах кодировщика (голова отдельно):')
  ref.emb.forEach((e, i) => {
    const v = l2(Float32Array.from(e))
    const s = cos(projectState(heads, v), ref.state[i])
    const a = cos(projectAction(heads, v), ref.action[i])
    worst = Math.min(worst, s, a)
    console.log(`  текст ${i}: state ${s.toFixed(6)}  action ${a.toFixed(6)}`)
  })
  console.log(`Худший косинус (голова): ${worst.toFixed(6)} ${worst >= 0.9999 ? 'OK' : 'ПРОВАЛ'}`)
  try {
    const vs = await clmEmbed(ref.texts)
    console.log('Сквозная проверка (сервер 8093 + голова):')
    vs.forEach((v, i) => {
      const e = cos(v, ref.emb[i])
      const s = cos(projectState(heads, v), ref.state[i])
      const a = cos(projectAction(heads, v), ref.action[i])
      console.log(`  текст ${i}: emb ${e.toFixed(6)}  state ${s.toFixed(6)}  action ${a.toFixed(6)}`)
    })
  } catch (e) {
    console.log(`Сквозная проверка пропущена: ${e}`)
  }
  if (worst < 0.9999) {
    process.exit(1)
  }
}

if (import.meta.main && process.argv.includes('--check')) {
  await check()
}
