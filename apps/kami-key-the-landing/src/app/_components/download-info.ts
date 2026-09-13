import type { DownloadInfo } from '@/lib/github'

/**
 * Резервные данные для кнопки скачивания — используются, только если GitHub API недоступен
 * (`getLatestDownload()` в `lib/github.ts` вернул `null`). В обычном режиме версия/размер/URL
 * приходят динамически из GitHub Releases, эти константы вручную обновлять больше не нужно.
 */
export const FALLBACK_DOWNLOAD: DownloadInfo = {
  version: '1.7.4',
  size: '107.4 MB',
  url: 'https://github.com/kamiletar/letar/releases/download/kami-key-the-v1.7.4/KamiKeyThe-Setup-1.7.4.exe',
}
