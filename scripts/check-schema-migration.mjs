#!/usr/bin/env bun
// check-schema-migration.mjs — находит структурные изменения в staged *.zmodel-файлах,
// для которых рядом нет новой папки prisma/migrations/<timestamp>_*/.
//
// Вызывается из scripts/hooks/pre-commit-schema-migration-check.sh. Логика вынесена в
// отдельный файл (а не bash-регекспы), потому что задача — не «любой diff schema.zmodel»,
// а «diff, меняющий физическую структуру БД» (см. .claude/docs/database.md §
// «Изменил схему — файл миграции обязан ехать в ТОМ ЖЕ коммите»). Голый diff ловит и
// правки @@allow/@@deny, ///-комментариев, @form.*-директив — которые миграции не требуют
// и на которых хук постоянно бы шумел, обучая всех коммитить с --no-verify.
//
// Multi-file схемы (см. .claude/docs/zenstack-multifile-schema-circular-imports.md):
// корневой `schema.zmodel` приложения может импортировать файлы-фрагменты из подкаталога
// (`schema/house-config.zmodel`, `schema/auth.zmodel` и т.д. — domwellbes, animatrona,
// animatrona-tracker, grandslamcup, kami). Структурное изменение может попасть в любой такой
// фрагмент, не только в корневой файл — поэтому матчим ЛЮБОЙ staged `*.zmodel`, а не только
// файлы с буквальным именем `schema.zmodel`. Для каждого найденного файла корень приложения
// (и, соответственно, ожидаемый `prisma/migrations/`) определяется поиском ближайшего предка,
// в котором лежит `schema.zmodel` (см. findSchemaRootDir) — не `path.dirname(файла)` самого
// фрагмента. Раньше оба места (фильтр + резолв пути миграций) были завязаны на буквальное имя
// `schema.zmodel`, из-за чего изменение только во фрагменте проходило мимо хука незамеченным
// (см. .claude/docs/precommit-hook-install-staleness.md — инцидент 2026-09-05, domwellbes).
//
// Эвристика (не полноценный AST-парсер zmodel, а достаточно точное приближение):
//   1. Строка "структурна", только если она внутри блока `model`/`enum` (не datasource/
//      generator/plugin/import) — блоки различаются простым подсчётом фигурных скобок
//      с вырезанием содержимого строковых литералов ("..." заменяется на "").
//   2. Внутри такого блока НЕ структурны: пустые строки, `//`/`///`-комментарии,
//      `@@allow(...)`/`@@deny(...)` (access policy, не физическая структура).
//      Структурны: объявления полей, `@@unique/@@index/@@id/@@map/@@fulltext/...`,
//      сами строки `model X {`/`enum X {`.
//   3. Пара «удалена строка поля `name Type ...` / добавлена строка поля с тем же
//      `name`+`Type`» считается чисто атрибутивным изменением (поменяли @default,
//      добавили @form.*, добавили field-level @allow) и НЕ структурна — иначе любая
//      правка @form.*-директивы на существующем поле ложно блокировала бы коммит.
//
// Ограничения (осознанно, ради простоты): не различает `@@unique`, добавленный на новое
// vs существующее поле; не разворачивает многострочные атрибуты. Ложные срабатывания —
// обход GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1 в самом хуке.
//
// Использует Bun.spawnSync (не node:child_process) — скрипт заведомо запускается только
// через bun (хук pre-commit-schema-migration-check.sh это проверяет перед вызовом).

import fs from 'node:fs'
import path from 'node:path'

function runGit(args) {
  const result = Bun.spawnSync(['git', ...args], { stdout: 'pipe', stderr: 'pipe' })
  return { ok: result.exitCode === 0, text: result.stdout.toString('utf8') }
}

function readBlobAt(spec) {
  const { ok, text } = runGit(['show', spec])
  return ok ? text : null
}

function stagedNameStatus() {
  const { text } = runGit(['diff', '--cached', '--name-status', '--diff-filter=ACMR'])
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t')
      return { status: parts[0], file: parts[parts.length - 1] }
    })
}

const entries = stagedNameStatus()
const schemaFiles = entries.filter((e) => /\.zmodel$/.test(e.file))

if (schemaFiles.length === 0) {
  process.exit(0)
}

const addedFiles = new Set(entries.filter((e) => e.status === 'A').map((e) => e.file))

// Ищет ближайшего предка `zmodelPath`, в котором лежит корневой `schema.zmodel` приложения —
// именно там ожидается `prisma/migrations/`, а не рядом с самим файлом-фрагментом. Читает
// рабочее дерево напрямую (fs), не git-объекты: pre-commit-хук всегда исполняется с
// материализованным checkout, а staged-версия корневого файла нас не интересует — важно,
// существует ли он на диске как каталог-ориентир, не его содержимое.
function findSchemaRootDir(zmodelPath) {
  let dir = path.posix.dirname(zmodelPath)
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.posix.join(dir, 'schema.zmodel'))) { return dir }
    const parent = path.posix.dirname(dir)
    if (parent === dir) { return null }
    dir = parent
  }
  return null
}

function hasNewMigration(appRootDir) {
  const migrationsDir = appRootDir === '.' ? 'prisma/migrations' : `${appRootDir}/prisma/migrations`
  const prefix = `${migrationsDir}/`
  for (const file of addedFiles) {
    if (file.startsWith(prefix) && file.endsWith('/migration.sql')) { return true }
  }
  return false
}

// Помечает строки, лежащие внутри верхнеуровневого блока model/enum (в т.ч. `abstract model`).
function findModelBlockLines(content) {
  const lines = content.split('\n')
  const flags = new Array(lines.length).fill(false)
  let depth = 0
  let curIsModel = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    const noStrings = raw.replace(/"(?:[^"\\]|\\.)*"/g, '""')
    for (const ch of noStrings) {
      if (ch === '{') {
        if (depth === 0) {
          curIsModel = /^(abstract\s+)?(model|enum)\s+\S+/.test(trimmed)
        }
        depth++
      } else if (ch === '}') {
        depth = Math.max(0, depth - 1)
        if (depth === 0) { curIsModel = false }
      }
    }
    flags[i] = curIsModel && depth >= 1
  }
  return flags
}

function isNonStructuralLine(trimmed) {
  if (trimmed === '') { return true }
  // startsWith('//') покрывает и /// doc-комментарии
  if (trimmed.startsWith('//')) { return true }
  if (/^@@allow\(/.test(trimmed)) { return true }
  if (/^@@deny\(/.test(trimmed)) { return true }
  return false
}

const FIELD_RE = /^(\w+)\s+(\S+)/

// Парсит `git diff -U0` в списки изменённых номеров строк (старый/новый файл, 1-based).
function parseHunkLineNumbers(diffText) {
  const removed = []
  const added = []
  let oldLn = 0
  let newLn = 0
  for (const line of diffText.split('\n')) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
    if (hunk) {
      oldLn = Number(hunk[1])
      newLn = Number(hunk[2])
      continue
    }
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ') || line.startsWith('index ')) {
      continue
    }
    if (line.startsWith('-')) {
      removed.push(oldLn)
      oldLn++
    } else if (line.startsWith('+')) {
      added.push(newLn)
      newLn++
    } else if (line.length > 0) {
      oldLn++
      newLn++
    }
  }
  return { removed, added }
}

const findings = []

for (const { file: schemaPath } of schemaFiles) {
  const appRootDir = findSchemaRootDir(schemaPath)
  // Не нашли корневой schema.zmodel — не можем определить, где ожидать миграции.
  // Такое возможно только для файла, ещё не влитого в дерево импортов ни одного приложения;
  // пропускаем, а не блокируем коммит вслепую.
  if (appRootDir === null) { continue }
  if (hasNewMigration(appRootDir)) { continue }

  const oldContent = readBlobAt(`HEAD:${schemaPath}`)
  const newContent = readBlobAt(`:${schemaPath}`) ?? ''

  const oldLines = oldContent ? oldContent.split('\n') : []
  const newLines = newContent.split('\n')
  const oldFlags = oldContent ? findModelBlockLines(oldContent) : []
  const newFlags = findModelBlockLines(newContent)

  const { text: diffText } = runGit(['diff', '--cached', '-U0', '--', schemaPath])
  const { removed, added } = parseHunkLineNumbers(diffText)

  const removedStructural = []
  for (const ln of removed) {
    const idx = ln - 1
    if (!oldFlags[idx]) { continue }
    const text = oldLines[idx] ?? ''
    const trimmed = text.trim()
    if (isNonStructuralLine(trimmed)) { continue }
    const m = FIELD_RE.exec(trimmed)
    removedStructural.push({ text, name: m?.[1], type: m?.[2] })
  }

  const addedStructural = []
  for (const ln of added) {
    const idx = ln - 1
    if (!newFlags[idx]) { continue }
    const text = newLines[idx] ?? ''
    const trimmed = text.trim()
    if (isNonStructuralLine(trimmed)) { continue }
    const m = FIELD_RE.exec(trimmed)
    addedStructural.push({ text, name: m?.[1], type: m?.[2] })
  }

  // Пары «то же имя поля + тот же тип» среди удалённых/добавленных строк — атрибутивное
  // изменение (поменяли @default/@form.*/field-level @allow), не структурное.
  const addedByKey = new Map()
  for (const a of addedStructural) {
    if (!a.name || !a.type) { continue }
    const key = `${a.name} ${a.type}`
    if (!addedByKey.has(key)) { addedByKey.set(key, []) }
    addedByKey.get(key).push(a)
  }

  const consumedAdded = new Set()
  const remainingRemoved = []
  for (const r of removedStructural) {
    if (r.name && r.type) {
      const bucket = addedByKey.get(`${r.name} ${r.type}`)
      const match = bucket?.find((a) => !consumedAdded.has(a))
      if (match) {
        consumedAdded.add(match)
        continue
      }
    }
    remainingRemoved.push(r)
  }
  const remainingAdded = addedStructural.filter((a) => !consumedAdded.has(a))

  if (remainingRemoved.length > 0 || remainingAdded.length > 0) {
    findings.push({ schemaPath, appRootDir, removed: remainingRemoved, added: remainingAdded })
  }
}

if (findings.length === 0) {
  process.exit(0)
}

console.error('')
console.error('⛔ pre-commit заблокирован: schema.zmodel меняет структуру БД, а новой миграции нет.')
console.error('')
for (const { schemaPath, appRootDir, removed, added } of findings) {
  const app = appRootDir === '.' ? null : appRootDir.replace(/^apps\//, '')
  console.error(`  ${schemaPath}:`)
  for (const a of added) { console.error(`    + ${a.text.trim()}`) }
  for (const r of removed) { console.error(`    - ${r.text.trim()}`) }
  const migrationsHint = appRootDir === '.'
    ? 'prisma/migrations/<timestamp>_*/'
    : `${appRootDir}/prisma/migrations/<timestamp>_*/`
  console.error(`    ожидается новая папка ${migrationsHint} среди staged-файлов`)
  console.error(`    создать: nx db:migrate ${app ?? '<app>'}`)
  console.error('')
}
console.error('Почему это не ловит деплой и чем это грозило — .claude/docs/database.md')
console.error('§ «Изменил схему — файл миграции обязан ехать в ТОМ ЖЕ коммите».')
console.error('')
console.error('Если это ложное срабатывание эвристики или миграция едет отдельно осознанно:')
console.error('  GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1 git commit ...')
console.error('')

process.exit(1)
