#!/usr/bin/env node
// Гейт схемы Better Auth: сверяет модели Account/oauthClient в schema.zmodel каждого
// приложения с полями, которые реально требует установленная версия better-auth /
// @better-auth/oauth-provider.
//
// Зачем: минорный апгрейд `better-auth` (`^1.6.x` → 1.7 через caret) тихо добавил
// обязательное поле `Account.issuer` — ни typecheck, ни lint этого не ловят, падение
// проявляется только 500-кой в рантайме на sign-up/reset-password (см.
// .claude/docs/better-auth-1.7-account-issuer-field.md, PLAN.md §71). Отдельно
// `@better-auth/oauth-provider` держит собственную схему `oauthClient` с полем
// `redirectUris` (required: true) — модель приложения может мапить своё имя таблицы
// через `schema: { oauthClient: { modelName: '...' } }` (см. auth-hub), поле всё равно
// обязано существовать.
//
// Как скрипт узнаёт "требуемый набор полей": НЕ хардкодит список руками и НЕ парсит
// dist-файлы регэкспом (оба подхода не переживут следующий minor better-auth). Вместо
// этого резолвит и ИСПОЛНЯЕТ реальный код установленного пакета:
//   - `@better-auth/core/db` -> `getAuthTables({})` — та же функция, которую сам
//     better-auth вызывает внутри adapter'а, чтобы построить схему таблицы `account`.
//   - `@better-auth/oauth-provider` -> `oauthProvider({})` возвращает плагин-объект,
//     `.schema.oauthClient.fields` — тот же schema-blueprint, который плагин мержит
//     с пользовательским `schema: {...}` конфигом (src/schema.ts в дистрибутиве).
// Оба вызова безопасны с пустым объектом опций — не делают I/O, только строят
// конфигурацию (проверено чтением исходников дистрибутива на throw-пути).
//
// Разрешение пакета — НЕ через голый `import('@better-auth/core/db')` от имени этого
// скрипта: в изолированных bun-инсталляциях `@better-auth/core` лежит только ВНУТРИ
// node_modules самого better-auth/oauth-provider, не хоистится в корень. Поэтому
// сначала резолвим сам `better-auth`/`@better-auth/oauth-provider` от корня репо, а
// `@better-auth/core/db` — уже от НИХ (`createRequire(betterAuthMainPath)`), так
// resolver проходит через их собственный node_modules.
//
// Область проверки:
//   - Account: каждое приложение, где `apps/<app>/src/lib/**/*.ts` вызывает
//     `prismaAdapter` (то есть держит Better Auth поверх Prisma/ZenStack).
//   - oauthClient: только приложения, где тот же код импортирует
//     `@better-auth/oauth-provider` (на 2026-08-28 — только auth-hub).
//
// Сопоставление со schema.zmodel — по именам полей на верхнем уровне модели или её
// mixin'ов (`model Account with AccountFields`). Не учитывает переименование поля
// через `@map("...")` на самом поле (в разобранных схемах монорепо такого нет ни у
// одной из проверяемых моделей) и не проверяет типы — только сам факт наличия
// колонки, ровно тот класс ошибки, что вызвал инцидент.
//
// Использование:
//   node scripts/check-better-auth-schema.mjs
//
// Exit 0 — расхождений нет. Exit 1 — найдены недостающие поля (список в консоль).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { walk } from './lib/fs-walk.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/')

// ─────────────────────────────────────────────────────────────────────────────
// 1. Требуемые поля — из реального кода установленных пакетов, не из хардкода.
// ─────────────────────────────────────────────────────────────────────────────

function resolvePackageMain(specifier) {
  const rootRequire = createRequire(path.join(repoRoot, 'package.json'))
  return rootRequire.resolve(specifier)
}

async function getRequiredAccountFields() {
  const betterAuthMain = resolvePackageMain('better-auth')
  const nestedRequire = createRequire(betterAuthMain)
  const coreDbPath = nestedRequire.resolve('@better-auth/core/db')
  const coreDb = await import(pathToFileURL(coreDbPath).href)
  const tables = coreDb.getAuthTables({})
  return Object.entries(tables.account.fields)
    .filter(([, attr]) => attr.required === true)
    .map(([name]) => name)
}

async function getRequiredOauthClientFields() {
  const oauthProviderMain = resolvePackageMain('@better-auth/oauth-provider')
  const oauthProviderMod = await import(pathToFileURL(oauthProviderMain).href)
  const plugin = oauthProviderMod.oauthProvider({})
  return Object.entries(plugin.schema.oauthClient.fields)
    .filter(([, attr]) => attr.required === true)
    .map(([name]) => name)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Парсер schema.zmodel — только то, что нужно: имена моделей/type-mixin'ов и
//    множество полей верхнего уровня в их теле.
// ─────────────────────────────────────────────────────────────────────────────

function extractBlockBody(text, openBraceIndex) {
  let depth = 1
  let i = openBraceIndex + 1
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === '{') { depth++ }
    else if (text[i] === '}') { depth-- }
  }
  return text.slice(openBraceIndex + 1, i - 1)
}

function fieldNamesInBody(body) {
  const names = new Set()
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('@@') || line.startsWith('//') || line.startsWith('///')) { continue }
    const m = line.match(/^([A-Za-z_]\w*)\b/)
    if (m) { names.add(m[1]) }
  }
  return names
}

function mapNameInBody(body) {
  const m = body.match(/@@map\(\s*"([^"]+)"\s*\)/)
  return m ? m[1] : null
}

// declarations: Map<string, { kind: 'model'|'type', mixins: string[], fields: Set<string>, mapName: string|null, file: string }>
function parseZmodelFile(filePath, declarations) {
  const text = readFileSync(filePath, 'utf8')
  const headerRe = /\b(model|type)\s+(\w+)(?:\s+with\s+([\w\s,]+?))?\s*\{/g
  let match
  while ((match = headerRe.exec(text))) {
    const [, kind, name, mixinsRaw] = match
    const openBraceIndex = match.index + match[0].length - 1
    const body = extractBlockBody(text, openBraceIndex)
    const mixins = mixinsRaw
      ? mixinsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    declarations.set(name, {
      kind,
      mixins,
      fields: fieldNamesInBody(body),
      mapName: mapNameInBody(body),
      file: filePath,
    })
  }
}

function resolveMergedFields(name, declarations, seen = new Set()) {
  if (seen.has(name)) { return new Set() }
  seen.add(name)
  const decl = declarations.get(name)
  if (!decl) { return new Set() }
  const merged = new Set(decl.fields)
  for (const mixinName of decl.mixins) {
    for (const f of resolveMergedFields(mixinName, declarations, seen)) { merged.add(f) }
  }
  return merged
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Область проверки: приложения с prismaAdapter в src/lib, отдельно — с
//    @better-auth/oauth-provider.
// ─────────────────────────────────────────────────────────────────────────────

function findAppDirs() {
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

function libDirSourceFiles(appDir) {
  const libDir = path.join(appDir, 'src', 'lib')
  return walk(libDir, (entry) => entry.endsWith('.ts') && !entry.endsWith('.spec.ts'), 5)
}

function usesPrismaAdapter(appDir) {
  return libDirSourceFiles(appDir).some((f) => readFileSync(f, 'utf8').includes('prismaAdapter'))
}

function usesOauthProvider(appDir) {
  return libDirSourceFiles(appDir).some((f) => readFileSync(f, 'utf8').includes('@better-auth/oauth-provider'))
}

// Ищет модель по литеральному имени ИЛИ по @@map("<dbName>") — оба варианта
// встречаются в монорепо (auth-hub мапит OauthApplication -> "oauthApplication").
function findModelDeclaration(declarations, candidateNames, dbMapName) {
  for (const name of candidateNames) {
    const decl = declarations.get(name)
    if (decl && decl.kind === 'model') { return { name, decl } }
  }
  for (const [name, decl] of declarations) {
    if (decl.kind === 'model' && decl.mapName === dbMapName) { return { name, decl } }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [requiredAccountFields, requiredOauthClientFields] = await Promise.all([
    getRequiredAccountFields(),
    getRequiredOauthClientFields(),
  ])

  console.log(`Account — обязательные поля (better-auth): ${requiredAccountFields.join(', ')}`)
  console.log(
    `oauthClient — обязательные поля (@better-auth/oauth-provider): ${requiredOauthClientFields.join(', ')}\n`,
  )

  // Общий фрагмент mixin'ов (AccountFields и т.п.) — не привязан ни к одному
  // приложению, поэтому подмешивается в декларации каждого приложения отдельно.
  const fragmentFiles = walk(path.join(repoRoot, 'libs', 'zenstack-fragments'), (e) => e.endsWith('.zmodel'), 5)

  const appDirs = findAppDirs()
  const findings = [] // { app, model, missing: string[] }
  let accountChecked = 0
  let oauthChecked = 0

  for (const appDir of appDirs) {
    const appName = path.basename(appDir)
    if (!usesPrismaAdapter(appDir)) { continue }

    const zmodelFiles = walk(appDir, (e) => e.endsWith('.zmodel'), 6)
    if (zmodelFiles.length === 0) { continue }

    const declarations = new Map()
    for (const f of fragmentFiles) { parseZmodelFile(f, declarations) }
    for (const f of zmodelFiles) { parseZmodelFile(f, declarations) }

    const account = findModelDeclaration(declarations, ['Account'], 'account')
    if (account) {
      accountChecked++
      const merged = resolveMergedFields(account.name, declarations)
      const missing = requiredAccountFields.filter((f) => !merged.has(f))
      if (missing.length > 0) {
        findings.push({ app: appName, model: `${account.name} (${rel(account.decl.file)})`, missing })
      }
    } else {
      console.log(`⚠️  ${appName}: использует prismaAdapter, но модель Account не найдена в zmodel — пропущено`)
    }

    if (usesOauthProvider(appDir)) {
      const oauthClient = findModelDeclaration(
        declarations,
        ['OauthApplication', 'OauthClient', 'oauthClient'],
        'oauthClient',
      )
      if (oauthClient) {
        oauthChecked++
        const merged = resolveMergedFields(oauthClient.name, declarations)
        const missing = requiredOauthClientFields.filter((f) => !merged.has(f))
        if (missing.length > 0) {
          findings.push({ app: appName, model: `${oauthClient.name} (${rel(oauthClient.decl.file)})`, missing })
        }
      } else {
        console.log(
          `⚠️  ${appName}: импортирует @better-auth/oauth-provider, но модель oauthClient не найдена в zmodel — пропущено`,
        )
      }
    }
  }

  console.log(`\nПроверено приложений: Account — ${accountChecked}, oauthClient — ${oauthChecked}`)

  if (findings.length === 0) {
    console.log('✅ Расхождений не найдено — все обязательные поля Better Auth на месте.')
    process.exit(0)
  }

  console.log(`\n❌ Найдены расхождения — ${findings.length}:\n`)
  for (const { app, model, missing } of findings) {
    console.log(`  ${app} — модель ${model}`)
    console.log(`    не хватает полей: ${missing.join(', ')}`)
  }
  console.log(
    '\nДобавь недостающие поля в zmodel-модель (или в общий mixin '
      + 'libs/zenstack-fragments/src/better-auth.zmodel, если поле относится ко всем '
      + 'приложениям) -> nx zenstack:generate <app> -> миграция. Разбор класса ошибки — '
      + '.claude/docs/better-auth-1.7-account-issuer-field.md',
  )
  process.exit(1)
}

main()
