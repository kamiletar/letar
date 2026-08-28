#!/usr/bin/env bun
// Проверка, что патчи зависимостей из `patchedDependencies` всё ещё
// применяются к тому, что реально установлено.
//
// Зачем: ключ `patchedDependencies` прибит к ТОЧНОЙ версии пакета
// (`"@chakra-ui/react@3.36.1"`), а сама зависимость стоит по caret-диапазону
// (`^3.36.1`). Любой bump — `bun update`, `bun update --latest`,
// `bun add <pkg>@latest`, команда `/infra:deps-update` — разводит их, и патч
// перестаёт накладываться.
//
// bun 1.3.14 в этой ситуации МОЛЧИТ — проверено эмпирически на песочнице
// (PLAN-INFRA-4.md §118):
//   * `bun install` и `bun update --latest` завершаются кодом 0;
//   * ни одной строки предупреждения в stdout/stderr;
//   * файл `patches/*.patch` остаётся на диске, ключ в `package.json` остаётся
//     на месте — в git всё выглядит здоровым;
//   * блок `patchedDependencies` при этом ТИХО ПРОПАДАЕТ из `bun.lock` — это
//     единственный след в репозитории, и его легко не заметить в диффе
//     lock-файла на тысячи строк.
// Итог: пакет разворачивается стоковым, баг возвращается во все ~30
// приложений сразу, без единой ошибки сборки, lint или typecheck.
//
// Что делает: для каждой записи `patchedDependencies` корневого
// `package.json` проверяет три вещи —
//   1. файл патча существует на диске;
//   2. версия из ключа совпадает с версией, реально зарезолвленной в
//      `bun.lock` (и патч не потерялся из блока `patchedDependencies` самого
//      lock-файла);
//   3. нет ли в дереве ВТОРОЙ физической копии того же пакета другой версии —
//      она патчем не покрыта.
//
// Если версии разошлись — скрипт не просто ругается, а смотрит в свежую
// (уже установленную, ещё не пропатченную) копию пакета в `node_modules` и
// говорит, нужен ли патч дальше: маркер бага на месте — пересоздавать, маркера
// нет — апстрим, вероятно, починил, и патч пора УДАЛИТЬ, а не переносить.
//
// Использование: bun scripts/check-patched-deps.mjs
// Код возврата 1 при расхождении — это gate, а не отчёт (в отличие от
// scripts/check-peer-deps.mjs, который всегда 0).

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SELF = 'scripts/check-patched-deps.mjs'

// Реестр «как понять, нужен ли патч дальше». Ключ — имя пакета, значение
// описывает, где внутри пакета лежит место, ради которого патч заведён, и по
// какому маркеру видно, что апстрим его ещё НЕ починил.
//
// Заводишь новый патч — добавь сюда запись, иначе при следующем bump'е скрипт
// сможет сказать только «версии разошлись», но не «патч ещё нужен».
const UPSTREAM_MARKERS = {
  '@chakra-ui/react': {
    file: 'dist/esm/utils/memo.js',
    marker: /Object\.keys\(value\)\.sort\(\)/,
    what: 'сортировка ключей в хеше аргументов LRU-кеша `css()`',
    doc: '.claude/docs/chakra-css-memo-prop-order-hydration.md',
  },
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

// bun.lock — это JSONC формата lockfileVersion 1: допускает висячие запятые.
// Тот же приём, что в scripts/check-peer-deps.mjs.
function readLock(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/,(\s*[}\]])/g, '$1'))
}

// "@chakra-ui/react@3.36.1" → { name: "@chakra-ui/react", version: "3.36.1" }
// Последний `@` — разделитель версии, поэтому scoped-имена разбираются верно.
function splitSpec(spec) {
  const at = spec.lastIndexOf('@')
  return { name: spec.slice(0, at), version: spec.slice(at + 1) }
}

const pkgJson = readJson(join(repoRoot, 'package.json'))
const entries = Object.entries(pkgJson.patchedDependencies ?? {})

if (entries.length === 0) {
  console.log('патчей зависимостей нет — проверять нечего')
  process.exit(0)
}

const lock = readLock(join(repoRoot, 'bun.lock'))
const lockPatched = lock.patchedDependencies ?? {}

// Все физические копии каждого пакета в дереве: имя → Set версий.
const installedVersions = new Map()
for (const tuple of Object.values(lock.packages ?? {})) {
  if (!Array.isArray(tuple) || typeof tuple[0] !== 'string') { continue }
  const { name, version } = splitSpec(tuple[0])
  if (!name || !version) { continue }
  if (!installedVersions.has(name)) { installedVersions.set(name, new Set()) }
  installedVersions.get(name).add(version)
}

// Свежая копия пакета в node_modules — уже НЕ пропатченная, если версия
// разошлась. Именно её и надо смотреть на маркер бага.
function upstreamVerdict(name, actualVersion) {
  const known = UPSTREAM_MARKERS[name]
  if (!known) {
    return [
      `Нет записи про ${name} в UPSTREAM_MARKERS (${SELF}) — скрипт не может`,
      'сказать, нужен ли патч дальше. Посмотри сам, за что он отвечал',
      '(`cat patches/…`), и заодно добавь запись в реестр.',
    ]
  }

  const pkgDir = join(repoRoot, 'node_modules', name)
  const manifest = join(pkgDir, 'package.json')
  if (!existsSync(manifest)) {
    return [
      `${name} не найден в node_modules — сначала \`bun install\`, потом повтори`,
      `проверку. Без установленной копии смотреть вручную: \`npm pack`,
      `${name}@${actualVersion}\` и распакованный \`package/${known.file}\`.`,
    ]
  }

  const installed = readJson(manifest).version
  if (installed !== actualVersion) {
    return [
      `node_modules держит ${name}@${installed}, а bun.lock — ${actualVersion}:`,
      'дерево не синхронно с lock, прогони `bun install` и повтори проверку.',
    ]
  }

  const target = join(pkgDir, known.file)
  if (!existsSync(target)) {
    return [
      `Файл ${known.file} в ${name}@${installed} исчез — апстрим переложил или`,
      'переписал этот код. Патч в прежнем виде не переносится: разбирайся с',
      `новой структурой пакета, отправная точка — ${known.doc}`,
    ]
  }

  if (known.marker.test(readFileSync(target, 'utf8'))) {
    return [
      `Патч ВСЁ ЕЩЁ НУЖЕН — в ${name}@${installed} на месте то же самое: ${known.what}.`,
      '',
      'Пересоздать:',
      `  bun patch ${name}@${installed}`,
      `  # правишь node_modules/${name}/${known.file} и CJS-близнеца, если он есть`,
      `  bun patch --commit node_modules/${name}`,
      '  rm patches/<старый>.patch   # bun кладёт новый файл рядом, старый не трогает',
      '',
      `Что именно правится и зачем — ${known.doc}`,
    ]
  }

  return [
    `Похоже, АПСТРИМ ПОЧИНИЛ — в ${name}@${installed} этого больше нет: ${known.what}.`,
    '',
    'Тогда патч надо УДАЛИТЬ, а не переносить:',
    '  1. сверься с файлом глазами — маркер мог пропасть и от рефакторинга,',
    `     а не от фикса: node_modules/${name}/${known.file}`,
    '  2. убери запись из `patchedDependencies` корневого package.json',
    '  3. удали сам файл patches/<…>.patch',
    '  4. `bun install`',
    `  5. пометь в ${known.doc}, что баг закрыт апстримом и с какой версии`,
  ]
}

const problems = []
const ok = []

for (const [spec, patchFile] of entries) {
  const { name, version } = splitSpec(spec)
  const lines = []

  if (!existsSync(join(repoRoot, patchFile))) {
    lines.push(`файл патча не найден: ${patchFile}`)
  }

  const versions = installedVersions.get(name)
  if (!versions) {
    lines.push(`пакет ${name} вообще не найден в bun.lock — патч висит в пустоту`)
  } else if (!versions.has(version)) {
    lines.push(`ключ патча прибит к ${name}@${version}, а установлено: ${[...versions].join(', ')}`)
    lines.push('')
    lines.push(...upstreamVerdict(name, [...versions][0]))
  } else {
    if (!(spec in lockPatched)) {
      lines.push(
        `версии совпадают, но записи «${spec}» нет в patchedDependencies самого `
          + 'bun.lock — bun этот патч не зарегистрировал. Прогони `bun install` и '
          + 'посмотри, вернётся ли она в lock.',
      )
    }
    if (versions.size > 1) {
      const others = [...versions].filter((v) => v !== version).join(', ')
      lines.push(
        `в дереве несколько физических копий ${name}: пропатчена только ${version}, `
          + `рядом стоят ${others} — они идут стоковыми`,
      )
    }
  }

  if (lines.length > 0) {
    problems.push({ spec, lines })
  } else {
    ok.push(`${spec} → ${patchFile}`)
  }
}

if (problems.length === 0) {
  console.log(`✅ патчи зависимостей применяются (${ok.length}):`)
  for (const line of ok) {
    console.log(`   ${line}`)
  }
  process.exit(0)
}

console.error(`❌ ${problems.length} патч(ей) зависимостей больше не применяются\n`)
for (const { spec, lines } of problems) {
  console.error(`  ${spec}`)
  for (const line of lines) {
    console.error(line ? `    ${line}` : '')
  }
  console.error('')
}
console.error(
  'Напоминание: `bun install`/`bun update` в этой ситуации завершаются кодом 0\n'
    + 'и ничего не печатают — «сборка зелёная» тут ничего не доказывает.',
)
process.exit(1)
