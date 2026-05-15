/**
 * Скрипт для исправления путей RSC файлов в статическом экспорте Next.js 16.
 *
 * Проблема: Next.js 16 генерирует RSC payload файлы с вложенной структурой папок:
 *   __next.!KGRvY3Mp/codes/family.txt
 *
 * Но клиентский роутер запрашивает их с точками в имени:
 *   __next.!KGRvY3Mp.codes.family.txt
 *
 * Этот скрипт создаёт симлинки/копии файлов с правильными именами.
 *
 * @see https://github.com/vercel/next.js/issues/85374
 * @see https://blog.axiorema.com/engineering/uncurious-case-broken-static-exports-404s-nextjs-16/
 */

import { cpSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'out')

/**
 * Рекурсивно находит все файлы .txt внутри директорий __next.*
 */
function findRscFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Рекурсивно ищем в поддиректориях
      findRscFiles(fullPath, files)
    } else if (entry.isFile() && entry.name.endsWith('.txt')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Находит все директории страниц в out (содержащие index.html)
 */
function findPageDirs(dir, pageDirs = []) {
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Проверяем есть ли index.html
      if (existsSync(join(fullPath, 'index.html'))) {
        pageDirs.push(fullPath)
      }
      // Рекурсивно ищем в поддиректориях
      findPageDirs(fullPath, pageDirs)
    }
  }

  return pageDirs
}

/**
 * Обрабатывает одну директорию страницы
 */
function processPageDir(pageDir) {
  const entries = readdirSync(pageDir, { withFileTypes: true })

  // Находим все директории __next.*
  const rscDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('__next.'))

  for (const rscDir of rscDirs) {
    const rscDirPath = join(pageDir, rscDir.name)
    const prefix = rscDir.name // например: __next.!KGRvY3Mp

    // Находим все .txt файлы внутри
    const txtFiles = findRscFiles(rscDirPath)

    for (const txtFile of txtFiles) {
      // Получаем относительный путь от __next.* директории
      const relPath = relative(rscDirPath, txtFile)

      // Преобразуем path/to/file.txt -> path.to.file.txt
      const flatName = relPath.replace(/[\\/]/g, '.')

      // Итоговое имя: __next.!KGRvY3Mp.codes.family.txt
      const targetName = `${prefix}.${flatName}`
      const targetPath = join(pageDir, targetName)

      // Копируем файл (если ещё не существует)
      if (!existsSync(targetPath)) {
        cpSync(txtFile, targetPath)
        console.log(`[fix-rsc-paths] ${relative(outDir, targetPath)}`)
      }
    }
  }
}

// Основной код
console.log('[fix-rsc-paths] Исправление RSC путей для статического экспорта...')

if (!existsSync(outDir)) {
  console.error('[fix-rsc-paths] Директория out не найдена. Сначала выполните build.')
  process.exit(1)
}

// Находим все директории с index.html
const pageDirs = findPageDirs(outDir)
// Добавляем корень
pageDirs.push(outDir)

for (const pageDir of pageDirs) {
  processPageDir(pageDir)
}

console.log(`[fix-rsc-paths] Готово!`)
