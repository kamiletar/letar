#!/usr/bin/env node
// Smoke-проверка npm-пакетов так, как их увидит чужой проект: из tarball, вне монорепо.
// Фикстуры — scripts/npm-smoke/{next-app,vite-app,zenstack-app}; реестр пакетов —
// scripts/data/npm-published-packages.json. Каждая фикстура копируется в os.tmpdir() (без workspace-симлинков
// и без условия @letar/source), туда ставятся tarball'ы из `npm pack` и зависимости фикстуры.
//
// Использование:
//   node scripts/npm-smoke.mjs                       # всё: next, vite, zenstack, mcp (нужны собранные dist)
//   node scripts/npm-smoke.mjs --build               # сначала nx run-many -t build:npm по всем пакетам реестра
//   node scripts/npm-smoke.mjs --only=next,vite      # часть проверок
//   node scripts/npm-smoke.mjs --keep                # не удалять временные каталоги, напечатать пути
//
// Проверки:
//   next      tsc --noEmit + next build (серверный page.tsx рендерит <Form> — значит 'use client' дошёл до бандла)
//   vite      tsc --noEmit + vite build + ровно одна версия @letar/forms-core в дереве зависимостей
//   zenstack  zenstack generate с плагином из tarball + tsc --noEmit по сгенерированным схемам
//   mcp       cli.js из tarball по stdio: initialize + tools/list, в ответе есть list_fields
//
// Код возврата: 1 при любом сбое (вывод упавшей команды печатается целиком). Док — .claude/docs/npm-publish-from-monorepo.md.

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = path.join(REPO_ROOT, 'scripts', 'npm-smoke')

// Какие tarball'ы ставятся в какую фикстуру (по tag из реестра)
const PART_PACKAGES = {
  next: ['forms-core', 'forms-react', 'forms'],
  vite: ['forms-core', 'forms-react', 'forms', 'forms-query'],
  zenstack: ['zenstack-form-plugin'],
  mcp: ['form-mcp'],
}
const FIXTURE_DIR = { next: 'next-app', vite: 'vite-app', zenstack: 'zenstack-app' }

class SmokeError extends Error {}

const quote = (a) => (/[s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)

/** spawnSync: на Windows npm/npx/nx — .cmd-шимы, им нужен shell; команда одной строкой (без DEP0190). */
function spawnSyncShell(cmd, args, options) {
  if (process.platform !== 'win32') { return spawnSync(cmd, args, options) }
  return spawnSync([cmd, ...args].map(quote).join(' '), { ...options, shell: true })
}

function run(cmd, args, { cwd, label, env = {} }) {
  const childEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', npm_config_loglevel: 'error', ...env }
  delete childEnv.NODE_ENV
  const res = spawnSyncShell(cmd, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: childEnv,
  })
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`
  if (res.status !== 0) {
    throw new SmokeError(
      `${label}: команда упала (exit ${res.status})\n$ ${cmd} ${args.join(' ')}\n(cwd ${cwd})\n${out}`,
    )
  }
  return out
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'scripts/data/npm-published-packages.json'), 'utf8'))
}

function packAll(registry, tarballsDir, tags) {
  fs.mkdirSync(tarballsDir, { recursive: true })
  const result = {}
  for (const tag of tags) {
    const pkg = registry.packages.find((p) => p.tag === tag)
    if (!pkg) { throw new SmokeError(`в реестре нет пакета ${tag}`) }
    const dist = path.join(REPO_ROOT, pkg.dir, 'dist')
    if (!fs.existsSync(path.join(dist, 'package.json'))) {
      throw new SmokeError(`нет ${pkg.dir}/dist — сначала build:npm или --build`)
    }
    const out = run('npm', ['pack', '--pack-destination', tarballsDir, '--json'], {
      cwd: dist,
      label: `npm pack ${tag}`,
    })
    const info = JSON.parse(out.slice(out.indexOf('[')))
    result[tag] = path.join(tarballsDir, info[0].filename)
  }
  return result
}

function copyFixture(name, tmpRoot) {
  const dest = path.join(tmpRoot, name)
  fs.cpSync(path.join(FIXTURES, FIXTURE_DIR[name]), dest, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|\.next|dist|generated)([\\/]|$)/.test(src) && !src.endsWith('.db'),
  })
  return dest
}

/**
 * Информационный проход: tsc с skipLibCheck: false, в вывод попадают только ошибки внутри @letar/*.
 * Сторонние пакеты (chakra, zag-js) под TS 6 шумят сами, поэтому гейтом проход не служит.
 */
function strictPass(dir, label, ctx) {
  const res = spawnSyncShell('npx', ['tsc', '--noEmit', '--skipLibCheck', 'false'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const ours = String(res.stdout ?? '')
    .split(/\r?\n/)
    .filter((l) => /node_modules[\\/]@letar[\\/]/.test(l))
  for (const line of ours) { ctx.notes.push(`${label}: ${line}`) }
}

function npmInstall(dir, tarballs, label) {
  run('npm', ['install', '--no-audit', '--no-fund', ...tarballs], { cwd: dir, label: `${label}: npm install` })
}

/** Все версии пакета во всём дереве зависимостей (`npm ls --all --json`). */
function collectVersions(dir, name) {
  const res = spawnSyncShell('npm', ['ls', name, '--all', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const versions = new Set()
  const visit = (deps) => {
    for (const [key, node] of Object.entries(deps ?? {})) {
      if (key === name && node.version) { versions.add(node.version) }
      visit(node.dependencies)
    }
  }
  visit(JSON.parse(res.stdout || '{}').dependencies)
  return [...versions]
}

// ─────────────────────────────────────────────────────────────────────────────
// Части
// ─────────────────────────────────────────────────────────────────────────────

async function smokeNext(ctx) {
  const dir = copyFixture('next', ctx.tmpRoot)
  ctx.dirs.next = dir
  npmInstall(dir, PART_PACKAGES.next.map((t) => ctx.tarballs[t]), 'next')
  run('npx', ['tsc', '--noEmit'], { cwd: dir, label: 'next: tsc --noEmit' })
  strictPass(dir, 'next', ctx)
  run('npx', ['next', 'build'], { cwd: dir, label: 'next: next build' })
}

async function smokeVite(ctx) {
  const dir = copyFixture('vite', ctx.tmpRoot)
  ctx.dirs.vite = dir
  npmInstall(dir, PART_PACKAGES.vite.map((t) => ctx.tarballs[t]), 'vite')
  run('npx', ['tsc', '--noEmit'], { cwd: dir, label: 'vite: tsc --noEmit' })
  strictPass(dir, 'vite', ctx)
  run('npx', ['vite', 'build'], { cwd: dir, label: 'vite: vite build' })
  for (const name of ['@letar/forms-core', '@letar/forms-react']) {
    const versions = collectVersions(dir, name)
    if (versions.length !== 1) {
      throw new SmokeError(
        `vite: ${name} в дереве зависимостей: ${versions.join(', ') || 'нет'} — ожидается ровно одна версия`,
      )
    }
  }
}

async function smokeZenstack(ctx) {
  const dir = copyFixture('zenstack', ctx.tmpRoot)
  ctx.dirs.zenstack = dir
  npmInstall(dir, PART_PACKAGES.zenstack.map((t) => ctx.tarballs[t]), 'zenstack')
  run('npx', ['zenstack', 'generate'], { cwd: dir, label: 'zenstack: zenstack generate' })
  for (
    const rel of [
      'src/generated/form-schemas/User.form.ts',
      'src/generated/form-schemas/enums/Role.form.ts',
      'src/generated/form-schemas/index.ts',
    ]
  ) {
    if (!fs.existsSync(path.join(dir, rel))) { throw new SmokeError(`zenstack: плагин не создал ${rel}`) }
  }
  run('npx', ['tsc', '--noEmit'], { cwd: dir, label: 'zenstack: tsc --noEmit' })
}

async function smokeMcp(ctx) {
  const dir = path.join(ctx.tmpRoot, 'mcp')
  ctx.dirs.mcp = dir
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'npm-smoke-mcp', version: '0.0.0', private: true }),
  )
  npmInstall(dir, PART_PACKAGES.mcp.map((t) => ctx.tarballs[t]), 'mcp')

  const cli = path.join('node_modules', '@letar', 'form-mcp', 'cli.js')
  const child = spawn(process.execPath, [cli], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (d) => (stdout += d))
  child.stderr.on('data', (d) => (stderr += d))
  const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`)

  const waitFor = (id, timeoutMs) =>
    new Promise((resolve, reject) => {
      const started = Date.now()
      const tick = () => {
        for (const line of stdout.split('\n')) {
          if (!line.trim()) { continue }
          try {
            const msg = JSON.parse(line)
            if (msg.id === id) { return resolve(msg) }
          } catch {
            /* не JSON — лог сервера */
          }
        }
        if (child.exitCode !== null) {
          return reject(
            new SmokeError(
              `mcp: процесс завершился (exit ${child.exitCode}) до ответа ${id}\nstdout: ${stdout}\nstderr: ${stderr}`,
            ),
          )
        }
        if (Date.now() - started > timeoutMs) {
          return reject(
            new SmokeError(`mcp: нет ответа на запрос ${id} за ${timeoutMs} мс\nstdout: ${stdout}\nstderr: ${stderr}`),
          )
        }
        setTimeout(tick, 50)
      }
      tick()
    })

  try {
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'npm-smoke', version: '0.0.0' } },
    })
    const init = await waitFor(1, 30_000)
    if (init.error) { throw new SmokeError(`mcp: initialize вернул ошибку: ${JSON.stringify(init.error)}`) }
    send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    const list = await waitFor(2, 30_000)
    const names = (list.result?.tools ?? []).map((t) => t.name)
    if (!names.includes('list_fields')) {
      throw new SmokeError(
        `mcp: в tools/list нет list_fields; получено: ${names.join(', ') || JSON.stringify(list)}\nstderr: ${stderr}`,
      )
    }
  } finally {
    child.kill()
  }
}

const PARTS = { next: smokeNext, vite: smokeVite, zenstack: smokeZenstack, mcp: smokeMcp }

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter((a) => a !== '--build' && a !== '--keep' && !a.startsWith('--only='))
  if (unknown.length > 0) {
    console.error(`неизвестные аргументы: ${unknown.join(', ')}\nсм. шапку scripts/npm-smoke.mjs`)
    process.exit(2)
  }
  const onlyArg = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)
  const parts = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(PARTS)
  const bogus = parts.filter((p) => !(p in PARTS))
  if (bogus.length > 0) {
    console.error(`нет таких частей: ${bogus.join(', ')}; доступные: ${Object.keys(PARTS).join(', ')}`)
    process.exit(2)
  }
  const keep = args.includes('--keep')
  const registry = loadRegistry()
  const tags = [...new Set(parts.flatMap((p) => PART_PACKAGES[p]))]

  if (args.includes('--build')) {
    const projects = tags
      .map((t) => registry.packages.find((p) => p.tag === t))
      .map((p) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, p.dir, 'package.json'), 'utf8')).name)
      .join(',')
    console.log(`сборка: nx run-many -t build:npm --projects=${projects} --skip-nx-cache`)
    run('nx', ['run-many', '-t', 'build:npm', `--projects=${projects}`, '--skip-nx-cache'], {
      cwd: REPO_ROOT,
      label: 'build:npm',
    })
  }

  const tmpRoot = path.join(os.tmpdir(), `letar-npm-smoke-${Date.now()}`)
  fs.mkdirSync(tmpRoot, { recursive: true })
  const ctx = { tmpRoot, tarballs: {}, dirs: {}, notes: [] }

  let failed = 0
  try {
    ctx.tarballs = packAll(registry, path.join(tmpRoot, 'tarballs'), tags)
    for (const part of parts) {
      const started = Date.now()
      try {
        await PARTS[part](ctx)
        console.log(`✅ ${part} (${Math.round((Date.now() - started) / 1000)} с)`)
      } catch (error) {
        failed++
        console.log(`❌ ${part}`)
        console.log(error instanceof SmokeError ? error.message : error)
      }
    }
  } catch (error) {
    failed++
    console.log(error instanceof SmokeError ? error.message : error)
  }

  if (ctx.notes.length > 0) {
    console.log('\nℹ tsc с skipLibCheck: false — замечания внутри @letar/* (не гейт):')
    for (const note of ctx.notes) { console.log(`  ${note}`) }
  }

  if (keep || failed) {
    console.log(`\nвременные каталоги оставлены: ${tmpRoot}`)
    for (const [part, dir] of Object.entries(ctx.dirs)) { console.log(`  ${part}: ${dir}`) }
  } else {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
  console.log(failed ? `\nИтого сбоев: ${failed}` : '\nSmoke пройден')
  process.exit(failed ? 1 : 0)
}

main()
