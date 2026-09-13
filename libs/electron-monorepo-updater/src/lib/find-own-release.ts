/**
 * Приложения этого монорепо (`kamiletar/letar`) публикуют GitHub Releases в один общий
 * репозиторий, различая их только префиксом тега (`<app>-v<semver>`). Штатный `GithubProvider`
 * electron-updater всегда бьёт в repo-wide `GET /repos/{owner}/{repo}/releases/latest` — это
 * самый свежий релиз ЛЮБОГО приложения репозитория, не обязательно того, что его запросило.
 * Разбор конкретного инцидента и почему нельзя просто довериться `/latest` —
 * `.claude/docs/electron-monorepo-shared-releases.md`.
 *
 * `findOwnLatestTag` ищет свой тег через `GET /releases` (не `/latest`) по префиксу.
 */

export interface GithubReleaseSummary {
  tag_name: string
  draft: boolean
  prerelease: boolean
}

/**
 * Минимальный интерфейс `fetch`, которого нам достаточно — узкий специально: сигнатура
 * `net.fetch` из Electron не совпадает с DOM `typeof fetch` (не принимает `URL` первым
 * аргументом), а нам эта разница не важна — мы всегда вызываем с `string` и `headers`.
 */
export interface MinimalFetch {
  (url: string, init: { headers: Record<string, string> }): Promise<{
    ok: boolean
    status: number
    json(): Promise<unknown>
  }>
}

export interface FindOwnLatestTagOptions {
  /** `fetch`-совместимая функция — в Electron main-процессе это `net.fetch` */
  fetchFn: MinimalFetch
  owner: string
  repo: string
  /** Префикс тега конкретного приложения, например `animatrona-v` */
  tagPrefix: string
  /** Значение заголовка User-Agent — GitHub API требует его на каждый запрос */
  userAgent: string
  /** Сколько релизов запросить за один раз (сортировка — свежие первыми) */
  perPage?: number
}

/** Найти тег последнего (не draft, не prerelease) релиза с заданным префиксом тега */
export async function findOwnLatestTag(options: FindOwnLatestTagOptions): Promise<string | null> {
  const { fetchFn, owner, repo, tagPrefix, userAgent, perPage = 50 } = options

  const response = await fetchFn(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}`, {
    headers: { 'User-Agent': userAgent, Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`GitHub API вернул ${response.status}`)
  }

  // GitHub возвращает релизы отсортированными по дате публикации (свежие первыми)
  const releases = (await response.json()) as GithubReleaseSummary[]
  const own = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith(tagPrefix))
  return own?.tag_name ?? null
}
