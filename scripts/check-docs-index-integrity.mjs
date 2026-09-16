#!/usr/bin/env bun
// Проверяет целостность двухуровневого индекса документации монорепо
// (PLAN-INFRA-6.md §181, .claude/docs/documentation-guidelines.md § «Индекс
// документации монорепо — два уровня»).
//
// Зачем: индекс держался только на дисциплине правила «новый док → две записи» —
// и именно так короткая карта в CLAUDE.md разрослась до 912 строк из 1120 (81%
// файла), пока её не разрезали на короткую карту (CLAUDE.md) и развёрнутый
// индекс (.claude/docs/INDEX.md) 2026-09-16. Без исполняемой проверки разделение
// вернётся к тому же состоянию тем же путём: агент добавляет док, забывает одну
// из двух записей или пишет многострочную аннотацию в CLAUDE.md вместо INDEX.md,
// и это не ловится ничем — ни typecheck, ни lint, ни чтением глазами (912 строк).
//
// Что проверяется:
//   1. Каждый файл .claude/docs/*.md (кроме самого INDEX.md) упомянут ссылкой
//      и в CLAUDE.md, и в .claude/docs/INDEX.md — gate.
//   2. Каждая локальная ссылка вида ](/путь.md) или ](/путь.yml) в CLAUDE.md и
//      INDEX.md указывает на существующий файл репозитория — gate. Покрывает не
//      только .claude/docs/*, но и .claude/rules/*, infra/*/README.md,
//      .github/workflows/ci.yml — весь набор локальных ссылок раздела
//      «Документация» и его окрестностей.
//   3. Строка дока в CLAUDE.md не длиннее лимита — warn, не роняет прогон.
//      Это единственное, что не даёт короткой карте снова разрастись в пересказ:
//      длинная строка — сигнал, что аннотация должна переехать в INDEX.md.
//
// Раннер печатает «неполное покрытие» вместо молчаливого зеленения на
// отсутствующих файлах (.claude/docs/verification-pitfalls.md) — здесь это не
// нужно: CLAUDE.md и .claude/docs/ целиком публичные, в CI видны без изъятий,
// в отличие от проверок, которым нужны приватные submodule.
//
// Использование: bun scripts/check-docs-index-integrity.mjs
// Зарегистрирована в check-all.mjs уровнем `gate`.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = join(repoRoot, '.claude', 'docs')
const claudeMdPath = join(repoRoot, 'CLAUDE.md')
const indexMdPath = join(docsDir, 'INDEX.md')

const LINE_LIMIT = 200

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length
}

let gateErrors = 0
let warnings = 0

// ─── Загрузка входа ────────────────────────────────────────────────────────

const claudeMdText = readFileSync(claudeMdPath, 'utf8')
const indexMdText = readFileSync(indexMdPath, 'utf8')

const docFiles = readdirSync(docsDir, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith('.md') && d.name !== 'INDEX.md')
  .map((d) => d.name)
  .sort()

// ─── 1. Каждый док упомянут в обоих файлах ─────────────────────────────────

const DOC_LINK_RE = /\]\(\/\.claude\/docs\/([A-Za-z0-9_.-]+\.md)(?:#[^)]*)?\)/g

function referencedDocs(text) {
  const set = new Set()
  for (const m of text.matchAll(DOC_LINK_RE)) { set.add(m[1]) }
  return set
}

const inClaudeMd = referencedDocs(claudeMdText)
const inIndexMd = referencedDocs(indexMdText)

for (const file of docFiles) {
  const missingFrom = []
  if (!inClaudeMd.has(file)) { missingFrom.push('CLAUDE.md') }
  if (!inIndexMd.has(file)) { missingFrom.push('.claude/docs/INDEX.md') }
  if (missingFrom.length > 0) {
    console.error(`❌ .claude/docs/${file} — нет ссылки в: ${missingFrom.join(', ')}`)
    gateErrors++
  }
}

// ─── 2. Локальные ссылки указывают на существующие файлы ──────────────────

const LOCAL_LINK_RE = /\]\(\/([^)#\s]+\.(?:md|yml|yaml))(?:#[^)]*)?\)/g

function checkBrokenLinks(text, sourceLabel) {
  for (const m of text.matchAll(LOCAL_LINK_RE)) {
    const relPath = m[1]
    const abs = join(repoRoot, relPath)
    if (!existsSync(abs)) {
      console.error(
        `❌ ${sourceLabel}:${lineNumberAt(text, m.index)} — битая ссылка на /${relPath}`,
      )
      gateErrors++
    }
  }
}

checkBrokenLinks(claudeMdText, 'CLAUDE.md')
checkBrokenLinks(indexMdText, '.claude/docs/INDEX.md')

// ─── 3. Длина строки дока в CLAUDE.md ──────────────────────────────────────

const claudeLines = claudeMdText.split('\n')
for (let i = 0; i < claudeLines.length; i++) {
  const line = claudeLines[i]
  if (!line.trimStart().startsWith('-')) { continue }
  if (!/\]\(\/\.claude\/docs\//.test(line)) { continue }
  if (line.length > LINE_LIMIT) {
    console.warn(
      `⚠️  CLAUDE.md:${i + 1} — строка дока длиннее ${LINE_LIMIT} символов (${line.length}), `
        + 'аннотацию стоит сократить или перенести в .claude/docs/INDEX.md',
    )
    warnings++
  }
}

// ─── Итог ───────────────────────────────────────────────────────────────────

console.log(`\nПроверено доков: ${docFiles.length}`)
if (warnings > 0) { console.log(`Предупреждений о длине строки: ${warnings}`) }

if (gateErrors > 0) {
  console.error(`\nОшибок: ${gateErrors}`)
  process.exit(1)
}
console.log('Индекс документации целостен: каждый док в обоих файлах, все локальные ссылки живы')
process.exit(0)
