/**
 * Исправление standalone сборки для Windows
 *
 * Bun создаёт симлинки в node_modules которые 7zip (electron-builder) не может обработать.
 * NSIS installer также теряет симлинки при установке.
 *
 * Этот скрипт:
 * 1. Рекурсивно находит и заменяет ВСЕ симлинки на реальные файлы/папки
 * 2. Удаляет .bun директории из standalone
 * 3. Копирует обязательные модули из корневого node_modules/.bun/
 *
 * Основан на проверенном решении из apps/animatrona/scripts/fix-standalone.ts
 */
const fs = require('fs')
const path = require('path')

const standaloneDir = path.join(__dirname, '..', 'renderer', '.next', 'standalone')
const standaloneNm = path.join(standaloneDir, 'node_modules')
const rootNm = path.join(__dirname, '..', '..', '..', 'node_modules')

// Модули которые Next.js standalone может не включить, но нужны в runtime
const REQUIRED_MODULES = ['styled-jsx', 'client-only']

if (!fs.existsSync(standaloneDir)) {
  console.log('Standalone директория не найдена, пропускаем')
  process.exit(0)
}

/**
 * Рекурсивное копирование директории (с разрешением вложенных симлинков)
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  let entries
  try {
    entries = fs.readdirSync(src, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isSymbolicLink()) {
      try {
        const realPath = fs.realpathSync(srcPath)
        if (fs.statSync(realPath).isDirectory()) {
          copyDir(realPath, destPath)
        } else {
          fs.copyFileSync(realPath, destPath)
        }
      } catch {
        /* битый симлинк — пропускаем */
      }
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Найти модуль в корневом node_modules/.bun/ кэше.
 * modulePath может быть "@swc/helpers" или "styled-jsx"
 */
function findModuleInRootNodeModules(modulePath) {
  // 1. Прямой путь в корневом node_modules
  const rootModule = path.join(rootNm, modulePath)
  if (fs.existsSync(rootModule)) {
    try {
      return fs.realpathSync(rootModule)
    } catch {
      // симлинк — попробуем .bun
    }
  }

  // 2. Поиск в .bun/ кэше
  const parts = modulePath.split('/')
  // @swc/helpers → @swc+helpers, styled-jsx → styled-jsx
  const moduleName = parts.length > 1 ? parts.join('+') : parts[0]
  const bunDir = path.join(rootNm, '.bun')

  if (!fs.existsSync(bunDir)) return null

  try {
    const entries = fs.readdirSync(bunDir)
    for (const entry of entries) {
      if (entry.startsWith(`${moduleName}@`)) {
        const fullPath = path.join(bunDir, entry, 'node_modules', ...parts)
        if (fs.existsSync(fullPath)) {
          return fullPath
        }
      }
    }
  } catch {
    // ok
  }

  return null
}

/**
 * Рекурсивно исправить симлинки и удалить .bun директории
 */
function fixSymlinks(dir) {
  if (!fs.existsSync(dir)) return 0

  let fixedCount = 0
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Удаляем .bun директории — они содержат симлинки и дублируют данные
    if (entry.name === '.bun' && entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true })
      fixedCount++
      continue
    }

    if (entry.isSymbolicLink()) {
      let realPath = null
      try {
        realPath = fs.realpathSync(fullPath)
      } catch {
        // Битый симлинк
      }

      if (!realPath || !fs.existsSync(realPath)) {
        // Битый симлинк — ищем модуль в корневом node_modules
        fs.unlinkSync(fullPath)
        const nodeModulesIndex = fullPath.lastIndexOf('node_modules')
        if (nodeModulesIndex >= 0) {
          const modulePath = fullPath.slice(nodeModulesIndex + 'node_modules/'.length)
          const source = findModuleInRootNodeModules(modulePath)
          if (source) {
            if (fs.statSync(source).isDirectory()) {
              copyDir(source, fullPath)
            } else {
              fs.copyFileSync(source, fullPath)
            }
          }
        }
        fixedCount++
      } else {
        // Рабочий симлинк — заменяем на реальные файлы
        fs.unlinkSync(fullPath)
        if (fs.statSync(realPath).isDirectory()) {
          copyDir(realPath, fullPath)
        } else {
          fs.copyFileSync(realPath, fullPath)
        }
        fixedCount++
      }
    } else if (entry.isDirectory()) {
      fixedCount += fixSymlinks(fullPath)
    }
  }

  return fixedCount
}

// Шаг 1: Исправить симлинки и удалить .bun
const fixedCount = fixSymlinks(standaloneDir)
console.log(`Симлинки: ${fixedCount} исправлено`)

// Шаг 2: Скопировать обязательные модули которые standalone мог пропустить
let copiedCount = 0
for (const moduleName of REQUIRED_MODULES) {
  const destPath = path.join(standaloneNm, moduleName)
  if (!fs.existsSync(destPath)) {
    const source = findModuleInRootNodeModules(moduleName)
    if (source) {
      copyDir(source, destPath)
      copiedCount++
    } else {
      console.warn(`  Модуль ${moduleName} не найден`)
    }
  }
}
if (copiedCount > 0) {
  console.log(`Скопировано ${copiedCount} обязательных модулей`)
}
