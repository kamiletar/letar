/**
 * Копирование фото из Telegram-экспортов в uploads/.
 * Организаторы + фото к матчам (по msgId привязка).
 *
 * Запуск: bun run scripts/migrate/copy-photos.ts
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const MOSCOW_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/slam'
const SPB_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/spb'
const UPLOADS_DIR = join(import.meta.dirname, '../../uploads')
const DATA_DIR = join(import.meta.dirname, 'manual-data')

function copyPhoto(srcDir: string, photoPath: string, destSubdir: string): string | null {
  const srcFile = join(srcDir, photoPath)
  if (!existsSync(srcFile)) {
    return null
  }

  const destDir = join(UPLOADS_DIR, destSubdir)
  mkdirSync(destDir, { recursive: true })

  const filename = basename(photoPath)
  const destFile = join(destDir, filename)

  if (!existsSync(destFile)) {
    copyFileSync(srcFile, destFile)
  }

  return `${destSubdir}/${filename}`
}

function main() {
  console.log('=== Копирование фото из Telegram-экспортов ===\n')

  mkdirSync(UPLOADS_DIR, { recursive: true })

  // 1. Организаторы Москва
  const moscowOrgs = JSON.parse(readFileSync(join(DATA_DIR, 'moscow-organizers.json'), 'utf-8'))
  console.log('📍 Организаторы Москва:')
  let copiedOrgs = 0
  for (const org of moscowOrgs) {
    if (!org.photo) {
      continue
    }
    const path = copyPhoto(MOSCOW_SRC, org.photo, 'organizers/moscow')
    if (path) {
      console.log(`  ✓ ${org.name} → ${path}`)
      copiedOrgs++
    }
  }

  // 2. Организаторы СПб
  const spbOrgs = JSON.parse(readFileSync(join(DATA_DIR, 'spb-organizers.json'), 'utf-8'))
  console.log('\n📍 Организаторы СПб:')
  for (const org of spbOrgs) {
    if (!org.photo) {
      continue
    }
    const path = copyPhoto(SPB_SRC, org.photo, 'organizers/spb')
    if (path) {
      console.log(`  ✓ ${org.name} → ${path}`)
      copiedOrgs++
    }
  }

  console.log(`\n  Организаторов с фото: ${copiedOrgs}`)

  // 3. Фото к матчам — скопируем ВСЕ фото из Telegram-экспортов
  // (привязка к конкретным матчам — на следующем этапе через seed)
  console.log('\n📸 Фото к матчам:')

  let copiedMoscow = 0
  const moscowPhotosDir = join(MOSCOW_SRC, 'photos')
  if (existsSync(moscowPhotosDir)) {
    const files = readdirSync(moscowPhotosDir).filter((f) => f.endsWith('.jpg'))
    const destDir = join(UPLOADS_DIR, 'matches/moscow')
    mkdirSync(destDir, { recursive: true })
    for (const f of files) {
      const src = join(moscowPhotosDir, f)
      const dest = join(destDir, f)
      if (!existsSync(dest)) {
        copyFileSync(src, dest)
      }
      copiedMoscow++
    }
    console.log(`  Москва: ${copiedMoscow} фото`)
  }

  let copiedSpb = 0
  const spbPhotosDir = join(SPB_SRC, 'photos')
  if (existsSync(spbPhotosDir)) {
    const files = readdirSync(spbPhotosDir).filter((f) => f.endsWith('.jpg'))
    const destDir = join(UPLOADS_DIR, 'matches/spb')
    mkdirSync(destDir, { recursive: true })
    for (const f of files) {
      const src = join(spbPhotosDir, f)
      const dest = join(destDir, f)
      if (!existsSync(dest)) {
        copyFileSync(src, dest)
      }
      copiedSpb++
    }
    console.log(`  СПб: ${copiedSpb} фото`)
  }

  // Итого
  const totalSize = (dir: string) => {
    if (!existsSync(dir)) {
      return 0
    }
    let size = 0
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        const s = statSync(p)
        if (s.isDirectory()) {
          walk(p)
        } else {
          size += s.size
        }
      }
    }
    walk(dir)
    return size
  }

  const sizeMB = (totalSize(UPLOADS_DIR) / 1024 / 1024).toFixed(1)
  console.log(`\n=== ИТОГО ===`)
  console.log(`  Организаторов: ${copiedOrgs}`)
  console.log(`  Фото Москва: ${copiedMoscow}`)
  console.log(`  Фото СПб: ${copiedSpb}`)
  console.log(`  Размер uploads/: ${sizeMB} MB`)
}

main()
