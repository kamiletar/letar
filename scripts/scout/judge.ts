/**
 * Локальный судья релевантности (Qwen3.5-9B на llama-server): оценки 0/1/2 пунктам справки.
 * Нужен бенчу: метки кешируются в `SCOUT_DATA/judge-labels.jsonl`, к серверу идём только за новыми парами.
 * Рубрика и формат ответа — из прототипа судьи; эталон Sonnet лежит отдельно (`judge-ref.jsonl`).
 */
import { existsSync, readFileSync } from 'node:fs'
import { QUERY_INSTRUCTION } from '../../libs/scout/src/index'
import { formatQuery } from '../../libs/scout/src/index'

export const JUDGE_MODEL = 'qwen3.5-9b'
export const JUDGE_URL = process.env.SCOUT_JUDGE_URL ?? 'http://127.0.0.1:8092'

export interface JudgeItem {
  path: string
  title: string
  summary: string
}

export interface JudgeLabel {
  sessionId: string
  path: string
  label: 0 | 1 | 2
  judge: string
}

export const RUBRIC = `Ты оцениваешь подсказки поисковика документации для агента-программиста в монорепо.
Дана задача, которую пользователь поставил агенту, и список документов (путь, заголовок, аннотация).
Для каждого документа поставь оценку:
2 — документ прямо нужен для этой задачи: в нём ответ, ловушка, в которую агент вероятно попадёт, или обязательный порядок действий;
1 — по теме, может пригодиться, но задачу не решает;
0 — не по делу (совпали только слова или общая тема вроде «Next.js»).
Документ, уже названный в задаче по имени файла, оценивай так же, по пользе.`

const SUMMARY_CHARS = 300

/** Ключ кеша меток */
export function labelKey(sessionId: string, path: string): string {
  return `${sessionId}\t${path}`
}

/** Кеш меток: ключ `${sessionId}\t${path}`. Нет файла — пустая карта, битые строки пропускаются */
export function loadLabels(file: string): Map<string, JudgeLabel> {
  const map = new Map<string, JudgeLabel>()
  if (!existsSync(file)) {
    return map
  }
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) {
      continue
    }
    try {
      const l = JSON.parse(line) as JudgeLabel
      map.set(labelKey(l.sessionId, l.path), l)
    } catch {
      // битая строка не должна ронять бенч
    }
  }
  return map
}

/** Запрос без префикса `Instruct: …\nQuery: ` — судье инструкция эмбеддера не нужна */
function judgeQuery(query: string): string {
  const formatted = formatQuery(query)
  const marker = `Instruct: ${QUERY_INSTRUCTION}\nQuery: `
  return formatted.startsWith(marker) ? formatted.slice(marker.length) : formatted
}

function parseLabels(text: string, count: number): Array<0 | 1 | 2> | undefined {
  const m = text.match(/\[[\d,\s]*\]/)
  if (!m) {
    return undefined
  }
  try {
    const arr = JSON.parse(m[0]) as number[]
    return arr.length === count && arr.every((x) => x === 0 || x === 1 || x === 2)
      ? (arr as Array<0 | 1 | 2>)
      : undefined
  } catch {
    return undefined
  }
}

/** `unreachable` — сеть, таймаут или HTTP не 2xx; `unparsed` — ответ пришёл, но дважды не разобрался */
export type JudgeResult = { labels: Array<0 | 1 | 2> } | { error: 'unreachable' | 'unparsed' }

/** Оценки судьи 9B для списка пунктов одного запроса (2 попытки) */
export async function judgeItems(
  query: string,
  items: JudgeItem[],
  options: { url?: string; timeoutMs?: number } = {},
): Promise<JudgeResult> {
  if (!items.length) {
    return { labels: [] }
  }
  const { url = JUDGE_URL, timeoutMs = 30_000 } = options
  const list = items
    .map((it, i) => `[${i + 1}] ${it.path} — ${it.title}. ${it.summary.slice(0, SUMMARY_CHARS)}`)
    .join('\n')
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: RUBRIC },
      {
        role: 'user',
        content: `ЗАДАЧА:\n${
          judgeQuery(query)
        }\n\nДОКУМЕНТЫ:\n${list}\n\nОтветь одной строкой JSON: массив из ${items.length} чисел 0/1/2 в порядке документов. Только JSON.`,
      },
    ],
    temperature: 0,
    max_tokens: 60,
    chat_template_kwargs: { enable_thinking: false },
  })
  let reached = false
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) {
        continue
      }
      reached = true
      const json = (await res.json()) as { choices?: Array<{ message: { content: string } }> }
      const labels = parseLabels(json.choices?.[0]?.message.content ?? '', items.length)
      if (labels) {
        return { labels }
      }
    } catch {
      // сервер недоступен или таймаут — вторая попытка
    }
  }
  return { error: reached ? 'unparsed' : 'unreachable' }
}

/** Группа случаев для подсчёта: у каждого — сессия и пути показанных пунктов (первые 5) по порядку */
export interface JudgeGroupInput {
  group: string
  cases: Array<{ sessionId: string; paths: string[] }>
}

export interface JudgeGroup {
  group: string
  cases: number
  covered: number
  relevant1: number
  relevant3: number
  relevant5: number
  needed3: number
  coverage: number
  agreement: number | null
  agreementPairs: number
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/**
 * Метрики справки по меткам судьи. «По делу@k» — средняя доля пунктов с меткой ≥1 среди первых k
 * показанных, «нужен@k» — то же для метки 2; считаются по случаям, где размечены все показанные пункты.
 * Согласие — доля совпадений «≥1» на парах, где есть и метка 9B, и эталонная.
 */
export function judgeGroups(
  groups: JudgeGroupInput[],
  labels: Map<string, JudgeLabel>,
  ref: Map<string, JudgeLabel>,
): JudgeGroup[] {
  return groups.map(({ group, cases }) => {
    const rel: Record<1 | 3 | 5, number[]> = { 1: [], 3: [], 5: [] }
    const need3: number[] = []
    let covered = 0
    let agree = 0
    let pairs = 0
    for (const c of cases) {
      const ls = c.paths.map((p) => labels.get(labelKey(c.sessionId, p))?.label)
      for (const [i, p] of c.paths.entries()) {
        const r = ref.get(labelKey(c.sessionId, p))
        const l = ls[i]
        if (l !== undefined && r) {
          pairs++
          agree += (l >= 1) === (r.label >= 1) ? 1 : 0
        }
      }
      if (!c.paths.length || ls.some((l) => l === undefined)) {
        continue
      }
      covered++
      const top = (k: number, min: number) => {
        const part = ls.slice(0, k) as number[]
        return part.filter((l) => l >= min).length / part.length
      }
      rel[1].push(top(1, 1))
      rel[3].push(top(3, 1))
      rel[5].push(top(5, 1))
      need3.push(top(3, 2))
    }
    return {
      group,
      cases: cases.length,
      covered,
      relevant1: mean(rel[1]),
      relevant3: mean(rel[3]),
      relevant5: mean(rel[5]),
      needed3: mean(need3),
      coverage: cases.length ? covered / cases.length : 0,
      agreement: pairs ? agree / pairs : null,
      agreementPairs: pairs,
    }
  })
}
