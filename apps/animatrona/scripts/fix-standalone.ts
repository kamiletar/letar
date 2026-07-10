/**
 * Исправление standalone сборки для Windows
 *
 * Bun создаёт симлинки в node_modules которые 7zip не может обработать.
 * Этот скрипт рекурсивно находит и заменяет ВСЕ симлинки на реальные файлы/папки.
 */

import * as fs from 'fs'
import * as path from 'path'

const standaloneDir = path.join(__dirname, '../renderer/.next/standalone')
const standaloneNodeModules = path.join(standaloneDir, 'node_modules')

// Модули которые Next.js standalone может не включить, но они нужны в runtime
const REQUIRED_MODULES = [
  'styled-jsx',
  // node-fetch@3 транзитивные зависимости (через cross-fetch ← @libsql/hrana-client ← @libsql/client)
  'data-uri-to-buffer',
  'fetch-blob',
  'formdata-polyfill',
  'node-domexception',
  'web-streams-polyfill',
]

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isSymbolicLink()) {
      // Разыменовываем симлинк
      const realPath = fs.realpathSync(srcPath)
      if (fs.statSync(realPath).isDirectory()) {
        copyDir(realPath, destPath)
      } else {
        fs.copyFileSync(realPath, destPath)
      }
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function findModuleInRootNodeModules(modulePath: string): string | null {
  // modulePath может быть "@zenstackhq/orm" или "react"
  const rootModule = path.join(process.cwd(), '../../node_modules', modulePath)
  if (fs.existsSync(rootModule)) {
    return rootModule
  }

  // Попробуем в .bun
  const parts = modulePath.split('/')
  const moduleName = parts.length > 1 ? parts.join('+') : parts[0]
  const bunDir = path.join(process.cwd(), '../../node_modules/.bun')

  if (!fs.existsSync(bunDir)) return null

  const entries = fs.readdirSync(bunDir)
  for (const entry of entries) {
    // Для scoped: @zenstackhq+orm@version
    // Для обычных: react@version
    if (entry.startsWith(`${moduleName}@`)) {
      const fullPath = path.join(bunDir, entry, 'node_modules', ...parts)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }
  }

  return null
}

function fixSymlinks(dir: string, depth = 0): number {
  if (!fs.existsSync(dir)) return 0

  let fixedCount = 0
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Удаляем .bun директории
    if (entry.name === '.bun' && entry.isDirectory()) {
      console.log(`   Удаляю .bun директорию: ${path.relative(standaloneDir, fullPath)}`)
      fs.rmSync(fullPath, { recursive: true, force: true })
      fixedCount++
      continue
    }

    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath)
      let realPath: string | null = null

      try {
        realPath = fs.realpathSync(fullPath)
      } catch {
        // Симлинк битый, нужно восстановить
      }

      if (!realPath || !fs.existsSync(realPath)) {
        // Битый симлинк - удаляем и копируем реальный модуль
        const relativePath = path.relative(standaloneDir, fullPath)
        console.log(`   Исправляю битый симлинк: ${relativePath}`)
        fs.unlinkSync(fullPath)

        // Определяем какой модуль нужен
        // Путь вида: node_modules/@zenstackhq/orm или node_modules/react
        const nodeModulesIndex = fullPath.lastIndexOf('node_modules')
        if (nodeModulesIndex >= 0) {
          const modulePath = fullPath.slice(nodeModulesIndex + 'node_modules/'.length)
          const source = findModuleInRootNodeModules(modulePath)

          if (source) {
            console.log(`   Копирую ${modulePath}...`)
            if (fs.statSync(source).isDirectory()) {
              copyDir(source, fullPath)
            } else {
              fs.copyFileSync(source, fullPath)
            }
          } else {
            console.log(`   ⚠️ Модуль ${modulePath} не найден`)
          }
        }
        fixedCount++
      } else {
        // Симлинк рабочий, но всё равно заменяем на реальные файлы для Windows
        const relativePath = path.relative(standaloneDir, fullPath)
        console.log(`   Заменяю симлинк на копию: ${relativePath}`)
        fs.unlinkSync(fullPath)

        if (fs.statSync(realPath).isDirectory()) {
          copyDir(realPath, fullPath)
        } else {
          fs.copyFileSync(realPath, fullPath)
        }
        fixedCount++
      }
    } else if (entry.isDirectory()) {
      // Рекурсивно обрабатываем поддиректории
      fixedCount += fixSymlinks(fullPath, depth + 1)
    }
  }

  return fixedCount
}

async function main() {
  console.log('🔧 Исправление standalone для Windows...')

  if (!fs.existsSync(standaloneDir)) {
    console.log('⚠️ Standalone директория не найдена, пропускаю')
    return
  }

  // Удаляем src/ директорию из renderer — NFT трассировка Next.js случайно включает
  // весь исходный код (через dynamic imports ZenStack enhance()), в production не нужен
  const rendererSrcDir = path.join(standaloneDir, 'apps', 'animatrona', 'renderer', 'src')
  if (fs.existsSync(rendererSrcDir)) {
    console.log('🗑️ Удаляю renderer/src/ из standalone (исходный код не нужен в production)...')
    fs.rmSync(rendererSrcDir, { recursive: true, force: true })
    console.log('✅ renderer/src/ удалён')
  }

  const fixedCount = fixSymlinks(standaloneDir)

  if (fixedCount > 0) {
    console.log(`✅ Исправлено ${fixedCount} симлинков/директорий`)
  } else {
    console.log('✅ Симлинки не найдены')
  }

  // Копируем обязательные модули которые Next.js standalone может пропустить
  console.log('🔧 Проверка обязательных модулей...')
  for (const moduleName of REQUIRED_MODULES) {
    const destPath = path.join(standaloneNodeModules, moduleName)
    if (!fs.existsSync(destPath)) {
      const source = findModuleInRootNodeModules(moduleName)
      if (source) {
        console.log(`   Копирую ${moduleName}...`)
        copyDir(source, destPath)
      } else {
        console.log(`   ⚠️ Модуль ${moduleName} не найден`)
      }
    }
  }
  console.log('✅ Готово')
}

main().catch(console.error)
