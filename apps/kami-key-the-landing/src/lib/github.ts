import { fetchReleases, formatFileSize, type GitHubRelease } from '@letar/github-releases'

const OWNER = 'kamiletar'
const REPO = 'letar'
/** kami-key-the публикует релизы в общем монорепо letar — теги вида kami-key-the-v1.7.2 */
const TAG_PREFIX = 'kami-key-the-v'

export interface ParsedRelease {
  version: string
  date: string
  body: string | null
  exeSize: string | null
  exeUrl: string | null
}

function parseRelease(release: GitHubRelease): ParsedRelease {
  const exeAsset = release.assets.find((asset) => asset.name.endsWith('.exe')) ?? null

  return {
    version: release.tag_name.replace(TAG_PREFIX, ''),
    date: new Date(release.published_at).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    body: release.body,
    exeSize: exeAsset ? formatFileSize(exeAsset.size) : null,
    exeUrl: exeAsset?.browser_download_url ?? null,
  }
}

/** Все опубликованные релизы kami-key-the, новые сначала. */
export async function getReleases(): Promise<ParsedRelease[]> {
  const releases = await fetchReleases({
    owner: OWNER,
    repo: REPO,
    tagPrefix: TAG_PREFIX,
    token: process.env.GITHUB_TOKEN,
    limit: 30,
  })

  return releases.map(parseRelease)
}
