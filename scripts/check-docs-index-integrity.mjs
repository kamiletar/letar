#!/usr/bin/env bun
// Проверяет единый индекс документации и ссылки в общих инструкциях.
// В режиме --staged читает именно Git index для pre-commit хука.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const staged = process.argv.includes('--staged')
const docsDir = join(root, '.claude', 'docs')
const sources = [join(root, 'AGENTS.md'), join(docsDir, 'INDEX.md')]

function git(args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

const indexed = staged ? new Set(git(['ls-files', '-z']).split('\0').filter(Boolean)) : null

function relativePath(path) {
  return relative(root, path).replaceAll('\\', '/')
}
function read(path) {
  return staged ? git(['show', `:${relativePath(path)}`]) : readFileSync(path, 'utf8')
}
function exists(path) {
  return staged ? indexed.has(path) : existsSync(join(root, path))
}

const docs = staged
  ? [...indexed].filter((path) => /^\.claude\/docs\/[^/]+\.md$/.test(path))
  : readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `.claude/docs/${entry.name}`)

const [agentsText, indexText] = sources.map(read)
let errors = 0
const docLinks = new Set(
  [...indexText.matchAll(/\]\(\/(\.claude\/docs\/[A-Za-z0-9_.-]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1]),
)

for (const doc of docs.filter((path) => path !== '.claude/docs/INDEX.md')) {
  if (docLinks.has(doc)) { continue }
  console.error(`❌ ${doc} — нет ссылки в .claude/docs/INDEX.md`)
  errors++
}

for (const [path, content] of sources.map((path, i) => [path, i === 0 ? agentsText : indexText])) {
  for (const match of content.matchAll(/\]\(\/([^)#\s]+\.(?:md|yml|yaml))(?:#[^)]*)?\)/g)) {
    if (exists(match[1])) { continue }
    const line = content.slice(0, match.index).split('\n').length
    console.error(`❌ ${relativePath(path)}:${line} — битая ссылка на /${match[1]}`)
    errors++
  }
}

console.log(`Проверено доков: ${docs.length}${staged ? ' (индекс Git)' : ''}`)
if (errors) {
  console.error(`Ошибок: ${errors}`)
  process.exit(1)
}
console.log('Индекс документации целостен; ссылки в AGENTS.md и INDEX.md живы')
