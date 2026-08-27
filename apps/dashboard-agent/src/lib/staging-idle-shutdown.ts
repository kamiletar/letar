/**
 * Плановая остановка простаивающих staging-контейнеров на s3 (PLAN-INFRA §77, разбор —
 * `.claude/docs/s3-staging-host-memory-pressure.md`).
 *
 * `deploy-affected.sh --staging` пересоздаёт только сервис `app` (`up -d --force-recreate app`),
 * `db` остаётся жить между деплоями — поэтому источник «когда было последнее использование» это
 * время создания контейнера `<app>-staging-app`, не `<app>-staging-db`. e2e-прогон всегда идёт
 * сразу после деплоя (тот же вызов пайплайна), так что возраст app-контейнера — приемлемый прокси
 * и для «когда последний раз гоняли e2e».
 *
 * Гасим оба контейнера пары (`app`+`db`) через `docker stop` — не `rm`: данные volume остаются,
 * следующий `docker compose up` просто стартует существующие контейнеры заново, без пересборки.
 */

import { docker } from './docker'

export interface StagingIdleShutdownResult {
  checkedAt: string
  idleHoursThreshold: number
  stopped: Array<{ app: string; containers: string[]; idleHours: number }>
  skipped: Array<{ app: string; idleHours: number }>
}

/** Часов простоя (с момента последнего `--force-recreate app`) до остановки. Переопределяется env. */
const IDLE_HOURS = Number(process.env['STAGING_IDLE_SHUTDOWN_HOURS'] ?? 24)

const STAGING_APP_SUFFIX = '-staging-app'
const STAGING_DB_SUFFIX = '-staging-db'

export async function runStagingIdleShutdown(): Promise<StagingIdleShutdownResult> {
  const checkedAt = new Date().toISOString()
  const nowSec = Date.now() / 1000

  const containers = await docker.listContainers({ all: false })

  const stopped: StagingIdleShutdownResult['stopped'] = []
  const skipped: StagingIdleShutdownResult['skipped'] = []

  for (const c of containers) {
    const name = c.Names[0]?.replace(/^\//, '') ?? ''
    if (!name.endsWith(STAGING_APP_SUFFIX)) {
      continue
    }

    const app = name.slice(0, -STAGING_APP_SUFFIX.length)
    const idleHours = (nowSec - c.Created) / 3600

    if (idleHours < IDLE_HOURS) {
      skipped.push({ app, idleHours: Math.round(idleHours * 10) / 10 })
      continue
    }

    const stoppedNames: string[] = []

    try {
      await docker.getContainer(c.Id).stop()
      stoppedNames.push(name)
    } catch (error) {
      console.error(`[StagingIdleShutdown] Не удалось остановить ${name}:`, error)
      continue
    }

    // db-контейнер пары — гасим, только если ещё жив (мог быть уже остановлен вручную ранее)
    const dbName = `${app}${STAGING_DB_SUFFIX}`
    const dbContainer = containers.find((x) => x.Names[0]?.replace(/^\//, '') === dbName)
    if (dbContainer) {
      try {
        await docker.getContainer(dbContainer.Id).stop()
        stoppedNames.push(dbName)
      } catch (error) {
        console.error(`[StagingIdleShutdown] Не удалось остановить ${dbName}:`, error)
      }
    }

    stopped.push({ app, containers: stoppedNames, idleHours: Math.round(idleHours * 10) / 10 })
  }

  if (stopped.length > 0) {
    console.warn(
      `[StagingIdleShutdown] Остановлено ${stopped.length} staging-приложений (простой ≥${IDLE_HOURS}ч): `
        + stopped.map((s) => `${s.app} (${s.idleHours}ч)`).join(', '),
    )
  }

  return { checkedAt, idleHoursThreshold: IDLE_HOURS, stopped, skipped }
}
