export interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

export interface GitHubRelease {
  tag_name: string
  published_at: string
  body: string | null
  draft: boolean
  prerelease: boolean
  assets: GitHubReleaseAsset[]
}
