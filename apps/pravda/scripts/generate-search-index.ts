/**
 * Скрипт генерации поискового индекса из MDX файлов.
 *
 * Читает все MDX файлы из apps/pravda/src/app/(docs)/
 * и создаёт индекс для Fuse.js поиска.
 *
 * Запуск: bun run apps/pravda/scripts/generate-search-index.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { getCategoryFromPath, getDocumentBySlug } from '../src/lib/documents'

// Директория с документами
const DOCS_DIR = 'apps/pravda/src/app/(docs)'
const OUTPUT_FILE = 'apps/pravda/src/lib/search-index.ts'

interface SearchItem {
  id: string
  title: string
  href: string
  category: string
  articleNumber?: string
  content: string
}

/**
 * Рекурсивно находит все MDX файлы
 */
function findMdxFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        files.push(...findMdxFiles(fullPath))
      } else if (entry === 'page.mdx') {
        files.push(fullPath)
      }
    }
  } catch {
    // Игнорируем ошибки доступа
  }

  return files
}

/**
 * Парсит путь файла и возвращает информацию о документе.
 * Использует единый реестр документов из lib/documents.ts.
 */
function parseFilePath(filePath: string): { slug: string; category: string; title: string; href: string } {
  // Нормализуем путь
  const normalizedPath = filePath.replace(/\\/g, '/')

  // Извлекаем часть после (docs)/
  const match = normalizedPath.match(/\(docs\)\/(.+)\/page\.mdx$/)
  if (!match) {
    return { slug: '', category: 'Основные законы', title: '', href: '/' }
  }

  const relativePath = match[1]
  const parts = relativePath.split('/')
  const slug = parts[parts.length - 1]
  const href = '/' + relativePath

  // Используем единый реестр документов
  const doc = getDocumentBySlug(slug)
  const title = doc?.title || slug
  const category = getCategoryFromPath(href)

  return { slug, category, title, href }
}

/**
 * Извлекает статьи из MDX контента
 */
function extractArticles(content: string, docInfo: ReturnType<typeof parseFilePath>): SearchItem[] {
  const items: SearchItem[] = []

  // Regex для поиска статей: <Article number="...">текст</Article>
  const articleRegex = /<Article number="([^"]+)">\s*([\s\S]*?)\s*<\/Article>/g

  let match
  while ((match = articleRegex.exec(content)) !== null) {
    const articleNumber = match[1]
    let articleContent = match[2]

    // Очищаем контент от markdown разметки
    articleContent = articleContent
      .replace(/<[^>]+>/g, '') // Удаляем HTML теги
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1') // *italic* -> italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](link) -> text
      .replace(/#{1,6}\s+/g, '') // Удаляем заголовки
      .replace(/^[-*+]\s+/gm, '') // Удаляем маркеры списков
      .replace(/^\d+\.\s+/gm, '') // Удаляем нумерацию списков
      .replace(/\|[^|]+\|/g, ' ') // Удаляем таблицы
      .replace(/---+/g, '') // Удаляем разделители
      .replace(/\n+/g, ' ') // Заменяем переносы на пробелы
      .replace(/\s+/g, ' ') // Убираем лишние пробелы
      .trim()

    // Ограничиваем длину контента для индекса
    if (articleContent.length > 500) {
      articleContent = articleContent.substring(0, 500) + '...'
    }

    if (articleContent) {
      items.push({
        id: `${docInfo.slug}-${articleNumber}`,
        title: docInfo.title,
        href: `${docInfo.href}#article-${articleNumber}`,
        category: docInfo.category,
        articleNumber,
        content: articleContent,
      })
    }
  }

  return items
}

/**
 * Генерирует TypeScript код для индекса
 */
function generateIndexCode(items: SearchItem[]): string {
  const itemsJson = JSON.stringify(items, null, 2)
    .replace(/"([^"]+)":/g, '$1:') // Убираем кавычки с ключей
    .replace(/"/g, "'") // Заменяем двойные кавычки на одинарные

  return `/**
 * Индекс документов для поиска.
 * Автоматически сгенерирован из MDX файлов.
 *
 * @generated
 * Не редактируйте вручную! Запустите: bun run apps/pravda/scripts/generate-search-index.ts
 */

export interface SearchItem {
  /** ID документа */
  id: string
  /** Заголовок документа */
  title: string
  /** URL документа */
  href: string
  /** Категория */
  category: string
  /** Номер статьи (если есть) */
  articleNumber?: string
  /** Текст для поиска */
  content: string
}

/**
 * Индекс документов для fuzzy-поиска.
 */
export const searchIndex: SearchItem[] = ${itemsJson}
`
}

/**
 * Главная функция
 */
function main(): void {
  console.log('🔍 Генерация поискового индекса...\n')

  // Находим все MDX файлы
  const mdxFiles = findMdxFiles(DOCS_DIR)
  console.log(`📄 Найдено MDX файлов: ${mdxFiles.length}\n`)

  const allItems: SearchItem[] = []

  // Обрабатываем каждый файл
  for (const file of mdxFiles) {
    const docInfo = parseFilePath(file)
    if (!docInfo.title) {
      continue
    }

    const content = readFileSync(file, 'utf-8')
    const articles = extractArticles(content, docInfo)

    if (articles.length > 0) {
      console.log(`✅ ${docInfo.title}: ${articles.length} статей`)
      allItems.push(...articles)
    }
  }

  console.log(`\n📊 Всего статей в индексе: ${allItems.length}`)

  // Генерируем и записываем индекс
  const code = generateIndexCode(allItems)
  writeFileSync(OUTPUT_FILE, code, 'utf-8')

  console.log(`\n✨ Индекс сохранён: ${OUTPUT_FILE}`)
}

main()
