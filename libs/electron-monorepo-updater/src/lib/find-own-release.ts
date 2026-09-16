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

/**
 * Сравнивает два semver вида `X.Y.Z` (без суффиксов пререлиза — им тут взяться неоткуда, `draft`
 * и `prerelease` уже отфильтрованы выше). Возвращает > 0, если `a` новее `b`.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
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

  // ⚠️ Порядок ответа GitHub API НЕ считаем надёжным индикатором «свежести» — в общем репозитории
  // с частыми релизами десятков приложений список `/releases` эмпирически может держать
  // только что созданный релиз не на первой позиции продолжительное время (не секунды —
  // проверено вживую, 1.9.10 не поднимался в топ 30+ минут при `per_page=100` и всего 9
  // релизах в ответе). Поэтому среди всех совпадений по префиксу тега выбираем максимальный
  // semver сами, а не полагаемся на `.find()` по порядку ответа.
  const releases = (await response.json()) as GithubReleaseSummary[]
  const own = releases.filter((r) => !r.draft && !r.prerelease && r.tag_name.startsWith(tagPrefix))
  if (own.length === 0) {
    return null
  }
  const latest = own.reduce((best, current) =>
    compareSemver(current.tag_name.slice(tagPrefix.length), best.tag_name.slice(tagPrefix.length)) > 0
      ? current
      : best
  )
  return latest.tag_name
}
