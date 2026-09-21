#!/usr/bin/env node
// Гейт синтаксиса TypeScript для pre-commit: разбирает staged .ts/.tsx/.mts/.cts и блокирует
// коммит, если хоть один не парсится.
//
// Зачем: 2026-09-22 коммит b8a213578 занёс в libs/deploy-mcp/src/server.ts блок кода, вставленный
// внутрь чужих выражений — 11 синтаксических ошибок в закоммиченном файле. Две сессии одновременно
// правили файл; одна перезаписала его целиком (`Write`), индекс был в состоянии `MM`. Ни один из
// существующих pre-commit хуков синтаксис не смотрит (scope-guard — про пути, semgrep — про
// уязвимости, dprint — про формат), а typecheck/тесты перед коммитом не гоняются. Разбор —
// .claude/docs/git-multi-agent-incidents.md § «Сломанный синтаксис в коммите».
//
// Что делает: строит `ts.createProgram` из ОДНОГО набора staged-файлов с `noLib`+`noResolve` и
// спрашивает `getSyntacticDiagnostics` — только парсер, без разрешения импортов и без типов, поэтому
// стоит миллисекунды на файл (весь репозиторий, 5906 файлов, — ~6 с; типичный коммит — доли секунды
// на загрузку самого typescript). Не `transpileModule`: на `.d.ts` он падает `Output generation
// failed`, а хук не должен падать сам.
//
// ⚠️ Проверяется содержимое ИНДЕКСА (`git cat-file --batch :<путь>`), не рабочего дерева: коммитится
// именно оно. Это важно при `MM` (часть хунков в индексе, часть в рабочем дереве) — файл на диске
// может быть целым, а в индексе рваным. Переменная GIT_INDEX_FILE, которую git выставляет при
// `git commit -- <путь>`, наследуется дочерними `git`, поэтому чтение идёт из правильного индекса.
//
// Чего НЕ ловит: ошибки типов, несуществующие импорты, падающие тесты — это `typecheck:tsgo`/vitest.
// Гейт закрывает только «файл не парсится», самый дешёвый и самый обидный класс.
//
// Обход осознанного WIP-коммита: GIT_ALLOW_SYNTAX_ERRORS=1 git commit ... — превращает блокировку в
// предупреждение (по образцу GIT_ALLOW_MULTI_SCOPE_COMMIT).
//
// Использование: node scripts/check-staged-syntax.mjs
// Код возврата: 0 — синтаксис чист (или нечего проверять, или typescript недоступен — тогда
// предупреждение); 1 — есть ошибки парсера.

import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { repoRoot } from './lib/repo-root.mjs'

// Файлы крупнее не разбираем: сгенерированные бандлы/дампы не пишутся руками, а парсятся долго.
const MAX_BYTES = 2 * 1024 * 1024
// Сколько ошибок печатать на файл: у рваного файла их бывает десятки, читается первая пара.
const MAX_ERRORS_PER_FILE = 5

const root = repoRoot()

function stagedTsFiles() {
  // -z: без кавычек и escape-последовательностей на не-ASCII путях (см.
  // .claude/docs/precommit-hook-install-staleness.md, дополнение 2026-09-16).
  const out = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR', '--', '*.ts', '*.tsx', '*.mts', '*.cts'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out.split('\0').filter(Boolean)
}

/** Содержимое индексных версий одним процессом git: Map<путь, строка | null (нет/слишком большой)>. */
function readIndexBlobs(files) {
  const res = spawnSync('git', ['cat-file', '--batch'], {
    cwd: root,
    input: files.map((f) => `:${f}\n`).join(''),
    maxBuffer: 512 * 1024 * 1024,
  })
  if (res.status !== 0) {
    throw new Error(`git cat-file --batch: ${res.stderr?.toString() ?? res.error}`)
  }
  const buf = res.stdout
  const blobs = new Map()
  let pos = 0
  for (const file of files) {
    const eol = buf.indexOf(0x0a, pos)
    // Заголовок: "<oid> blob <size>" либо "<объект> missing".
    const header = buf.toString('utf8', pos, eol).split(' ')
    pos = eol + 1
    if (header[1] !== 'blob') {
      blobs.set(file, null)
      continue
    }
    const size = Number(header[2])
    blobs.set(file, size > MAX_BYTES ? null : buf.toString('utf8', pos, pos + size))
    pos += size + 1 // содержимое + завершающий \n
  }
  return blobs
}

/** typescript из зависимостей репозитория, в котором коммитят; null, если его нигде не видно. */
function loadTypescript() {
  // Сначала от корня репозитория: для submodule (apps/<x>) require поднимается по родителям
  // до node_modules монорепо. Потом от самого скрипта — запуск из scripts/ руками.
  for (const base of [path.join(root, 'package.json'), import.meta.url]) {
    try {
      const anchor = base.startsWith('file:') ? base : pathToFileURL(base).href
      return createRequire(anchor)('typescript')
    } catch {
      // пробуем следующий якорь
    }
  }
  return null
}

const files = stagedTsFiles()
if (files.length === 0) {
  process.exit(0)
}

const ts = loadTypescript()
if (!ts) {
  console.error('⚠️  typescript не найден (ни от корня репозитория, ни от скрипта) — проверка синтаксиса пропущена')
  process.exit(0)
}

const blobs = readIndexBlobs(files)
const contents = new Map()
for (const [file, text] of blobs) {
  if (text !== null) {
    contents.set(file, text)
  }
}
if (contents.size === 0) {
  process.exit(0)
}

const options = {
  noLib: true,
  noResolve: true,
  types: [],
  jsx: ts.JsxEmit.Preserve,
  target: ts.ScriptTarget.ESNext,
  noEmit: true,
}
const host = ts.createCompilerHost(options)
host.getSourceFile = (name, languageVersion) => {
  const text = contents.get(name)
  return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, false)
}
host.fileExists = (name) => contents.has(name)
host.readFile = (name) => contents.get(name)

const program = ts.createProgram({ rootNames: [...contents.keys()], options, host })

const broken = []
for (const [file] of contents) {
  const sf = program.getSourceFile(file)
  if (!sf) {
    continue
  }
  const diagnostics = program.getSyntacticDiagnostics(sf)
  if (diagnostics.length > 0) {
    broken.push({ file, diagnostics, sf })
  }
}

if (broken.length === 0) {
  process.exit(0)
}

const allow = process.env.GIT_ALLOW_SYNTAX_ERRORS === '1'
console.error(`${allow ? '⚠️ ' : '❌'} ${broken.length} staged-файл(а/ов) не парсится как TypeScript:\n`)
for (const { file, diagnostics, sf } of broken) {
  console.error(`   ${file} — ${diagnostics.length} ошибок парсера`)
  for (const d of diagnostics.slice(0, MAX_ERRORS_PER_FILE)) {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0)
    console.error(
      `     ${line + 1}:${character + 1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
    )
  }
  if (diagnostics.length > MAX_ERRORS_PER_FILE) {
    console.error(`     … и ещё ${diagnostics.length - MAX_ERRORS_PER_FILE}`)
  }
  // Частый корень — параллельная правка файла: в индексе одна версия, в рабочем дереве другая.
  try {
    if (readFileSync(path.join(root, file), 'utf8') !== contents.get(file)) {
      console.error('     ↳ рабочая копия отличается от индексной; коммитится ИНДЕКСНАЯ (git diff -- ' + file + ')')
    }
  } catch {
    // файла нет на диске — подсказка не нужна
  }
}
console.error('\n   Проверялось содержимое индекса (то, что попадёт в коммит), а не рабочего дерева.')
console.error('   Разбор: .claude/docs/git-multi-agent-incidents.md § «Сломанный синтаксис в коммите».')

if (allow) {
  console.error('   GIT_ALLOW_SYNTAX_ERRORS=1 — коммит разрешён вопреки ошибкам.')
  process.exit(0)
}
console.error('   Осознанный WIP-коммит: GIT_ALLOW_SYNTAX_ERRORS=1 git commit ...')
process.exit(1)
