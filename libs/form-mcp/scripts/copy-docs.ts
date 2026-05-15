/**
 * Копирует docs/ из forms в dist/docs/ для npm пакета.
 * Запускается как часть build:npm pipeline.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const srcDocs = join(import.meta.dirname!, '..', '..', 'forms', 'docs')
const distDocs = join(import.meta.dirname!, '..', 'dist', 'docs')

if (!existsSync(srcDocs)) {
  console.error(`Docs source not found: ${srcDocs}`)
  process.exit(1)
}

mkdirSync(distDocs, { recursive: true })
cpSync(srcDocs, distDocs, { recursive: true })

console.log(`Docs copied: ${srcDocs} → ${distDocs}`)
