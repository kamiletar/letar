#!/usr/bin/env bun
// Постоянная проверка собранных npm-пакетов: сверяет `libs/<pkg>/dist` с тем, что увидит внешний пользователь.
// Реестр пакетов — scripts/data/npm-published-packages.json (порядок = порядок публикации).
//
// Что проверяется для каждого пакета:
//   1. каждый внешний импорт из .js/.d.ts объявлен в dependencies/peerDependencies dist/package.json;
//   2. манифест: нет `workspace:`, publishConfig tag=next/access=public, версия == версии libs/<pkg>/package.json,
//      в dist лежат LICENSE и README.md;
//   3. все пути из exports/main/module/types/bin существуют;
//   4. 'use client' первой строкой каждого .js (кроме нейтральных entry — там директивы быть не должно);
//   5. имена приватных приложений (из .gitmodules + privateNamesExtra) не попали ни в один файл dist;
//   6. список пакетов совпадает с триггерами и вариантами ручного запуска .github/workflows/publish-npm.yml.
//
// Использование:
//   bun scripts/check-npm-package-integrity.mjs                  # dist уже собран (nx run-many -t build:npm)
//   bun scripts/check-npm-package-integrity.mjs --build          # сначала собрать все пакеты реестра
//   bun scripts/check-npm-package-integrity.mjs --only=forms     # один пакет (по tag из реестра)
//   bun scripts/check-npm-package-integrity.mjs --publint        # + publint и arethetypeswrong для каждого dist
//
// Код возврата: 1 при любой ошибке. Разбор — .claude/docs/npm-publish-from-monorepo.md.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Точные версии внешних инструментов: последние стабильные старше двух недель на 2026-10-19
// (publint 0.3.25 вышел 2026-10-01, attw 0.18.5 — 2026-07-09). Через bunx, без записи в корневой package.json.
export const PUBLINT_VERSION = '0.3.25'
export const ATTW_VERSION = '0.18.5'

const NODE_BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => m.split('/')[0])])
const TEXT_EXT = /\.(js|mjs|cjs|ts|mts|cts|map|md|json|txt|css|html|yml|yaml)$/i

// ─────────────────────────────────────────────────────────────────────────────
// Разбор импортов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Заменяет комментарии и содержимое шаблонных строк пробелами (переводы строк сохраняются), обычные
 * строки '…'/"…" остаются: в них лежит имя модуля. Нужен, чтобы `import` из JSDoc-примера или из
 * шаблонной строки генератора кода не считался настоящим импортом.
 * Простой лексер, не парсер: регулярные литералы распознаются по предыдущему значимому символу.
 */
export function stripCommentsAndTemplates(src) {
  let out = ''
  let i = 0
  const n = src.length
  let lastSig = '' // последний значимый символ кода (для различия деления и регэкспа)
  let lastWord = ''

  const blank = (s) => s.replace(/[^\n]/g, ' ')

  while (i < n) {
    const ch = src[i]
    const next = src[i + 1]

    // Комментарии
    if (ch === '/' && next === '/') {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? n : end
      out += blank(src.slice(i, stop))
      i = stop
      continue
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      out += blank(src.slice(i, stop))
      i = stop
      continue
    }

    // Обычные строки — копируем как есть
    if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < n && src[j] !== ch && src[j] !== '\n') {
        if (src[j] === '\\') { j++ }
        j++
      }
      out += src.slice(i, j + 1)
      i = j + 1
      lastSig = ch
      lastWord = ''
      continue
    }

    // Шаблонная строка: содержимое вырезаем, `${ … }` разбираем как код
    if (ch === '`') {
      out += ' '
      i++
      i = skipTemplateBody(src, i, (s) => (out += s))
      lastSig = '`'
      lastWord = ''
      continue
    }

    // Регулярный литерал
    if (
      ch === '/'
      && (lastSig === '' || /[(,=:[!&|?{};]/.test(lastSig) || ['return', 'typeof', 'case'].includes(lastWord))
    ) {
      let j = i + 1
      let inClass = false
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === '[') { inClass = true }
        else if (src[j] === ']') { inClass = false }
        else if (src[j] === '/' && !inClass) { break }
        j++
      }
      out += blank(src.slice(i, j + 1))
      i = j + 1
      lastSig = '/'
      lastWord = ''
      continue
    }

    out += ch
    if (!/\s/.test(ch)) {
      if (/[A-Za-z0-9_$]/.test(ch)) { lastWord = /[A-Za-z0-9_$]/.test(src[i - 1] ?? '') ? lastWord + ch : ch }
      else { lastWord = '' }
      lastSig = ch
    }
    i++
  }
  return out
}

/** Пропускает тело шаблонной строки до закрывающего бэктика; код внутри `${}` копирует в вывод. */
function skipTemplateBody(src, start, emit) {
  let i = start
  const n = src.length
  while (i < n) {
    const ch = src[i]
    if (ch === '\\') {
      emit(src[i + 1] === '\n' ? ' \n' : '  ')
      i += 2
      continue
    }
    if (ch === '`') {
      emit(' ')
      return i + 1
    }
    if (ch === '$' && src[i + 1] === '{') {
      // Вложенное выражение: ищем парную `}` с учётом строк и вложенных шаблонов.
      emit('  ')
      let depth = 1
      let j = i + 2
      let code = ''
      while (j < n && depth > 0) {
        const c = src[j]
        if (c === '`') {
          let tmp = ''
          j = skipTemplateBody(src, j + 1, (s) => (tmp += s))
          code += ' ' + tmp
          continue
        }
        if (c === "'" || c === '"') {
          let k = j + 1
          while (k < n && src[k] !== c && src[k] !== '\n') {
            if (src[k] === '\\') { k++ }
            k++
          }
          code += src.slice(j, k + 1)
          j = k + 1
          continue
        }
        if (c === '{') { depth++ }
        if (c === '}') {
          depth--
          if (depth === 0) { break }
        }
        code += c
        j++
      }
      emit(code.replace(/[^\n]/g, ' '))
      emit(' ')
      i = j + 1
      continue
    }
    emit(ch === '\n' ? '\n' : ' ')
    i++
  }
  return i
}

/** Базовое имя пакета из спецификатора: `@scope/pkg/sub` → `@scope/pkg`, `pkg/sub` → `pkg`. */
export function packageBase(spec) {
  return spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
}

/**
 * Спецификаторы модулей, которые импортирует исходник (JS или .d.ts): статические (`import … from`, `export … from`,
 * `require`) и динамические (`import('m')`) отдельно — первые грузятся вместе с модулем, вторые лениво.
 */
export function extractImportSpecs(src) {
  const code = stripCommentsAndTemplates(src)
  const staticSpecs = new Set()
  const dynamicSpecs = new Set()
  const staticPatterns = [
    // import x from 'm' / import { a } from 'm' / import * as x from 'm' / import type … from 'm' / import 'm'
    /(?:^|[\s;{}])import\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s*)?['"]([^'"]+)['"]/g,
    // export … from 'm'
    /(?:^|[\s;{}])export\s+(?:type\s+)?[^'"`;]*?\sfrom\s*['"]([^'"]+)['"]/g,
    // import x = require('m')
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const re of staticPatterns) {
    for (const m of code.matchAll(re)) {
      staticSpecs.add(m[1])
    }
  }
  // import('m') — и в .d.ts: import('m').Type
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    dynamicSpecs.add(m[1])
  }
  return { staticSpecs, dynamicSpecs }
}

/** Базовое имя внешнего пакета из спецификатора; относительные пути и встроенные модули Node — `null`. */
function externalBase(spec) {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:') || spec.startsWith('data:')) {
    return null
  }
  const base = packageBase(spec)
  return NODE_BUILTINS.has(base) ? null : base
}

/** Внешние пакеты, которые импортирует исходник (JS или .d.ts); относительные и встроенные модули Node не считаются. */
export function extractExternalImports(src) {
  const { staticSpecs, dynamicSpecs } = extractImportSpecs(src)
  const bases = new Set()
  for (const spec of [...staticSpecs, ...dynamicSpecs]) {
    const base = externalBase(spec)
    if (base) {
      bases.add(base)
    }
  }
  return bases
}

/**
 * Optional peer, который импортирует файл, достижимый из entry, — не optional: бандлер (Next/Turbopack, Vite)
 * разрешает ВСЕ импорты собираемых файлов, в том числе чанки, подгружаемые через `import('./chunk.js')`, и без
 * пакета падает с «Module not found», хотя npm его не ставил. Внешний `import('pkg')` — тоже: Turbopack и webpack
 * разрешают его при сборке, а Vite — нет (поэтому только Next-проект это и показывает).
 *
 * По умолчанию достижимость считается только от корневых entry (`.`, main, bin): subpath-entry — штатное место для
 * optional peer. Пакет, у которого optional peer нужны лишь части subpath-ов (`@letar/forms`: тяжёлые поля), задаёт
 * `optionalPeerEntries` — список subpath-ов, которым это разрешено. Тогда «ядром» считаются корневые entry и все
 * остальные subpath-entry: ни один из них не должен тянуть optional peer.
 * @param {string} dist
 * @param {object} pj dist/package.json
 * @param {{ optionalPeerEntries?: string[] }} [options]
 * @returns {string[]} ошибки
 */
export function checkOptionalPeers(dist, pj, options = {}) {
  const optional = new Set(
    Object.entries(pj.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta?.optional)
      .map(([name]) => name),
  )
  if (optional.size === 0) {
    return []
  }
  // Subpath-entry (`exports['./zenstack']`) — штатное место для optional peer: бандлер разрешит его, только если
  // потребитель сам импортирует этот subpath. Поэтому достижимость считаем от корневых entry (`.`, main, bin).
  const rootFiles = collectEntryPaths(pj)
    .filter(({ where }) => !where.startsWith('exports../'))
    .map(({ file }) => file)
  const coreSubpathFiles = []
  if (options.optionalPeerEntries) {
    const allowed = new Set(options.optionalPeerEntries)
    for (const [key, value] of Object.entries(pj.exports ?? {})) {
      if (key === '.' || key === './package.json' || allowed.has(key)) { continue }
      coreSubpathFiles.push(...collectEntryPaths({ exports: value }).map(({ file }) => file))
    }
  }
  const entries = [...rootFiles, ...coreSubpathFiles]
    .map((file) => path.join(dist, file))
    .filter((file) => /\.(js|mjs|cjs)$/.test(file) && fs.existsSync(file))
  const visited = new Set()
  const offenders = new Map() // peer → { file, entry }
  for (const entry of new Set(entries)) {
    const queue = [entry]
    while (queue.length > 0) {
      const file = queue.pop()
      if (visited.has(file)) {
        continue
      }
      visited.add(file)
      const { staticSpecs, dynamicSpecs } = extractImportSpecs(fs.readFileSync(file, 'utf8'))
      for (const spec of [...dynamicSpecs, ...staticSpecs]) {
        if (spec.startsWith('.')) {
          const target = path.resolve(path.dirname(file), spec)
          if (fs.existsSync(target) && fs.statSync(target).isFile()) {
            queue.push(target)
          }
          continue
        }
        const base = externalBase(spec)
        if (base && optional.has(base) && !offenders.has(base)) {
          offenders.set(base, {
            file: path.relative(dist, file).split(path.sep).join('/'),
            entry: path.relative(dist, entry).split(path.sep).join('/'),
          })
        }
      }
    }
  }
  return [...offenders].map(
    ([base, { file, entry }]) =>
      `optional peer ${base} импортирует ${file} (достижим из ${entry}, в том числе через чанк) — бандлер разрешит его при сборке; объяви обычным peer или вынеси в отдельный subpath-entry (не достижимый из корневого)`,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательное
// ─────────────────────────────────────────────────────────────────────────────

function walkFiles(dir, root = dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') { continue }
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) { walkFiles(full, root, acc) }
    else { acc.push({ full, rel: path.relative(root, full).split(path.sep).join('/') }) }
  }
  return acc
}

/** Строки пути из exports/main/module/types/bin, которые должны существовать в dist. */
function collectEntryPaths(pj) {
  const found = []
  const visit = (value, where) => {
    if (typeof value === 'string') {
      if (value.startsWith('./') && !value.includes('*')) { found.push({ file: value, where }) }
      return
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) { visit(v, `${where}.${k}`) }
    }
  }
  visit(pj.exports, 'exports')
  for (const field of ['main', 'module', 'types', 'typings']) {
    if (typeof pj[field] === 'string') { found.push({ file: pj[field], where: field }) }
  }
  if (typeof pj.bin === 'string') { found.push({ file: pj.bin, where: 'bin' }) }
  else if (pj.bin) { for (const [name, file] of Object.entries(pj.bin)) { found.push({ file, where: `bin.${name}` }) } }
  return found
}

function hasUseClient(src) {
  return /^﻿?\s*(?:\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src)
}

/** Имена приватных приложений: последний сегмент path из .gitmodules, без `-e2e`, без .claude/private. */
export function privateNamesFromGitmodules(gitmodulesText) {
  const names = new Set()
  for (const m of gitmodulesText.matchAll(/^\s*path\s*=\s*(\S+)\s*$/gm)) {
    const p = m[1]
    if (p.startsWith('.claude')) { continue }
    const last = p.split('/').pop().replace(/-e2e$/, '')
    if (last) { names.add(last) }
  }
  return [...names]
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ─────────────────────────────────────────────────────────────────────────────
// Проверки
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверяет один собранный dist.
 * @param {{ dist: string, srcVersion: string, useClient?: { neutral: string[] }, privateNames: string[], privateAllow?: string[], optionalPeerEntries?: string[] }} opts
 * @returns {string[]} список ошибок (пустой — всё в порядке)
 */
export function checkDist({ dist, srcVersion, useClient, privateNames, privateAllow = [], optionalPeerEntries }) {
  const errors = []
  const pjPath = path.join(dist, 'package.json')
  if (!fs.existsSync(pjPath)) { return ['нет dist/package.json — сначала build:npm или --build'] }
  const raw = fs.readFileSync(pjPath, 'utf8')
  const pj = JSON.parse(raw)

  // 2. Манифест
  if (raw.includes('workspace:')) { errors.push('в dist/package.json остался протокол workspace:') }
  if (pj.publishConfig?.tag !== 'next') {
    errors.push(`publishConfig.tag = ${pj.publishConfig?.tag ?? 'нет'}, ожидается next`)
  }
  if (pj.publishConfig?.access !== 'public') {
    errors.push(`publishConfig.access = ${pj.publishConfig?.access ?? 'нет'}, ожидается public`)
  }
  if (pj.version !== srcVersion) {
    errors.push(`версия dist ${pj.version} != версия libs/<pkg>/package.json ${srcVersion}`)
  }
  for (const f of ['LICENSE', 'README.md']) {
    if (!fs.existsSync(path.join(dist, f))) { errors.push(`нет ${f} в dist`) }
  }
  if (JSON.stringify(pj.exports ?? {}).includes('@letar/source')) {
    errors.push('в exports осталось условие @letar/source')
  }

  // 3. Точки входа
  for (const { file, where } of collectEntryPaths(pj)) {
    if (!fs.existsSync(path.join(dist, file))) { errors.push(`${where} → ${file} не существует`) }
  }

  const files = walkFiles(dist)

  // 1. Импорты
  const declared = new Set([
    ...Object.keys(pj.dependencies ?? {}),
    ...Object.keys(pj.peerDependencies ?? {}),
    ...Object.keys(pj.peerDependenciesMeta ?? {}),
    ...Object.keys(pj.optionalDependencies ?? {}),
  ])
  const undeclared = new Map()
  for (const { full, rel } of files) {
    if (!/\.(js|mjs|cjs|d\.ts|d\.mts|d\.cts)$/.test(rel)) { continue }
    for (const base of extractExternalImports(fs.readFileSync(full, 'utf8'))) {
      if (declared.has(base) || base === pj.name) { continue }
      if (!undeclared.has(base)) { undeclared.set(base, []) }
      undeclared.get(base).push(rel)
    }
  }
  for (const [base, where] of undeclared) {
    const sample = where.slice(0, 3).join(', ') + (where.length > 3 ? ', …' : '')
    errors.push(
      `необъявленный импорт ${base} (${sample}) — добавь в dependencies/peerDependencies package.publish.json`,
    )
  }

  // 4. 'use client'
  if (useClient) {
    const neutral = new Set(useClient.neutral ?? [])
    for (const { full, rel } of files) {
      if (!rel.endsWith('.js')) { continue }
      const directive = hasUseClient(fs.readFileSync(full, 'utf8'))
      if (neutral.has(rel) && directive) {
        errors.push(`${rel}: нейтральный entry не должен начинаться с 'use client'`)
      }
      if (!neutral.has(rel) && !directive) { errors.push(`${rel}: нет 'use client' первой строкой`) }
    }
    for (const rel of neutral) {
      if (!files.some((f) => f.rel === rel)) { errors.push(`нейтральный entry ${rel} из реестра не найден в dist`) }
    }
  }

  // 7. Optional peer, достижимый статически из entry
  errors.push(...checkOptionalPeers(dist, pj, { optionalPeerEntries }))

  // 5. Имена приватных приложений (целое слово, с учётом регистра, во всех текстовых файлах)
  const allow = new Set(privateAllow)
  const names = privateNames.filter((n) => !allow.has(n))
  if (names.length > 0) {
    const re = new RegExp(`(?<![A-Za-z0-9_-])(${names.map(escapeRe).join('|')})(?![A-Za-z0-9_-])`, 'g')
    for (const { full, rel } of files) {
      if (!TEXT_EXT.test(rel) && path.basename(rel).includes('.')) { continue }
      const text = fs.readFileSync(full, 'utf8')
      if (text.includes('\0')) { continue }
      const hits = new Set([...text.matchAll(re)].map((m) => m[1]))
      if (hits.size > 0) { errors.push(`${rel}: имя приватного приложения (${[...hits].join(', ')})`) }
    }
  }

  return errors
}

/** Сверка реестра с publish-npm.yml: триггеры по тегам и варианты ручного запуска. */
export function checkWorkflowSync(workflowText, tags) {
  const errors = []
  const triggerTags = new Set(
    [...workflowText.matchAll(/^\s*-\s*['"]?([a-z0-9-]+)-v\*\.\*\.\*['"]?\s*$/gm)].map((m) => m[1]),
  )

  const optionTags = new Set()
  const lines = workflowText.split('\n')
  const optIdx = lines.findIndex((l) => /^\s*options:\s*$/.test(l))
  if (optIdx !== -1) {
    for (let i = optIdx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s*['"]?([^'"#\s]+)['"]?\s*(?:#.*)?$/)
      if (!m) { break }
      optionTags.add(m[1])
    }
  }

  const wanted = new Set(tags)
  for (const tag of wanted) {
    if (!triggerTags.has(tag)) { errors.push(`publish-npm.yml: нет триггера '${tag}-v*.*.*'`) }
    if (!optionTags.has(tag)) {
      errors.push(`publish-npm.yml: нет варианта '${tag}' в workflow_dispatch.inputs.project.options`)
    }
  }
  for (const tag of triggerTags) {
    if (!wanted.has(tag)) { errors.push(`publish-npm.yml: триггер '${tag}-v*.*.*' есть, а пакета нет в реестре`) }
  }
  for (const tag of optionTags) {
    if (!wanted.has(tag)) { errors.push(`publish-npm.yml: вариант '${tag}' есть, а пакета нет в реестре`) }
  }
  return errors
}

// ─────────────────────────────────────────────────────────────────────────────
// Запуск
// ─────────────────────────────────────────────────────────────────────────────

export function loadRegistry(root = REPO_ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/npm-published-packages.json'), 'utf8'))
}

function readPackageJson(dir) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, dir, 'package.json'), 'utf8'))
}

const stripAnsi = (s) => s.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')

function run(cmd, args, label) {
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  })
  // eslint-disable-next-line no-control-regex
  const out = stripAnsi(`${res.stdout ?? ''}${res.stderr ?? ''}${res.error ? `\n${res.error.message}` : ''}`)
  return { ok: res.status === 0, out, label }
}

// Локально nx глобальный (AGENTS.md), в CI его нет — там nx запускают через bunx, как в ci.yml.
// Без этого в GitHub Actions spawn падал ENOENT мгновенно и молча («build:npm упал» без вывода).
const NX = process.env.CI ? { cmd: 'bunx', prefix: ['nx'] } : { cmd: 'nx', prefix: [] }

function main() {
  const args = process.argv.slice(2)
  const known = (a) => ['--build', '--publint'].includes(a) || a.startsWith('--only=')
  const unknown = args.filter((a) => !known(a))
  if (unknown.length > 0) {
    console.error(`неизвестные аргументы: ${unknown.join(', ')}\nсм. шапку scripts/check-npm-package-integrity.mjs`)
    process.exit(2)
  }
  const wantBuild = args.includes('--build')
  const wantPublint = args.includes('--publint')
  const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)

  const registry = loadRegistry()
  let packages = registry.packages
  if (only) {
    packages = packages.filter((p) => p.tag === only)
    if (packages.length === 0) {
      console.error(`нет пакета с tag=${only}; в реестре: ${registry.packages.map((p) => p.tag).join(', ')}`)
      process.exit(2)
    }
  }

  if (wantBuild) {
    const projects = packages.map((p) => readPackageJson(p.dir).name).join(',')
    console.log(`сборка: nx run-many -t build:npm --projects=${projects} --skip-nx-cache`)
    const res = run(
      NX.cmd,
      [...NX.prefix, 'run-many', '-t', 'build:npm', `--projects=${projects}`, '--skip-nx-cache'],
      'build',
    )
    if (!res.ok) {
      console.error(res.out)
      console.error('✖ build:npm упал')
      process.exit(1)
    }
  } else {
    const missing = packages.filter((p) => !fs.existsSync(path.join(REPO_ROOT, p.dir, 'dist', 'package.json')))
    if (missing.length > 0) {
      console.error(`нет dist у: ${missing.map((p) => p.tag).join(', ')} — сначала build:npm или --build`)
      process.exit(1)
    }
  }

  const gitmodules = fs.existsSync(path.join(REPO_ROOT, '.gitmodules'))
    ? fs.readFileSync(path.join(REPO_ROOT, '.gitmodules'), 'utf8')
    : ''
  const privateNames = [...new Set([...privateNamesFromGitmodules(gitmodules), ...(registry.privateNamesExtra ?? [])])]

  let failed = 0
  for (const pkg of packages) {
    const src = readPackageJson(pkg.dir)
    const dist = path.join(REPO_ROOT, pkg.dir, 'dist')
    const errors = checkDist({
      dist,
      srcVersion: src.version,
      useClient: pkg.useClient,
      privateNames,
      privateAllow: registry.privateNamesAllow ?? [],
      optionalPeerEntries: pkg.optionalPeerEntries,
    })

    if (wantPublint && errors.length === 0) {
      const lint = run('bunx', [`publint@${PUBLINT_VERSION}`, dist], 'publint')
      if (!lint.ok || /^\s*(Errors|Warnings):/m.test(lint.out)) {
        errors.push(`publint ${PUBLINT_VERSION}:\n${indent(lint.out)}`)
      }
      const attw = run('bunx', [
        `@arethetypeswrong/cli@${ATTW_VERSION}`,
        '--pack',
        dist,
        '--profile',
        'esm-only',
        '--format',
        'table-flipped',
      ], 'attw')
      if (!attw.ok) { errors.push(`attw ${ATTW_VERSION}:\n${indent(attw.out)}`) }
    }

    if (errors.length === 0) {
      console.log(`✅ ${src.name}@${src.version}`)
    } else {
      failed++
      console.log(`❌ ${src.name}@${src.version}`)
      for (const e of errors) { console.log(`   ✖ ${e}`) }
    }
  }

  // 6. Реестр ↔ workflow (не зависит от --only: рассинхрон списков виден всегда)
  const workflowPath = path.join(REPO_ROOT, '.github/workflows/publish-npm.yml')
  const syncErrors = fs.existsSync(workflowPath)
    ? checkWorkflowSync(fs.readFileSync(workflowPath, 'utf8'), registry.packages.map((p) => p.tag))
    : ['нет .github/workflows/publish-npm.yml']
  if (syncErrors.length === 0) {
    console.log('✅ реестр синхронен с publish-npm.yml')
  } else {
    failed++
    console.log('❌ реестр и publish-npm.yml')
    for (const e of syncErrors) { console.log(`   ✖ ${e}`) }
  }

  if (wantPublint) { console.log(`\nинструменты: publint@${PUBLINT_VERSION}, @arethetypeswrong/cli@${ATTW_VERSION}`) }
  console.log(failed ? `\nИтого с ошибками: ${failed}` : '\nВсе проверки пройдены')
  process.exit(failed ? 1 : 0)
}

const indent = (s) => s.trimEnd().split('\n').map((l) => `     ${l}`).join('\n')

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
