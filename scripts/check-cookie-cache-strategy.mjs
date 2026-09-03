#!/usr/bin/env node
// Гейт cookie-коллизии Better Auth: любое приложение, включающее stateless-JWT/JWE-
// кеш сессии (`session.cookieCache.strategy: 'jwt'`/`'jwe'`), обязано задавать свой
// `advanced.cookiePrefix` — иначе оно молча ловит баг из
// .claude/docs/better-auth-localhost-cookie-jar-collision.md.
//
// Зачем: все dev-серверы монорепо на localhost делят один cookie-jar (cookie better-auth
// не различаются по порту). JWT/JWE-кеш кладёт в `better-auth.session_data` значение с
// точками (`header.payload.signature`) — дефолтная `compact`-схема этот cookie декодирует
// без try/catch и падает `Invalid Base64 character: .` на GET /api/auth/get-session у
// ЛЮБОГО другого приложения с дефолтным именем cookie. Единственная сессия, где баг был
// найден и закрыт (2026-09-03), убрала `strategy: 'jwt'` из apps/dashboard/src/lib/auth.ts
// и оставила только предупреждающий комментарий — комментарий не мешает следующему
// приложению повторить ту же ошибку. Эта проверка — техническая страховка поверх
// комментария.
//
// Почему gate, а не просто "не используй jwt/jwe": stateless-кеш — легитимная
// оптимизация (меньше походов в БД на каждый get-session), запрещать её незачем — нужно
// только держать её изолированной от общего localhost cookie-jar через свой префикс.
// Образец — apps/studio/src/lib/auth-cookies.ts (AUTH_COOKIE_PREFIX = 'studio').
//
// Как ищем cookiePrefix: grep по `cookiePrefix` в самом auth.ts ИЛИ в соседних файлах
// src/lib/*.ts того же приложения (studio держит его в отдельном auth-cookies.ts,
// импортируемом в auth.ts) — не требуем конкретного имени файла.
//
// Комментарии (`// ...`, `/* ... */`) вычищаются перед поиском `strategy:` — иначе
// предупреждающий комментарий в dashboard/src/lib/auth.ts сам стал бы ложным срабатыванием.
//
// Использование:
//   node scripts/check-cookie-cache-strategy.mjs
//
// Exit 0 — совпадений strategy jwt/jwe нет, либо у каждого найденного есть cookiePrefix.
// Exit 1 — есть strategy jwt/jwe без cookiePrefix в приложении.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { walk } from './lib/fs-walk.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

const DOC = '.claude/docs/better-auth-localhost-cookie-jar-collision.md'

// Грубая, но достаточная для .ts-исходников чистка комментариев: построчно вырезает
// `//`-хвост и целиком выкидывает содержимое `/* ... */` (в т.ч. многострочное).
// Не учитывает `//`/`/*` внутри строковых литералов — в auth.ts монорепо такого нет
// (проверено по всем найденным файлам на момент написания).
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//')
      return idx === -1 ? line : line.slice(0, idx)
    })
    .join('\n')
}

function appDirs() {
  const appsDir = path.join(repoRoot, 'apps')
  return readdirSync(appsDir)
    .map((name) => path.join(appsDir, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory()
      } catch {
        return false
      }
    })
}

function main() {
  const findings = [] // { app, authFile }
  let checked = 0

  for (const appDir of appDirs()) {
    const appName = path.basename(appDir)
    const authFile = path.join(appDir, 'src', 'lib', 'auth.ts')
    let raw
    try {
      raw = readFileSync(authFile, 'utf8')
    } catch {
      continue
    }
    checked++

    const cleaned = stripComments(raw)
    const usesJwtLikeCache = /strategy\s*:\s*['"](jwt|jwe)['"]/.test(cleaned)
    if (!usesJwtLikeCache) { continue }

    const libFiles = walk(path.join(appDir, 'src', 'lib'), (e) => e.endsWith('.ts') && !e.endsWith('.spec.ts'), 5)
    const hasCookiePrefix = libFiles.some((f) => stripComments(readFileSync(f, 'utf8')).includes('cookiePrefix'))

    if (!hasCookiePrefix) {
      findings.push({ app: appName, authFile: rel(authFile) })
    }
  }

  console.log(`Проверено apps/*/src/lib/auth.ts: ${checked}`)

  if (findings.length === 0) {
    console.log('✅ Совпадений strategy jwt/jwe без cookiePrefix не найдено.')
    process.exit(0)
  }

  console.log(`\n❌ Найдены приложения со stateless-JWT/JWE-кешем сессии без cookiePrefix — ${findings.length}:\n`)
  for (const { app, authFile } of findings) {
    console.log(`  ${app} — ${authFile}`)
  }
  console.log(
    '\nЛюбое приложение с session.cookieCache.strategy jwt/jwe обязано задавать свой '
      + 'advanced.cookiePrefix — иначе оно ловит cookie-коллизию на localhost со всеми '
      + 'остальными dev-серверами монорепо (default compact-схема любого другого приложения '
      + `падает 500 на GET /api/auth/get-session). Образец — apps/studio/src/lib/auth-cookies.ts. Разбор — ${DOC}`,
  )
  process.exit(1)
}

main()
