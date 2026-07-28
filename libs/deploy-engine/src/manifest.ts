/** Чтение/запись deploy-manifest (`.deploy-manifest/<app>.json`) через инжектируемый executor. */

import type { DeployEngineExecutor } from './executor.js'
import { type DeployManifest, type DeployManifestEntry, DeployManifestSchema } from './types.js'

export function manifestPath(app: string): string {
  return `.deploy-manifest/${app}.json`
}

/** Читает манифест приложения; пустая история, если файла ещё нет (первый деплой через движок). */
export async function readManifest(executor: DeployEngineExecutor, app: string): Promise<DeployManifest> {
  const raw = await executor.readFile(manifestPath(app))
  if (raw === null) {
    return { app, entries: [] }
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `Повреждён deploy-manifest для ${app} (не JSON): ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    )
  }
  const parsed = DeployManifestSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Повреждён deploy-manifest для ${app}: ${parsed.error.message}`)
  }
  return parsed.data
}

/** Дописывает запись в конец истории манифеста и сохраняет файл. */
export async function appendManifestEntry(
  executor: DeployEngineExecutor,
  app: string,
  entry: DeployManifestEntry
): Promise<DeployManifest> {
  const manifest = await readManifest(executor, app)
  const updated: DeployManifest = { app, entries: [...manifest.entries, entry] }
  await executor.writeFile(manifestPath(app), JSON.stringify(updated, null, 2))
  return updated
}

/** Последняя (самая свежая) запись манифеста, либо `null` для ещё не деплоенного приложения. */
export function latestEntry(manifest: DeployManifest): DeployManifestEntry | null {
  return manifest.entries.at(-1) ?? null
}

/** Запись манифеста по sha — источник «предыдущего sha» для rollback без пересборки. */
export function entryBySha(manifest: DeployManifest, sha: string): DeployManifestEntry | null {
  return manifest.entries.find((e) => e.sha === sha) ?? null
}
