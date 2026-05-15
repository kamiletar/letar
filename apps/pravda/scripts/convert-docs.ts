/**
 * Скрипт конвертации документов из markdown в MDX
 *
 * Читает файлы из C:\web\pravda\ и конвертирует их в MDX формат
 * с использованием компонентов Article, Section, Chapter и др.
 *
 * Запуск: bun run apps/pravda/scripts/convert-docs.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Маппинг файлов на URL-пути
const FILE_MAPPING: Record<string, string> = {
  'constitution.md': 'конституция',
  'russkaya_pravda_modern.md': 'правда',
  'tax_code.md': 'кодексы/налоговый',
  'penal_code.md': 'кодексы/уголовный',
  'family_code.md': 'кодексы/семейный',
  'labor_code.md': 'кодексы/трудовой',
  'digital_code.md': 'кодексы/цифровой',
  'medical_code.md': 'кодексы/медицинский',
  'ordeal_code.md': 'кодексы/ордалий',
  'criminal_procedure_code.md': 'кодексы/уголовно-процессуальный',
  'penitentiary_code.md': 'кодексы/уголовно-исполнительный',
  'construction_code.md': 'кодексы/строительный',
  'state_secrets_code.md': 'кодексы/государственных-тайн',
  'church_charter.md': 'уставы/церковный',
  'trade_charter.md': 'уставы/торговый',
  'military_charter.md': 'уставы/военный',
  'education_charter.md': 'уставы/образовательный',
  'road_charter.md': 'уставы/дорожный',
  'postal_charter.md': 'уставы/почтовый',
  'fair_charter.md': 'уставы/ярмарочный',
  'duel_regulations.md': 'регламенты/дуэльный',
  'veche_regulation.md': 'регламенты/вечевой',
  'volost_regulation.md': 'регламенты/волостной',
}

// Директории
const SOURCE_DIR = 'C:\\web\\pravda'
const TARGET_DIR = 'apps/pravda/src/app/(docs)'

// Регулярные выражения для парсинга
const SECTION_REGEX = /^## (РАЗДЕЛ [IVX\d-А-Яа-я]+\.?\s*(.+)?)$/
const CHAPTER_REGEX = /^### Глава (\d+[а-я]?)\.?\s*(.+)?$/
const ARTICLE_REGEX = /^\*\*Статья (\d+[а-я-]*)\.\*\*\s*(.*)$/

/**
 * Конвертирует markdown в MDX с компонентами
 * Использует построчную обработку для правильного закрытия тегов
 */
function convertToMdx(content: string): string {
  // Удаляем метаданные README/CLAUDE
  if (content.includes('# README') || content.includes('# CLAUDE')) {
    return ''
  }

  const lines = content.split('\n')
  const output: string[] = []

  // Стек открытых тегов
  let sectionOpen = false
  let chapterOpen = false
  let articleOpen = false
  let sectionCount = 0

  // Буфер для контента статьи
  let articleBuffer: string[] = []

  /**
   * Закрывает статью если открыта
   */
  function closeArticle(): void {
    if (articleOpen) {
      // Добавляем накопленный контент статьи
      if (articleBuffer.length > 0) {
        output.push(articleBuffer.join('\n'))
        articleBuffer = []
      }
      output.push('</Article>')
      output.push('')
      articleOpen = false
    }
  }

  /**
   * Закрывает главу если открыта
   */
  function closeChapter(): void {
    closeArticle()
    if (chapterOpen) {
      output.push('</Chapter>')
      output.push('')
      chapterOpen = false
    }
  }

  /**
   * Закрывает раздел если открыт
   */
  function closeSection(): void {
    closeChapter()
    if (sectionOpen) {
      output.push('</Section>')
      output.push('')
      sectionOpen = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Проверяем на Section
    const sectionMatch = line.match(SECTION_REGEX)
    if (sectionMatch) {
      closeSection()
      sectionCount++
      const title = sectionMatch[1].trim()
      output.push(`<Section id="${sectionCount}" title="${title}">`)
      output.push('')
      sectionOpen = true
      continue
    }

    // Проверяем на Chapter
    const chapterMatch = line.match(CHAPTER_REGEX)
    if (chapterMatch) {
      closeChapter()
      const number = chapterMatch[1]
      const title = chapterMatch[2]?.trim() || ''
      output.push(`<Chapter number="${number}" title="${title}">`)
      output.push('')
      chapterOpen = true
      continue
    }

    // Проверяем на Article
    const articleMatch = line.match(ARTICLE_REGEX)
    if (articleMatch) {
      closeArticle()
      const number = articleMatch[1]
      const text = articleMatch[2]?.trim() || ''
      output.push(`<Article number="${number}">`)
      if (text) {
        articleBuffer.push(text)
      }
      articleOpen = true
      continue
    }

    // Обычная строка
    if (articleOpen) {
      // Внутри статьи — добавляем в буфер
      articleBuffer.push(line)
    } else {
      // Вне статьи — добавляем как есть
      output.push(line)
    }
  }

  // Закрываем все открытые теги в конце
  closeSection()

  return output.join('\n')
}

/**
 * Обрабатывает один файл
 */
function processFile(filename: string): void {
  const targetPath = FILE_MAPPING[filename]
  if (!targetPath) {
    console.log(`⏭️  Пропускаем: ${filename} (нет маппинга)`)
    return
  }

  const sourcePath = join(SOURCE_DIR, filename)
  const targetDir = join(TARGET_DIR, targetPath)
  const targetFile = join(targetDir, 'page.mdx')

  // Проверяем, существует ли исходный файл
  if (!existsSync(sourcePath)) {
    console.log(`⚠️  Файл не найден: ${sourcePath}`)
    return
  }

  // Читаем исходный файл
  const content = readFileSync(sourcePath, 'utf-8')

  // Конвертируем
  const mdxContent = convertToMdx(content)

  if (!mdxContent) {
    console.log(`⏭️  Пропускаем: ${filename} (пустой контент)`)
    return
  }

  // Создаём директорию если нужно
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // Записываем MDX файл
  writeFileSync(targetFile, mdxContent, 'utf-8')
  console.log(`✅ Конвертирован: ${filename} -> ${targetPath}`)
}

/**
 * Главная функция
 */
function main(): void {
  console.log('🚀 Начинаем конвертацию документов...\n')

  // Получаем список файлов
  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.md'))
  console.log(`📄 Найдено файлов: ${files.length}\n`)

  // Обрабатываем каждый файл
  for (const file of files) {
    processFile(file)
  }

  console.log('\n✨ Конвертация завершена!')
}

main()
