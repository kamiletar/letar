/**
 * Схема deploy-manifest (§18.6): `.deploy-manifest/<app>.json` — история деплоев приложения.
 * Источник «предыдущего sha» для rollback (сессия H) и audit trail. Миграции БД не
 * откатываются автоматически — `migrationsApplied` только фиксирует факт применения.
 */

import { z } from 'zod'

export const DeployManifestEntrySchema = z.object({
  deployId: z.string().min(1),
  sha: z.string().min(1),
  imageTag: z.string().min(1),
  migrationsApplied: z.array(z.string()),
  timestamp: z.string().datetime({ offset: true }),
})
export type DeployManifestEntry = z.infer<typeof DeployManifestEntrySchema>

export const DeployManifestSchema = z.object({
  app: z.string().min(1),
  entries: z.array(DeployManifestEntrySchema),
})
export type DeployManifest = z.infer<typeof DeployManifestSchema>
