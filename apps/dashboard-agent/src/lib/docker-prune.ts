/**
 * Автоматическая чистка Docker-мусора (Backlog «Диск переполняется дублями образов»).
 *
 * `deploy-affected.sh` держит ретеншн последних 3 SHA-тегов на приложение, но это только
 * снятие ТЕГА — `docker rmi <app>:<sha>` не удаляет слои, если образ остаётся доступен под
 * другим тегом. Каждый передеплой того же приложения переставляет `:latest`/`:staging` на новый
 * образ, и предыдущий, потеряв все теги, становится dangling (`<none>`) — но никто их не
 * подметает. При ~20 приложениях с частыми деплоями это давало рост на десятки гигабайт за
 * недели (зафиксировано 2026-08-14: диск s2 91%, `docker image prune -a` вручную вернул 19GB).
 *
 * Используем только БЕЗОПАСНЫЕ операции без `-a`/фильтров по времени:
 * - `pruneImages` без `dangling: false` — Docker по умолчанию трогает только untagged-образы,
 *   те самые осиротевшие слои. Никогда не удаляет ничего, на что ссылается тег или контейнер —
 *   рискованный `-a` (удаляет и тегированные rollback-образы) сюда осознанно не включён.
 * - `pruneBuilder` без фильтров — BuildKit сам не удаляет кэш, на который есть живые ссылки.
 */

import { docker } from './docker'

export interface DockerPruneResult {
  checkedAt: string
  imagesDeleted: number
  imagesReclaimedBytes: number
  builderReclaimedBytes: number
}

interface ImagePruneResponse {
  ImagesDeleted?: Array<{ Deleted?: string; Untagged?: string }>
  SpaceReclaimed?: number
}

interface BuilderPruneResponse {
  SpaceReclaimed?: number
}

export async function runDockerPrune(): Promise<DockerPruneResult> {
  const checkedAt = new Date().toISOString()

  const imageResult = (await docker.pruneImages()) as ImagePruneResponse
  const builderResult = (await docker.pruneBuilder()) as BuilderPruneResponse

  const result: DockerPruneResult = {
    checkedAt,
    imagesDeleted: imageResult.ImagesDeleted?.length ?? 0,
    imagesReclaimedBytes: imageResult.SpaceReclaimed ?? 0,
    builderReclaimedBytes: builderResult.SpaceReclaimed ?? 0,
  }

  const totalMb = (result.imagesReclaimedBytes + result.builderReclaimedBytes) / 1024 / 1024
  console.warn(
    `[DockerPrune] Удалено dangling-образов: ${result.imagesDeleted}, освобождено: ${totalMb.toFixed(1)}MB`,
  )

  return result
}
