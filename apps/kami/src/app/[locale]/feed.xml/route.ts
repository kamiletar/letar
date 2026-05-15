import { reader } from '@/lib/keystatic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'

type RouteContext = {
  params: Promise<{ locale: string }>
}

/**
 * Генерирует RSS-фид для блога
 * @param locale - 'ru' или 'en'
 */
async function generateRssFeed(locale: string): Promise<string> {
  const posts = await reader.collections.posts.all()
  const isRu = locale === 'ru'

  // Сортируем по дате (новые первыми)
  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.entry.publishedAt || 0)
    const dateB = new Date(b.entry.publishedAt || 0)
    return dateB.getTime() - dateA.getTime()
  })

  const feedTitle = isRu ? 'Ками Летар — Блог' : 'Kami Letar — Blog'
  const feedDescription = isRu
    ? 'Статьи о фронтенд-разработке, архитектуре и инструментах'
    : 'Articles about frontend development, architecture and tools'
  const feedLanguage = isRu ? 'ru' : 'en'
  const feedUrl = `${BASE_URL}/${locale}/`
  const feedLink = `${BASE_URL}/${locale}/feed.xml/`

  const items = sortedPosts
    .map((post) => {
      const title = isRu ? post.entry.title : post.entry.titleEn
      const description = isRu ? post.entry.description : post.entry.descriptionEn
      const pubDate = post.entry.publishedAt ? new Date(post.entry.publishedAt).toUTCString() : new Date().toUTCString()
      const link = `${BASE_URL}/${locale}/blog/${post.slug}/`

      // Экранируем XML-символы
      const escapeXml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      ${post.entry.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ') || ''}
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${feedTitle}</title>
    <link>${feedUrl}</link>
    <description>${feedDescription}</description>
    <language>${feedLanguage}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedLink}" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
    ${items}
  </channel>
</rss>`
}

export async function GET(_request: Request, context: RouteContext) {
  const { locale } = await context.params
  const feed = await generateRssFeed(locale)

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
