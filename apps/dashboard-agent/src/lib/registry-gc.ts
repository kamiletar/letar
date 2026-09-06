/**
 * Ретеншн тегов self-hosted Docker Registry (s3, infra/registry, PLAN-INFRA-6.md §157) —
 * TS-порт `scripts/registry-gc.sh` для планового запуска через cron dashboard-agent, а не
 * только вручную (infra/registry/README.md § «Ретеншн тегов»).
 *
 * Логика 1:1 повторяет bash-скрипт (сохранён и продолжает работать для ручного запуска —
 * не удаляем, DRY_RUN-прогон руками из README всё ещё нужен). Отличия неизбежны из-за среды:
 * - Здесь нет `curl`/`jq` (в Dockerfile.production dashboard-agent их нет, только
 *   `git`/`openssh-client`/`docker-cli`) — HTTP через `fetch`, JSON через сам JS.
 * - Финальный `docker exec registry bin/registry garbage-collect` — не через `docker-cli`,
 *   а через уже используемый в этом приложении `dockerode`-клиент (см. `docker.ts`,
 *   `database.ts` — тот же паттерн container.exec()+start() для pg_dump внутри контейнера БД).
 *
 * SHA-теги — те же 7-12 hex символов, что и в bash-версии (deploy-affected.sh тегирует
 * `<app>:<git-short-sha>`). Плавающие теги (`:latest`, `:staging`) не трогаем — это не история
 * версий, а текущий деплой.
 */

import { docker } from './docker'

export interface RegistryGcResult {
  checkedAt: string
  keepTags: number
  dryRun: boolean
  reposScanned: number
  tagsDeleted: number
  deletedByRepo: Record<string, string[]>
  garbageCollectRan: boolean
}

interface TagInfo {
  tag: string
  digest: string
  created: string
}

const SHA_TAG_RE = /^[0-9a-f]{7,12}$/

function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
}

async function fetchJson<T>(url: string, authHeader: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: authHeader } })
  if (!response.ok) {
    throw new Error(`GET ${url} → HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/** Дата создания образа — есть только в JSON-конфиге (blob), не в списке тегов registry API. */
async function getTagInfo(
  registryUrl: string,
  repo: string,
  tag: string,
  authHeader: string,
): Promise<TagInfo | null> {
  const manifestUrl = `${registryUrl}/v2/${repo}/manifests/${tag}`
  const manifestHeaders = {
    Authorization: authHeader,
    Accept: 'application/vnd.docker.distribution.manifest.v2+json',
  }

  const manifestResponse = await fetch(manifestUrl, { headers: manifestHeaders })
  if (!manifestResponse.ok) {
    return null
  }
  const digest = manifestResponse.headers.get('docker-content-digest')
  if (!digest) {
    return null
  }

  const manifest = (await manifestResponse.json()) as { config?: { digest?: string } }
  const configDigest = manifest.config?.digest
  if (!configDigest) {
    return null
  }

  const config = await fetchJson<{ created?: string }>(
    `${registryUrl}/v2/${repo}/blobs/${configDigest}`,
    authHeader,
  )
  if (!config.created) {
    return null
  }

  return { tag, digest, created: config.created }
}

/** Манифесты одного репозитория, отобранные на удаление (все, кроме keepTags самых новых). */
async function planRepoDeletions(
  registryUrl: string,
  repo: string,
  keepTags: number,
  authHeader: string,
): Promise<TagInfo[]> {
  const tagsList = await fetchJson<{ tags?: string[] }>(`${registryUrl}/v2/${repo}/tags/list`, authHeader)
  const shaTags = (tagsList.tags ?? []).filter((tag) => SHA_TAG_RE.test(tag))
  if (shaTags.length === 0) {
    return []
  }

  const infos: TagInfo[] = []
  for (const tag of shaTags) {
    const info = await getTagInfo(registryUrl, repo, tag, authHeader)
    if (info) {
      infos.push(info)
    }
  }

  infos.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0))
  return infos.slice(keepTags)
}

/**
 * `docker exec registry bin/registry garbage-collect` через dockerode — тот же паттерн, что
 * `backupDatabase()` в `database.ts` использует для `pg_dump` внутри контейнера БД.
 */
async function runGarbageCollect(): Promise<void> {
  const container = docker.getContainer('registry')
  const dockerExec = await container.exec({
    Cmd: ['bin/registry', 'garbage-collect', '/etc/docker/registry/config.yml'],
    AttachStdout: true,
    AttachStderr: true,
  })

  const stream = await dockerExec.start({ hijack: true, stdin: false })
  await new Promise<void>((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
    setTimeout(() => reject(new Error('registry garbage-collect timeout')), 300_000)
  })

  const info = await dockerExec.inspect()
  if (info.ExitCode !== 0) {
    throw new Error(`registry garbage-collect завершился с кодом ${info.ExitCode}`)
  }
}

export async function runRegistryGc(): Promise<RegistryGcResult> {
  const checkedAt = new Date().toISOString()
  const registryUrl = process.env['REGISTRY_URL'] || 'https://registry.s3.letar.best'
  const registryUser = process.env['REGISTRY_USER']
  const registryPass = process.env['REGISTRY_PASS']
  const keepTags = Number(process.env['REGISTRY_GC_KEEP_TAGS'] ?? 3)
  const dryRun = process.env['REGISTRY_GC_DRY_RUN'] === 'true'

  if (!registryUser || !registryPass) {
    throw new Error(
      'REGISTRY_USER/REGISTRY_PASS не заданы — секрет не смонтирован в .env.docker dashboard-agent на s3',
    )
  }

  const authHeader = basicAuthHeader(registryUser, registryPass)

  const catalog = await fetchJson<{ repositories?: string[] }>(`${registryUrl}/v2/_catalog?n=1000`, authHeader)
  const repos = catalog.repositories ?? []

  const deletedByRepo: Record<string, string[]> = {}
  let tagsDeleted = 0

  for (const repo of repos) {
    const toDelete = await planRepoDeletions(registryUrl, repo, keepTags, authHeader)
    if (toDelete.length === 0) {
      continue
    }

    const deletedTags: string[] = []
    for (const { tag, digest, created } of toDelete) {
      console.warn(`[RegistryGc] удаляю ${repo}:${tag} (создан ${created}, ${digest})`)
      if (!dryRun) {
        const deleteResponse = await fetch(`${registryUrl}/v2/${repo}/manifests/${digest}`, {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        })
        if (!deleteResponse.ok) {
          throw new Error(`DELETE ${repo}:${tag} (${digest}) → HTTP ${deleteResponse.status}`)
        }
      }
      deletedTags.push(tag)
    }

    deletedByRepo[repo] = deletedTags
    tagsDeleted += deletedTags.length
  }

  let garbageCollectRan = false
  if (tagsDeleted > 0 && !dryRun) {
    console.warn('[RegistryGc] запускаю garbage-collect внутри контейнера registry...')
    await runGarbageCollect()
    garbageCollectRan = true
  }

  console.warn(
    `[RegistryGc] Готово: репозиториев проверено ${repos.length}, тегов удалено ${tagsDeleted}${
      dryRun ? ' (DRY_RUN)' : ''
    }`,
  )

  return {
    checkedAt,
    keepTags,
    dryRun,
    reposScanned: repos.length,
    tagsDeleted,
    deletedByRepo,
    garbageCollectRan,
  }
}
