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
 * - `pruneBuilder` с фильтром `until` — BuildKit не удаляет кэш, на который есть живые ссылки,
 *   но «живых» ссылок у build cache практически не бывает: замер на s3 2026-08-28 показал
 *   1107 записей, 76.9GB, из них ACTIVE = 0. То есть прогон без фильтра сносил кэш ЦЕЛИКОМ
 *   каждую ночь, и первый деплой каждого приложения после 04:00 пересобирал базовые слои с
 *   реальным сетевым запросом. Это и давало «случайные» TLS-ошибки на `apk add`
 *   (studio ×2, dsperevod — 2026-08-27). Слои моложе KEEP_HOURS теперь переживают чистку.
 *   Разбор — .claude/docs/docker-prune-cold-layer-network-flake.md
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

/**
 * Сколько часов держать build cache. Слои моложе переживают ночную чистку — именно они
 * экономят сеть при сборке (базовые образы, `COPY --from`, установка пакетов).
 */
const BUILDER_CACHE_KEEP_HOURS = Number(process.env['DOCKER_PRUNE_BUILDER_KEEP_HOURS'] ?? 168)

/**
 * `docker.pruneBuilder()` из dockerode фильтры НЕ поддерживает: его `PruneBuilderOptions`
 * содержит только `abortSignal`, а сам метод собирает запрос к `/build/prune` без query
 * (dockerode/lib/docker.js). Поэтому дёргаем эндпоинт напрямую через modem.
 */
async function pruneBuilderOlderThan(hours: number): Promise<BuilderPruneResponse> {
  const filters = JSON.stringify({ until: [`${hours}h`] })
  const query = new URLSearchParams({ filters }).toString()

  return new Promise<BuilderPruneResponse>((resolve, reject) => {
    docker.modem.dial(
      {
        path: `/build/prune?${query}`,
        method: 'POST',
        statusCodes: { 200: true, 500: 'server error' },
      },
      (err: Error | null, data: unknown) => {
        if (err) {
          reject(err)
          return
        }
        resolve((data ?? {}) as BuilderPruneResponse)
      },
    )
  })
}

export async function runDockerPrune(): Promise<DockerPruneResult> {
  const checkedAt = new Date().toISOString()

  const imageResult = (await docker.pruneImages()) as ImagePruneResponse
  const builderResult = await pruneBuilderOlderThan(BUILDER_CACHE_KEEP_HOURS)

  const result: DockerPruneResult = {
    checkedAt,
    imagesDeleted: imageResult.ImagesDeleted?.length ?? 0,
    imagesReclaimedBytes: imageResult.SpaceReclaimed ?? 0,
    builderReclaimedBytes: builderResult.SpaceReclaimed ?? 0,
  }

  const totalMb = (result.imagesReclaimedBytes + result.builderReclaimedBytes) / 1024 / 1024
  console.warn(
    `[DockerPrune] Удалено dangling-образов: ${result.imagesDeleted}, освобождено: ${totalMb.toFixed(1)}MB `
      + `(build cache старше ${BUILDER_CACHE_KEEP_HOURS}ч)`,
  )

  return result
}
