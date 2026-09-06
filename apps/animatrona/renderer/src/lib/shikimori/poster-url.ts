/**
 * Приведение URL постера Shikimori к абсолютному виду
 */

/** Возвращает полный URL постера — Shikimori иногда отдаёт относительный путь без домена */
export function getShikimoriPosterUrl(mainUrl: string | null | undefined): string | null {
  if (!mainUrl) {
    return null
  }
  if (mainUrl.startsWith('http://') || mainUrl.startsWith('https://')) {
    return mainUrl
  }
  return `https://shikimori.one${mainUrl}`
}
