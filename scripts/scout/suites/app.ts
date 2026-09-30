import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { scoreAppBriefs } from '../app-briefs'
import { readJsonl } from '../cli'
import type { SessionRecord } from '../mine-transcripts'
import type { Suite } from './types'
import { EMPTY, pct } from './util'

type AppScore = ReturnType<typeof scoreAppBriefs>['app']
export interface AppResult {
  train: number
  app: AppScore
  global: AppScore
}

/** Справка приложения по голой `/<app>`: сессии с командой делятся по дате 70/30 */
export const appSuite: Suite = async ({ engine, dataDir }) => {
  console.log('\n== app ==')
  const file = join(dataDir, 'sessions.jsonl')
  if (!existsSync(file)) {
    console.log(`нет ${file}`)
    return EMPTY
  }
  const loadedPaths = new Set(engine.cards.filter((c) => c.loaded).map((c) => c.path))
  const got: AppResult = scoreAppBriefs(readJsonl<SessionRecord>(file), (p) => loadedPaths.has(p))
  const ratio = (a: number, b: number) => (b ? (a / b) * 100 : null)
  for (const [name, x] of [['app', got.app], ['global', got.global]] as const) {
    console.log(
      `${name.padEnd(7)} история ${got.train} сессий, проверка ${x.sessions}: полнота ${
        pct(x.read ? x.found / x.read : 0)
      } (${x.found}/${x.read}), сессий с попаданием ${
        pct(x.sessions ? x.hitSessions / x.sessions : 0)
      } (${x.hitSessions}/${x.sessions})`,
    )
  }
  return {
    summary: {
      'app полнота': ratio(got.app.found, got.app.read),
      'app попадание': ratio(got.app.hitSessions, got.app.sessions),
      'global полнота': ratio(got.global.found, got.global.read),
      'global попадание': ratio(got.global.hitSessions, got.global.sessions),
    },
    result: got,
  }
}
