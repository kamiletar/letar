/** `status` — сводка последнего деплоя приложения по deploy-manifest. */

import type { DeployEngineExecutor } from './executor.js'
import { latestEntry, readManifest } from './manifest.js'
import type { DeployManifestEntry } from './types.js'

export interface StatusReport {
  app: string
  latest: DeployManifestEntry | null
  totalDeploys: number
  /** Возраст последней записи в мс; `null`, если деплоев через движок ещё не было. */
  ageMs: number | null
}

export async function getStatus(executor: DeployEngineExecutor, app: string): Promise<StatusReport> {
  const manifest = await readManifest(executor, app)
  const latest = latestEntry(manifest)
  return {
    app,
    latest,
    totalDeploys: manifest.entries.length,
    ageMs: latest ? Date.now() - new Date(latest.timestamp).getTime() : null,
  }
}
