import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonl } from '../cli'
import { buildEditCases, cutDate, editGroups, editSessions, scoreEditCases, VARIANTS } from '../edit-briefs'
import type { SessionRecord } from '../mine-transcripts'
import type { Suite } from './types'
import { EMPTY, pct } from './util'

export interface EditResult {
  sessions: number
  cases: number
  rows: Array<
    {
      group: string
      variant: string
      found: number
      gold: number
      hitSessions: number
      sessions: number
      coveredByFirst: number
    }
  >
}

/** Вторая справка в момент первой правки файла: варианты справки по группам сессий */
export const editSuite: Suite = async ({ engine, dataDir, run }) => {
  console.log('\n== edit ==')
  const liveFile = join(dataDir, 'sessions-live.jsonl')
  const frozenFile = join(dataDir, 'sessions.jsonl')
  if (!existsSync(liveFile) || !existsSync(frozenFile)) {
    console.log(`нет ${existsSync(liveFile) ? frozenFile : liveFile}`)
    return EMPTY
  }
  const sessions = editSessions(readJsonl<SessionRecord>(liveFile), readJsonl<SessionRecord>(frozenFile))
  const known = new Set(engine.cards.filter((c) => c.kind === 'doc' || c.kind === 'rule').map((c) => c.path))
  const loadedPaths = new Set(engine.cards.filter((c) => c.loaded).map((c) => c.path))
  const editCases = await buildEditCases(sessions, {
    search: async (q) => (await run(q)).result,
    known,
    loaded: (p) => loadedPaths.has(p),
  })
  const cut = cutDate(sessions)
  console.log(
    `сессий с правкой ${sessions.length}, с эталоном ${editCases.length}; история — до ${cut.slice(0, 10)}, `
      + `проверка — после. Каталог и смесь меряются только на проверке.`,
  )
  const rows: EditResult['rows'] = []
  for (const group of editGroups(editCases, cut)) {
    const isCheck = group.name.startsWith('проверка')
    for (const variant of VARIANTS) {
      if (!isCheck && (variant === 'P-каталог' || variant === 'P-смесь')) {
        continue
      }
      const x = scoreEditCases(group.cases, variant)
      rows.push({ group: group.name, variant, ...x })
      console.log(
        `${group.name.padEnd(14)} ${variant.padEnd(14)} n=${String(x.sessions).padStart(3)}  полнота ${
          pct(x.gold ? x.found / x.gold : 0).padStart(6)
        } (${x.found}/${x.gold})  сессий с попаданием ${
          pct(x.sessions ? x.hitSessions / x.sessions : 0).padStart(6)
        } (${x.hitSessions}/${x.sessions})  первая справка уже покрыла ${
          pct(x.gold ? x.coveredByFirst / x.gold : 0)
        } (${x.coveredByFirst}/${x.gold})`,
      )
    }
  }
  const result: EditResult = { sessions: sessions.length, cases: editCases.length, rows }
  return { summary: {}, result }
}
