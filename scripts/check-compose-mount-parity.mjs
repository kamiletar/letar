#!/usr/bin/env bun
// Сторож: bind-mount на запись сервиса `app` в docker-compose.production.yml обязан быть и в
// docker-compose.staging.yml того же приложения.
//
// Зачем: staging-compose заводились руками, копированием, пачкой под e2e-гейт (2026-07-14…18,
// «Тираж M1»), и `./uploads` выпал из пяти файлов сразу. Без bind-mount ничего не падает:
// контейнер пишет в свой writable-слой, e2e зелёный, файлы пропадают при пересоздании. Хуже того,
// staging перестаёт ловить поломки прав каталога (EACCES) — ровно то, ради чего он нужен
// (.claude/docs/docker-bind-mount-uid-gid-mismatch.md). Находили дважды по одному приложению
// (2026-07-22, 2026-09-05; во втором случае 7 недель маскировалось тем, что Next.js запекал
// uploads/ в образ), чинили точечно — остальные три дожили до 2026-09-23. Разбор —
// .claude/docs/staging-compose-mount-parity.md.
//
// Что сверяется: относительные (`./…`) bind-mount сервиса `app` без `:ro` — по пути ВНУТРИ
// контейнера. Абсолютные пути, `${VAR}`, именованные тома и прочие сервисы не сверяются:
// у staging законно свои БД, сокеты и секреты.
//
// Использование: bun scripts/check-compose-mount-parity.mjs
// Код возврата: 1, если у staging не хватает bind-mount из production; иначе 0.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { isCheckedOut, readSubmodulePaths } from './lib/submodules.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// Осознанные исключения: `'<app>': { '<путь в контейнере>': 'почему staging без него' }`.
// Причина обязательна — без неё исключение неотличимо от забытой строки.
const ALLOWED_MISSING = {}

/**
 * RW bind-mount с относительным источником: путь в контейнере → строка из compose.
 * Понимает и короткую (`./a:/b:rw`), и длинную (`{ type: bind, source, target }`) запись.
 */
function relativeRwBinds(service) {
  const result = new Map()
  for (const entry of service?.volumes ?? []) {
    let source, target, readOnly
    if (typeof entry === 'string') {
      const [src, dst, mode = ''] = entry.split(':')
      source = src
      target = dst
      readOnly = mode.split(',').includes('ro')
    } else if (entry && typeof entry === 'object') {
      if (entry.type && entry.type !== 'bind') {
        continue
      }
      source = entry.source
      target = entry.target
      readOnly = entry.read_only === true
    }
    if (!source?.startsWith('./') || !target || readOnly) {
      continue
    }
    result.set(target.replace(/\/+$/, ''), typeof entry === 'string' ? entry : `${source}:${target}`)
  }
  return result
}

/** Все пути в контейнере, смонтированные в сервис (любым способом, включая `:ro`). */
function allTargets(service) {
  const result = new Map()
  for (const entry of service?.volumes ?? []) {
    if (typeof entry === 'string') {
      const [, dst, mode = ''] = entry.split(':')
      if (dst) {
        result.set(dst.replace(/\/+$/, ''), mode.split(',').includes('ro'))
      }
    } else if (entry?.target) {
      result.set(entry.target.replace(/\/+$/, ''), entry.read_only === true)
    }
  }
  return result
}

function loadApp(path) {
  return parse(readFileSync(path, 'utf8'))?.services?.app
}

const submodules = new Set(readSubmodulePaths(repoRoot))
const problems = []
const skipped = []
let checked = 0

for (const name of readdirSync(join(repoRoot, 'apps')).sort()) {
  const rel = `apps/${name}`
  const abs = join(repoRoot, rel)
  if (submodules.has(rel) && !isCheckedOut(abs)) {
    skipped.push(rel)
    continue
  }
  const prodPath = join(abs, 'docker-compose.production.yml')
  const stagingPath = join(abs, 'docker-compose.staging.yml')
  if (!existsSync(prodPath) || !existsSync(stagingPath)) {
    continue
  }

  let prod, staging
  try {
    prod = loadApp(prodPath)
    staging = loadApp(stagingPath)
  } catch (error) {
    problems.push(`${name}: compose не разбирается — ${error.message}`)
    continue
  }
  checked++

  const stagingTargets = allTargets(staging)
  for (const [target, line] of relativeRwBinds(prod)) {
    const allowed = ALLOWED_MISSING[name]?.[target]
    if (allowed) {
      continue
    }
    if (!stagingTargets.has(target)) {
      problems.push(`${name}: в staging нет «${line}»`)
    } else if (stagingTargets.get(target)) {
      problems.push(`${name}: в staging «${target}» смонтирован :ro, в production — на запись`)
    }
  }
}

if (skipped.length > 0) {
  console.log(`⚠️  Неполное покрытие — не выкачаны: ${skipped.join(', ')}`)
}

if (problems.length > 0) {
  console.log(`❌ bind-mount production отсутствуют в staging (${problems.length}):`)
  for (const p of problems) {
    console.log(`  - ${p}`)
  }
  console.log('\nДобавь строку в services.app.volumes файла docker-compose.staging.yml.')
  console.log('Осознанное исключение — ALLOWED_MISSING в этом скрипте, с причиной.')
  console.log('Разбор: .claude/docs/staging-compose-mount-parity.md')
  process.exit(1)
}

console.log(`✅ staging-compose содержат все bind-mount production (приложений: ${checked})`)
