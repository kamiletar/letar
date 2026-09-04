#!/usr/bin/env node
// Загружает клиентские sourcemaps приложения в GlitchTip после `nx build`, до `docker build`
// (PLAN-INFRA-4.md §70 п.6). Без этого стектрейсы в GlitchTip приходят из минифицированного
// кода. Протокол — тот же chunk-upload/artifact-bundle, что и у настоящего Sentry (GlitchTip v6
// его реализует, классический `releases/<version>/files/` отдаёт 405 — проверено эмпирически на
// errors.s3.letar.best), поэтому используем сам `@sentry/cli`, а не самописный HTTP-клиент.
//
// APIToken в GlitchTip не привязан к проекту — доступ идёт по членству пользователя в
// организации (см. apps/api_tokens/models.py, has_permission на chunk_upload проверяет
// Organization.objects.get(slug=..., users=request.auth.user_id)), поэтому токен один на все
// проекты организации kami, хранится в infra/glitchtip/.env.docker.enc, не per-app.
//
// Использование: node scripts/glitchtip-upload-sourcemaps.mjs <app> [release]
//   <app>     — имя приложения, совпадает со slug проекта в GlitchTip (apps/<app>/.next)
//   [release] — версия релиза, по умолчанию `git rev-parse --short HEAD`
//
// Требует в окружении GLITCHTIP_SOURCEMAPS_AUTH_TOKEN (расшифровать перед вызовом:
// `sops --decrypt infra/glitchtip/.env.docker.enc`).
//
// После успешной загрузки удаляет *.js.map из apps/<app>/.next/static — иначе они уедут в
// docker-образ и станут публично доступны (Dockerfile.production копирует .next/static целиком).

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SENTRY_URL = 'https://errors.s3.letar.best/'
const SENTRY_ORG = 'kami'

function resolveSentryCli() {
  for (const name of ['sentry-cli', 'sentry-cli.exe']) {
    const p = path.join(REPO_ROOT, 'node_modules', '.bin', name)
    if (existsSync(p)) { return p }
  }
  throw new Error('sentry-cli не найден в node_modules/.bin — запусти `bun install`')
}

function findSourceMaps(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) { out.push(...findSourceMaps(full)) }
    else if (entry.endsWith('.js.map')) { out.push(full) }
  }
  return out
}

function main() {
  const [app, releaseArg] = process.argv.slice(2)
  if (!app) {
    console.error('Использование: node scripts/glitchtip-upload-sourcemaps.mjs <app> [release]')
    process.exit(1)
  }

  const token = process.env.GLITCHTIP_SOURCEMAPS_AUTH_TOKEN
  if (!token) {
    console.error('[glitchtip-sourcemaps] GLITCHTIP_SOURCEMAPS_AUTH_TOKEN не задан в окружении')
    process.exit(1)
  }

  const staticDir = path.join(REPO_ROOT, 'apps', app, '.next', 'static')
  if (!existsSync(staticDir)) {
    console.error(`[glitchtip-sourcemaps] ${staticDir} не найден — nx build ещё не выполнен?`)
    process.exit(1)
  }

  const release = releaseArg
    ?? execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO_ROOT }).toString().trim()

  const sentryCli = resolveSentryCli()
  const env = {
    ...process.env,
    SENTRY_URL,
    SENTRY_ORG,
    SENTRY_PROJECT: app,
    SENTRY_AUTH_TOKEN: token,
  }

  console.log(`[glitchtip-sourcemaps] ${app}: inject debug id в ${staticDir}`)
  execFileSync(sentryCli, ['sourcemaps', 'inject', staticDir], { stdio: 'inherit', env })

  console.log(`[glitchtip-sourcemaps] ${app}: загрузка release=${release}`)
  execFileSync(
    sentryCli,
    ['sourcemaps', 'upload', '--release', release, staticDir],
    { stdio: 'inherit', env },
  )

  const maps = findSourceMaps(staticDir)
  console.log(`[glitchtip-sourcemaps] ${app}: удаляю ${maps.length} .js.map из образа сборки`)
  for (const file of maps) { rmSync(file) }

  console.log(`[glitchtip-sourcemaps] ${app}: готово (release=${release})`)
}

main()
