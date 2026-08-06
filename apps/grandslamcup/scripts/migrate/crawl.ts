/**
 * Краулер страниц grandslamcup.ru (Tilda)
 * Скачивает HTML страницы в cache/ директорию
 */
import * as cheerio from 'cheerio'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = 'https://grandslamcup.ru'
const CACHE_DIR = join(import.meta.dirname, 'cache')
const DELAY_MS = 1000

/** Пауза между запросами */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Скачать страницу и сохранить в cache */
async function fetchPage(slug: string): Promise<string | null> {
  const safeSlug = (slug || 'index').replace(/\//g, '__')
  const filePath = join(CACHE_DIR, `${safeSlug}.html`)
  if (existsSync(filePath)) {
    console.log(`  [cache] ${slug || '/'} — уже скачан`)
    return Bun.file(filePath).text()
  }

  const url = slug ? `${BASE_URL}/${slug}` : BASE_URL
  console.log(`  [fetch] ${url}`)

  try {
    const res = await fetch(url)
    if (res.status !== 200) {
      console.log(`  [skip] ${slug} — ${res.status}`)
      return null
    }
    const html = await res.text()
    writeFileSync(filePath, html, 'utf-8')
    await sleep(DELAY_MS)
    return html
  } catch (err) {
    console.log(`  [error] ${slug} — ${err}`)
    return null
  }
}

/** Извлечь внутренние ссылки из HTML */
function extractLinks(html: string): Set<string> {
  const doc = cheerio.load(html)
  const links = new Set<string>()

  doc('a[href]').each((_, el) => {
    const href = doc(el).attr('href')
    if (!href) {
      return
    }

    let slug: string | null = null

    // Внутренняя ссылка типа /slug
    if (href.startsWith('/') && !href.startsWith('//')) {
      slug = href.slice(1).split('#')[0].split('?')[0]
    } // Полный URL grandslamcup.ru/slug
    else if (href.includes('grandslamcup.ru/')) {
      const match = href.match(/grandslamcup\.ru\/([a-z0-9/_-]+)/i)
      if (match) {
        slug = match[1]
      }
    }

    if (slug && slug.length > 0 && !slug.includes('.')) {
      links.add(slug)
    }
  })

  return links
}

export async function crawl() {
  console.log('🕷️  Crawl grandslamcup.ru\n')

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }

  const visited = new Set<string>()
  const queue = ['', 'results', 'rules'] // начальные страницы

  // Известные slug'и команд (подтверждённые 200)
  const knownTeamSlugs = ['obormots', 'vinom', 'chumnie']
  for (const slug of knownTeamSlugs) {
    queue.push(slug)
  }

  let totalPages = 0

  while (queue.length > 0) {
    const slug = queue.shift()!
    if (visited.has(slug)) {
      continue
    }
    visited.add(slug)

    const html = await fetchPage(slug)
    if (!html) {
      continue
    }
    totalPages++

    // Извлечь и добавить новые ссылки
    const links = extractLinks(html)
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link)
      }
    }
  }

  console.log(`\n✅ Скачано ${totalPages} страниц`)
  return totalPages
}

// Запуск напрямую
if (import.meta.main) {
  crawl()
}
