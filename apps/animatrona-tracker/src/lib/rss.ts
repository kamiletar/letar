/**
 * Генерация RSS 2.0 XML для каталога аниме.
 *
 * Используется в /api/rss/feed.xml и /api/rss/genre/[slug].xml
 */

/** Одна запись для RSS фида */
export interface RssItem {
  /** Заголовок (название аниме) */
  title: string
  /** Ссылка на страницу аниме */
  link: string
  /** Описание (жанры, год, количество эпизодов) */
  description: string
  /** Дата публикации (ISO) */
  pubDate: string
  /** Уникальный идентификатор */
  guid: string
  /** URL постера */
  imageUrl?: string
  /** Жанры (для <category>) */
  genres?: string[]
}

/** Экранирование XML-спецсимволов */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Сгенерировать RSS 2.0 XML */
export function generateRssXml(options: {
  title: string
  description: string
  link: string
  feedUrl: string
  items: RssItem[]
}): string {
  const { title, description, link, feedUrl, items } = options

  const itemsXml = items
    .map((item) => {
      const categories = (item.genres ?? []).map((g) => `      <category>${escapeXml(g)}</category>`).join('\n')

      const imageTag = item.imageUrl
        ? `      <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" length="0" />`
        : ''

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
${categories}
${imageTag}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Animatrona Tracker</generator>
${itemsXml}
  </channel>
</rss>`
}
