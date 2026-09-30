/**
 * Словарь ассоциаций «слово запроса → термы доков» (Э3): по первым сообщениям сессий и докам,
 * которые в них читали. Сессии из `eval-cases.jsonl` исключены целиком — замер не видит своих ответов.
 * ⚠️ Деление по дате 70/30 не применяется: почти все сессии с прочитанными до правки доками уже
 * лежат в эталоне, вне него остаётся ~175, резать их ещё по дате нечем.
 *
 * Запуск: bun scripts/scout/assoc.ts [--sessions <jsonl>] [--cases <jsonl>] [--home <dir>]
 * Результат — `SCOUT_HOME/assoc.json` (вне репо).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type AssocDict, type AssocPair, Bm25, buildAssoc, tokenize } from '../../libs/scout/src/index'
import { arg, readJsonl } from './cli'
import { freshIndex } from './hook-core'
import type { SessionRecord } from './mine-transcripts'
import { scoutDataDir, scoutHome } from './paths'

const DOC_TERMS = 40

/** Термы дока: верх по tf·idf его карточек (документ целиком — слишком много шума) */
export function docTopTerms(engine: Bm25, path: string, k = DOC_TERMS): string[] {
  const score = new Map<string, number>()
  for (const card of engine.cards) {
    if (card.path !== path || (card.kind !== 'doc' && card.kind !== 'section')) {
      continue
    }
    for (const term of Object.keys(card.tf)) {
      score.set(term, (score.get(term) ?? 0) + (card.tf[term] / card.len) * engine.idf(term))
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t)
}

/** Обучающие пары: ранние 70% сессий по дате, минус сессии эталона */
export function trainPairs(sessions: SessionRecord[], evalIds: Set<string>, engine: Bm25): AssocPair[] {
  const usable = sessions
    .filter((s) => s.task && s.docsRead?.length)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const train = usable.filter((s) => !evalIds.has(s.sessionId))
  const cache = new Map<string, string[]>()
  const termsOf = (p: string) => {
    let t = cache.get(p)
    if (!t) {
      t = docTopTerms(engine, p)
      cache.set(p, t)
    }
    return t
  }
  return train.map((s) => ({
    queryTerms: tokenize(s.task.slice(0, 600)),
    docTerms: [...new Set(s.docsRead.flatMap((d) => termsOf(d.path)))],
  }))
}

/** Словарь из `SCOUT_HOME/assoc.json`; нет файла или версия чужая — `undefined` */
export function loadAssoc(home: string): AssocDict | undefined {
  const file = join(home, 'assoc.json')
  if (!existsSync(file)) {
    return undefined
  }
  try {
    const dict = JSON.parse(readFileSync(file, 'utf8')) as AssocDict
    return dict.version === 1 ? dict : undefined
  } catch {
    return undefined
  }
}

if (import.meta.main) {
  const root = process.cwd()
  const home = arg('--home') ?? scoutHome()
  const dataDir = scoutDataDir()
  const sessionsFile = arg('--sessions') ?? join(dataDir, 'sessions.jsonl')
  const casesFile = arg('--cases') ?? join(dataDir, 'eval-cases.jsonl')
  const evalIds = new Set(
    existsSync(casesFile) ? readJsonl<{ sessionId: string }>(casesFile).map((c) => c.sessionId) : [],
  )
  const engine = new Bm25(freshIndex(root, home))
  const pairs = trainPairs(readJsonl<SessionRecord>(sessionsFile), evalIds, engine)
  const dict = buildAssoc(pairs, { minQuery: 3, minJoint: 2 })
  writeFileSync(join(home, 'assoc.json'), JSON.stringify(dict))
  console.log(
    `обучающих сессий ${pairs.length} (эталонных исключено ${evalIds.size}), слов в словаре ${
      Object.keys(dict.terms).length
    }`,
  )
}
