#!/usr/bin/env node
// Добавляет строку в compilerOptions.paths всех apps/*/tsconfig.json (включая
// apps/<app>/renderer|main|.../tsconfig.json), где уже есть путь-алиас библиотеки-якоря.
// Relative-prefix ("../../" vs "../../../") вычисляется по фактическому расположению
// каждого tsconfig.json — не передаётся руками.
//
// Использование:
//   node scripts/add-lib-tsconfig-path.mjs \
//     --package "@letar/forms-core/security" \
//     --target "libs/forms-core/src/lib/security/index.ts" \
//     --after "@letar/forms-core/utils"
//
// --anchor-package (опционально, по умолчанию "@letar/forms") — какой существующий ключ
// paths считать признаком «это приложение — потребитель», если работаешь с другой библиотекой.
//
// Находка, из-за которой скрипт появился — двойная механика резолва @letar/forms-core
// (paths в apps/*/tsconfig.json + workspace-зависимость в package.json), сессия Фазы 7.1
// расслоения libs/forms → libs/forms-core, см. libs/forms/PLAN.md (Этап 1/Этап 3а).

import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[i + 1]
    args[key] = value
    i++
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const packageName = args.package
const target = args.target
const afterKey = args.after ?? null
const anchorPackage = args['anchor-package'] ?? '@letar/forms'

if (!packageName || !target) {
  console.error('Использование: node scripts/add-lib-tsconfig-path.mjs --package "<alias>" --target "<путь от корня репо>" [--after "<ключ>"] [--anchor-package "<alias>"]')
  process.exit(1)
}

const targetAbs = path.resolve(repoRoot, target)

function findTsconfigs(dir, depth) {
  const found = []
  if (depth < 0) return found
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist' || entry === 'out') continue
    const fullPath = path.join(dir, entry)
    let stats
    try {
      stats = statSync(fullPath)
    } catch {
      continue
    }
    if (stats.isDirectory()) {
      found.push(...findTsconfigs(fullPath, depth - 1))
    } else if (entry === 'tsconfig.json') {
      found.push(fullPath)
    }
  }
  return found
}

const appsDir = path.join(repoRoot, 'apps')
const tsconfigFiles = findTsconfigs(appsDir, 2).sort()

function extractPathsBlock(text) {
  const keyMatch = text.match(/"paths"\s*:\s*\{/)
  if (!keyMatch) return null
  const blockStart = keyMatch.index + keyMatch[0].length // сразу после '{'
  let depth = 1
  let i = blockStart
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  if (depth !== 0) return null
  return {
    headerStart: keyMatch.index,
    innerStart: blockStart,
    innerEnd: i, // индекс закрывающей '}'
  }
}

const noMatch = []
const skippedAlready = []
const updated = []
const invalidJson = []

for (const tsconfigPath of tsconfigFiles) {
  const text = readFileSync(tsconfigPath, 'utf8')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    // не валидный JSON до правки — не наш случай, пропускаем молча
    continue
  }

  const paths = parsed.compilerOptions?.paths ?? parsed.paths
  if (!paths || !(anchorPackage in paths)) {
    continue // не потребитель библиотеки-якоря
  }

  if (packageName in paths) {
    skippedAlready.push(tsconfigPath)
    continue
  }

  const block = extractPathsBlock(text)
  if (!block) {
    noMatch.push(tsconfigPath)
    continue
  }

  const inner = text.slice(block.innerStart, block.innerEnd)

  // Значения — массивы строк ("key": ["a", "b"]), иногда развёрнутые на несколько строк.
  // Splitим на записи по запятым верхнего уровня (глубина скобок [ ] = 0), а не по '\n' —
  // иначе многострочная запись (см. driving-school § form-schemas/enums/*) рвётся пополам.
  const entries = []
  {
    let depth = 0
    let buf = ''
    for (const ch of inner) {
      if (ch === '[') depth++
      else if (ch === ']') depth--
      if (ch === ',' && depth === 0) {
        entries.push(buf)
        buf = ''
      } else {
        buf += ch
      }
    }
    if (buf.trim().length > 0) entries.push(buf)
  }
  const trimmedEntries = entries.map((e) => e.trim()).filter((e) => e.length > 0)

  const indentMatch = inner.match(/\n(\s*)"/)
  const indent = indentMatch ? indentMatch[1] : '      '

  const tsconfigDir = path.dirname(tsconfigPath)
  let relPath = path.relative(tsconfigDir, targetAbs).split(path.sep).join('/')
  if (!relPath.startsWith('.')) relPath = './' + relPath

  const newEntry = `"${packageName}": ["${relPath}"]`

  let insertIndex = trimmedEntries.length
  if (afterKey) {
    const idx = trimmedEntries.findIndex((e) => e.startsWith(`"${afterKey}":`))
    if (idx !== -1) insertIndex = idx + 1
  }

  const newEntries = [
    ...trimmedEntries.slice(0, insertIndex),
    newEntry,
    ...trimmedEntries.slice(insertIndex),
  ]

  const newInner = '\n' + newEntries.map((e) => indent + e).join(',\n') + '\n' + indent.slice(0, -2)

  const newText = text.slice(0, block.innerStart) + newInner + text.slice(block.innerEnd)

  try {
    JSON.parse(newText)
  } catch (err) {
    console.error(`❌ ${tsconfigPath}: результат не является валидным JSON (${err.message}), файл не изменён`)
    invalidJson.push(tsconfigPath)
    continue
  }

  writeFileSync(tsconfigPath, newText, 'utf8')
  updated.push(tsconfigPath)
}

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

console.log(`\nДобавлено "${packageName}" в ${updated.length} файл(ов):`)
for (const f of updated) console.log(`  ✅ ${rel(f)}`)

if (skippedAlready.length > 0) {
  console.log(`\nУже было (пропущено, идемпотентность): ${skippedAlready.length}`)
  for (const f of skippedAlready) console.log(`  ⏭️  ${rel(f)}`)
}

if (invalidJson.length > 0) {
  console.log(`\n⚠️  Пропущено из-за невалидного результата JSON: ${invalidJson.length}`)
  for (const f of invalidJson) console.log(`  ❌ ${rel(f)}`)
}

console.log(`\nВсего проверено tsconfig.json: ${tsconfigFiles.length}`)
console.log(`Найдено потребителей "${anchorPackage}": ${updated.length + skippedAlready.length + noMatch.length + invalidJson.length}`)

if (noMatch.length > 0) {
  console.log(`\n⚠️  Есть anchor-ключ "${anchorPackage}", но блок "paths" не распознан (не тронуто): ${noMatch.length}`)
  for (const f of noMatch) console.log(`  ❓ ${rel(f)}`)
}

if (invalidJson.length > 0) process.exit(1)
