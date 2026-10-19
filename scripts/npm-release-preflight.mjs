#!/usr/bin/env node
// Предполётная проверка выпуска npm-пакета. Вся логика «можно ли публиковать» — здесь, а не в workflow:
// её можно прогнать локально, workflow только вызывает скрипт (.github/workflows/publish-npm.yml).
//
//   bun scripts/npm-release-preflight.mjs --tag forms-v2.41.2      # режим релиза (по тегу)
//   bun scripts/npm-release-preflight.mjs --project forms          # без тега: ручной запуск / проверка перед тегом
//   ... --skip-registry                                            # не ходить в npm (PR, локально до первой публикации)
//
// Шаги:
//   1. пакет — из реестра scripts/data/npm-published-packages.json; версия из тега == libs/<pkg>/package.json;
//   2. check-npm-package-integrity.mjs --build --only=<tag> --publint;
//   3. (если нет --skip-registry) каждая @letar/*-зависимость и peer уже опубликована в нужной версии
//      (порядок публикации), а диапазон каждой внешней зависимости удовлетворим в реестре npm;
//   4. печатает итог и путь к dist для шага публикации (при GITHUB_OUTPUT — пишет туда dist=…).
//
// Код возврата: 1 при любой ошибке. Процедура выпуска — .claude/docs/npm-publish-from-monorepo.md.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

/** Разбор git-тега `<tag>-v<version>`: `forms-core-v0.31.0` → { tag: 'forms-core', version: '0.31.0' }. */
export function parseReleaseTag(gitTag) {
  const m = gitTag.replace(/^refs\/tags\//, '').match(/^(.+)-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/)
  return m ? { tag: m[1], version: m[2] } : null
}

function run(cmd, args, { inherit = false } = {}) {
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
  })
  return { ok: res.status === 0, out: `${res.stdout ?? ''}${res.stderr ?? ''}` }
}

/** `npm view <name>@<range> version` — версии, подходящие под диапазон; пусто — такой версии в реестре нет. */
function registryVersions(name, range) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  // На Windows команда идёт через shell: диапазон вида `>=3.0.0` без кавычек стал бы перенаправлением вывода в файл
  const spec = `${name}@${range}`
  const res = spawnSync(npm, ['view', process.platform === 'win32' ? `"${spec}"` : spec, 'version', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  const out = (res.stdout ?? '').trim()
  if (res.status !== 0 || !out) {
    return []
  }
  try {
    const parsed = JSON.parse(out)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function main() {
  const args = process.argv.slice(2)
  const valueOf = (flag) => {
    const i = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
    if (i === -1) {
      return undefined
    }
    return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1]
  }
  const gitTag = valueOf('--tag')
  const project = valueOf('--project')
  const skipRegistry = args.includes('--skip-registry')
  if ((!gitTag && !project) || (gitTag && project)) {
    console.error(
      'нужен ровно один из аргументов: --tag <tag>-v<версия> или --project <tag>\nсм. шапку scripts/npm-release-preflight.mjs',
    )
    process.exit(2)
  }

  const registry = readJson(path.join(REPO_ROOT, 'scripts/data/npm-published-packages.json'))
  let tag = project
  let tagVersion = null
  if (gitTag) {
    const parsed = parseReleaseTag(gitTag)
    if (!parsed) {
      console.error(`✖ тег «${gitTag}» не похож на <пакет>-v<x.y.z>`)
      process.exit(1)
    }
    tag = parsed.tag
    tagVersion = parsed.version
  }
  const pkg = registry.packages.find((p) => p.tag === tag)
  if (!pkg) {
    console.error(`✖ пакета «${tag}» нет в реестре; есть: ${registry.packages.map((p) => p.tag).join(', ')}`)
    process.exit(1)
  }
  const src = readJson(path.join(REPO_ROOT, pkg.dir, 'package.json'))
  const errors = []

  // 1. Версия тега
  if (tagVersion && tagVersion !== src.version) {
    console.error(`✖ тег ${gitTag}, а в ${pkg.dir}/package.json версия ${src.version}`)
    process.exit(1)
  }
  console.log(`▶ ${src.name}@${src.version}${gitTag ? ` (тег ${gitTag})` : ''}`)

  // 2. Сборка и проверка пакета
  console.log('▶ сборка и проверка dist (check-npm-package-integrity --build --publint)')
  const integrity = run(process.execPath, [
    'scripts/check-npm-package-integrity.mjs',
    '--build',
    `--only=${tag}`,
    '--publint',
  ], { inherit: true })
  if (!integrity.ok) {
    console.error('✖ проверка пакета не прошла (вывод выше)')
    process.exit(1)
  }

  // 3. Реестр npm
  const dist = path.join(REPO_ROOT, pkg.dir, 'dist')
  const built = readJson(path.join(dist, 'package.json'))
  if (skipRegistry) {
    console.log('▶ реестр npm: пропущен (--skip-registry)')
  } else {
    console.log('▶ реестр npm: зависимости опубликованы и диапазоны удовлетворимы')
    const local = new Map(registry.packages.map((p) => [readJson(path.join(REPO_ROOT, p.dir, 'package.json')).name, p]))
    const optional = new Set(
      Object.entries(built.peerDependenciesMeta ?? {}).filter(([, m]) => m?.optional).map(([n]) => n),
    )
    const deps = { ...built.peerDependencies, ...built.dependencies }
    for (const [name, range] of Object.entries(deps)) {
      const found = registryVersions(name, range)
      if (found.length > 0) {
        continue
      }
      const sibling = local.get(name)
      if (sibling) {
        const siblingVersion = readJson(path.join(REPO_ROOT, sibling.dir, 'package.json')).version
        errors.push(
          `сначала опубликуй ${name} ${siblingVersion} (тег ${sibling.tag}-v${siblingVersion}): диапазон ${range} в npm не находит ни одной версии`,
        )
      } else if (optional.has(name)) {
        console.log(`  ⚠ ${name}@${range}: в npm нет подходящей версии (optional peer)`)
      } else {
        errors.push(`${name}@${range}: в npm нет версии под этот диапазон — установка пакета упадёт с ETARGET`)
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`✖ ${e}`)
    }
    process.exit(1)
  }

  console.log(`\n✅ ${built.name}@${built.version} готов к публикации`)
  console.log(`   dist: ${dist}`)
  console.log(`   dist-tag: ${built.publishConfig?.tag ?? '—'}`)
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `dist=${pkg.dir}/dist\nname=${built.name}\nversion=${built.version}\ntag=${tag}\ndisttag=${
        built.publishConfig?.tag ?? 'latest'
      }\n`,
    )
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
