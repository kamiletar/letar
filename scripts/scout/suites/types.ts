import type { Bm25 } from '../../../libs/scout/src/index'
import type { EvalCase } from '../eval'
import type { HookDeps, ScoutQueryResult } from '../hook-core'

/** Всё, что сьют получает от `bench.ts`: движок, зависимости хука и общий кеш запросов */
export interface SuiteContext {
  root: string
  home: string
  dataDir: string
  engine: Bm25
  deps: HookDeps
  /** Кеш scoutQuery по тексту запроса — общий для сьютов */
  run: (query: string) => Promise<ScoutQueryResult>
  /** Уже посчитанный через `run` результат без запуска (для `latency` и `docs`, которым нужен кеш) */
  cached: (query: string) => ScoutQueryResult | undefined
  cases: EvalCase[]
  flags: { noPhrases: boolean; toolVariants?: boolean }
}

export interface SuiteOutput {
  /** Ключи — те же, что в `SUMMARY` бенча (журнал и `--compare` читают их) */
  summary: Record<string, number | null>
  /** Кладётся в поле `BenchRun` с именем сьюта */
  result?: unknown
}

export type Suite = (ctx: SuiteContext) => Promise<SuiteOutput>
