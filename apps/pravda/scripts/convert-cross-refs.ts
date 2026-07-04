/**
 * Скрипт для преобразования текстовых перекрёстных ссылок в компоненты CrossRef.
 *
 * Ищет паттерны вида:
 * - (см. Название документа)
 * - (см. Название, Раздел X)
 * - (см. Название, Статья X)
 * - (см. также Название, ...)
 *
 * И заменяет их на:
 * <CrossRef to="/path" doc="Название" section="Раздел X" article={N} />
 *
 * Запуск: bun run apps/pravda/scripts/convert-cross-refs.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Маппинг названий документов на slug и категорию
const NAME_TO_DOC: Record<string, { slug: string; category: string }> = {
  // Основные законы
  Конституция: { slug: 'constitution', category: '' },
  'Русская Правда': { slug: 'pravda', category: '' },
  'Основной закон Руси': { slug: 'pravda', category: '' },

  // Кодексы
  'Налоговый кодекс': { slug: 'tax', category: 'codes' },
  'Уголовный кодекс': { slug: 'criminal', category: 'codes' },
  'Уголовно-процессуальный кодекс': { slug: 'criminal-procedure', category: 'codes' },
  УПК: { slug: 'criminal-procedure', category: 'codes' },
  'Семейный кодекс': { slug: 'family', category: 'codes' },
  'Трудовой кодекс': { slug: 'labor', category: 'codes' },
  'Цифровой кодекс': { slug: 'digital', category: 'codes' },
  'Медицинский кодекс': { slug: 'medical', category: 'codes' },
  'Кодекс испытаний и ордалий': { slug: 'ordeals', category: 'codes' },
  'Кодекс ордалий': { slug: 'ordeals', category: 'codes' },
  'Уголовно-исполнительный кодекс': { slug: 'penal', category: 'codes' },
  УИК: { slug: 'penal', category: 'codes' },
  'Строительный кодекс': { slug: 'construction', category: 'codes' },
  'Кодекс государственных тайн': { slug: 'state-secrets', category: 'codes' },
  'Кодекс гос. тайн': { slug: 'state-secrets', category: 'codes' },

  // Уставы
  'Церковный устав': { slug: 'church', category: 'statutes' },
  'Торговый устав': { slug: 'trade', category: 'statutes' },
  'Военный устав': { slug: 'military', category: 'statutes' },
  'Воинский устав': { slug: 'military', category: 'statutes' },
  'Образовательный устав': { slug: 'education', category: 'statutes' },
  'Дорожный устав': { slug: 'road', category: 'statutes' },
  'Почтовый устав': { slug: 'postal', category: 'statutes' },
  'Ярмарочный устав': { slug: 'fair', category: 'statutes' },

  // Регламенты
  'Дуэльный регламент': { slug: 'duel', category: 'regulations' },
  'Вечевой регламент': { slug: 'veche', category: 'regulations' },
  'Муниципальный регламент': { slug: 'municipality', category: 'regulations' },
}

// Формирует URL из slug и категории
function buildHref(slug: string, category: string): string {
  if (category) {
    return `/${category}/${slug}`
  }
  return `/${slug}`
}

// Парсит часть ссылки и определяет раздел/статью
interface ParsedRef {
  docName: string
  section?: string
  article?: string
  anchor?: string
}

function parseRefContent(content: string): ParsedRef | null {
  // Убираем "см." или "см. также" в начале
  const text = content.replace(/^см\.?\s*(также\s*)?/i, '').trim()

  // Пытаемся найти название документа
  // Сортируем по длине чтобы более длинные названия совпадали первыми
  const sortedNames = Object.keys(NAME_TO_DOC).sort((a, b) => b.length - a.length)

  for (const name of sortedNames) {
    if (text.startsWith(name)) {
      const result: ParsedRef = { docName: name }
      let rest = text.slice(name.length).trim()

      // Убираем запятую в начале
      if (rest.startsWith(',')) {
        rest = rest.slice(1).trim()
      }

      if (!rest) {
        return result
      }

      // Парсим дополнительные части
      // Паттерны: "Раздел X", "Глава X", "Статья X", "статья X", "статьи X-Y", "Приложение X"
      const patterns = [
        // Статья с якорем
        /^[Сс]татья\s+(\d+[а-я-]*)/,
        /^[Сс]татьи\s+(\d+[а-я-]*(?:\s*[-–]\s*\d+[а-я-]*)?)/,
        // Раздел/Глава
        /^(Раздел\s+[IVX\d]+)/i,
        /^(Глава\s+\d+[а-я-]*)/i,
        // Приложение
        /^(Приложение\s+\d+)/i,
        // Перечень и другие
        /^(Перечень)/i,
      ]

      for (const pattern of patterns) {
        const match = rest.match(pattern)
        if (match) {
          const matchText = match[0]
          const remaining = rest.slice(matchText.length).trim()

          if (matchText.toLowerCase().startsWith('стать')) {
            // Это статья — добавляем якорь
            const articleNum = match[1].split(/[-–]/)[0].trim()
            result.article = match[1]
            result.anchor = `article-${articleNum}`

            // Проверяем, есть ли ещё что-то после статьи (например, раздел до статьи)
          } else {
            // Это раздел/глава
            result.section = matchText
          }

          // Если есть остаток — смотрим на статью
          if (remaining) {
            const remainingClean = remaining.replace(/^,\s*/, '')
            const articleMatch = remainingClean.match(/^[Сс]татьи?\s+(\d+[а-я-]*(?:\s*[-–]\s*\d+[а-я-]*)?)/)
            if (articleMatch) {
              const articleNum = articleMatch[1].split(/[-–]/)[0].trim()
              result.article = articleMatch[1]
              result.anchor = `article-${articleNum}`
            }
          }

          break
        }
      }

      // Если ничего не распарсили, но есть остаток — это section
      if (!result.section && !result.article && rest) {
        result.section = rest
      }

      return result
    }
  }

  return null
}

// Строит компонент CrossRef
function buildCrossRef(parsed: ParsedRef, also: boolean): string {
  const docInfo = NAME_TO_DOC[parsed.docName]
  if (!docInfo) {
    return '' // Не нашли документ
  }

  let href = buildHref(docInfo.slug, docInfo.category)
  if (parsed.anchor) {
    href += `#${parsed.anchor}`
  }

  const props: string[] = [`to="${href}"`, `doc="${parsed.docName}"`]

  if (parsed.section) {
    props.push(`section="${parsed.section}"`)
  }

  if (parsed.article) {
    // Если article это просто число, используем number, иначе string
    const numericArticle = parsed.article.match(/^(\d+)$/)
    if (numericArticle) {
      props.push(`article={${numericArticle[1]}}`)
    } else {
      props.push(`article="${parsed.article}"`)
    }
  }

  if (also) {
    props.push('also')
  }

  return `<CrossRef ${props.join(' ')} />`
}

// Регулярное выражение для поиска ссылок
// Ищем (см. ...) или (см. также ...)
const CROSS_REF_REGEX = /\(см\.(\s*также)?\s+([^)]+)\)/g

// Обрабатывает содержимое файла
function processContent(content: string, filename: string): { newContent: string; count: number } {
  let count = 0

  const newContent = content.replace(CROSS_REF_REGEX, (match, also, refContent) => {
    const parsed = parseRefContent(refContent.trim())
    if (!parsed) {
      console.log(`  ⚠️  Не распознано: "${match}" в ${filename}`)
      return match // Оставляем как есть
    }

    const crossRef = buildCrossRef(parsed, !!also)
    if (!crossRef) {
      console.log(`  ⚠️  Документ не найден: "${parsed.docName}" в ${filename}`)
      return match // Оставляем как есть
    }

    count++
    return crossRef
  })

  return { newContent, count }
}

// Рекурсивно обходит директорию и обрабатывает MDX файлы
function processDirectory(dir: string): { files: number; refs: number } {
  let filesProcessed = 0
  let refsConverted = 0

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      const result = processDirectory(fullPath)
      filesProcessed += result.files
      refsConverted += result.refs
    } else if (entry.endsWith('.mdx')) {
      const content = readFileSync(fullPath, 'utf-8')

      // Проверяем есть ли ссылки
      if (content.includes('(см.')) {
        const { newContent, count } = processContent(content, entry)

        if (count > 0) {
          writeFileSync(fullPath, newContent, 'utf-8')
          console.log(`✅ ${entry}: ${count} ссылок`)
          filesProcessed++
          refsConverted += count
        }
      }
    }
  }

  return { files: filesProcessed, refs: refsConverted }
}

// Главная функция
function main(): void {
  console.log('🔗 Преобразование перекрёстных ссылок в CrossRef...\n')

  const docsDir = join(process.cwd(), 'apps/pravda/src/app/(docs)')
  const { files, refs } = processDirectory(docsDir)

  console.log(`\n✨ Готово! Обработано ${files} файлов, ${refs} ссылок преобразовано.`)
}

main()
