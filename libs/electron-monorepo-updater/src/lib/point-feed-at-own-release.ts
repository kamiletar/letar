import { findOwnLatestTag, type FindOwnLatestTagOptions } from './find-own-release'

/** Минимальный интерфейс `autoUpdater` из `electron-updater`, который нам нужен */
export interface FeedTargetAutoUpdater {
  setFeedURL(options: { provider: 'generic'; url: string }): void
}

export interface PointFeedAtOwnReleaseOptions extends FindOwnLatestTagOptions {
  /** Логгер для предупреждения, когда свой релиз не найден (по умолчанию — no-op) */
  onNotFound?: (message: string) => void
}

/**
 * Направить `electron-updater` на релиз конкретно этого приложения (не repo-wide "latest").
 * Возвращает `false`, если свой релиз не найден (например, ни разу не публиковались) — в этом
 * случае `autoUpdater.checkForUpdates()` вызывать не нужно.
 */
export async function pointFeedAtOwnRelease(
  autoUpdater: FeedTargetAutoUpdater,
  options: PointFeedAtOwnReleaseOptions,
): Promise<boolean> {
  const { onNotFound, ...findOptions } = options
  const tag = await findOwnLatestTag(findOptions)
  if (!tag) {
    onNotFound?.(`Не найден релиз с префиксом тега "${options.tagPrefix}" в ${options.owner}/${options.repo}`)
    return false
  }
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `https://github.com/${options.owner}/${options.repo}/releases/download/${tag}`,
  })
  return true
}
