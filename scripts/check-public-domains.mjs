#!/usr/bin/env node
// Гейт гигиены публичного репо: в публичных *.md не должно быть доменов коммерческих
// приложений и реквизитов продавцов (.claude/rules/public-repo-hygiene.md).
//
// Почему хеши, а не список доменов: сам список запрещённых доменов, лежащий открытым
// текстом в публичном скрипте, стал бы той самой утечкой, от которой скрипт защищает.
// Поэтому в scripts/data/private-domains.sha256 лежат SHA-256 нормализованных доменов
// (нижний регистр, NFC, без завершающей точки). Проверка бесплатна для CI: приватный
// submodule не нужен.
//
// Как ищем: в тексте выделяются доменоподобные токены (`метка.метка[.метка…]`, Unicode),
// у каждого берутся все хвосты из двух и более меток — `www.x.ru` даёт и `x.ru`, поэтому
// поддомены закрыты без отдельной записи. Каждый хвост сверяется с хешами.
// Заодно ловится `ИНН` с настоящими 10–12 цифрами (плейсхолдеры из одинаковых цифр — нет).
//
// Область: только tracked `*.md` (кроме `.claude/private/`). Код, конфиги nginx/traefik и
// страницы `/privacy` содержат домены функционально — их этот гейт не трогает.
//
// Использование:
//   node scripts/check-public-domains.mjs            # все tracked *.md (git-индекс)
//   node scripts/check-public-domains.mjs --staged   # только staged, содержимое из индекса
//   node scripts/check-public-domains.mjs --add <домен> [<домен>…]   # добавить хеш(и)
//
// Код возврата 1 — найдены совпадения (файл:строка и найденный токен).

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from './lib/repo-root.mjs'

const root = repoRoot()
const HASH_FILE = path.join(root, 'scripts', 'data', 'private-domains.sha256')

const normalize = (d) => d.normalize('NFC').toLowerCase().replace(/\.$/, '')
const sha = (d) => createHash('sha256').update(normalize(d)).digest('hex')

function loadHashes() {
  if (!existsSync(HASH_FILE)) { return new Set() }
  return new Set(
    readFileSync(HASH_FILE, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim())
      .filter(Boolean),
  )
}

const args = process.argv.slice(2)

if (args[0] === '--add') {
  const known = loadHashes()
  const fresh = args.slice(1).map(sha).filter((h) => !known.has(h))
  if (fresh.length) { appendFileSync(HASH_FILE, fresh.join('\n') + '\n') }
  console.log(`добавлено хешей: ${fresh.length}`)
  process.exit(0)
}

const staged = args.includes('--staged')
const hashes = loadHashes()

const git = (a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28, cwd: root })

const files = (staged
  ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0')
  : git(['ls-files', '-z']).split('\0'))
  .filter((f) => f.endsWith('.md') && !f.startsWith('.claude/private/'))

const TOKEN = /[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?)+/gu
const INN = /ИНН[\s:№]*(\d{10}|\d{12})(?!\d)/gu

const problems = []
for (const f of files) {
  let text
  try {
    text = staged ? git(['show', `:${f}`]) : readFileSync(path.join(root, f), 'utf8')
  } catch {
    continue
  }
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(TOKEN)) {
      const labels = normalize(m[0]).split('.')
      for (let s = 0; s < labels.length - 1; s++) {
        if (hashes.has(sha(labels.slice(s).join('.')))) {
          problems.push(`${f}:${i + 1}  домен коммерческого приложения: ${m[0]}`)
          break
        }
      }
    }
    for (const m of line.matchAll(INN)) {
      if (!/^(\d)\1+$/.test(m[1])) { problems.push(`${f}:${i + 1}  ИНН: ${m[1]}`) }
    }
  })
}

if (!problems.length) {
  console.log(`✅ публичные md чисты от доменов и реквизитов (файлов: ${files.length}, хешей: ${hashes.size})`)
  process.exit(0)
}

console.error(`⛔ в публичных md найдены приватные детали (${problems.length}):`)
for (const p of problems) { console.error(`  ${p}`) }
console.error(
  '\nЧто делать: заменить на метку вида <домен app>, реквизиты — убрать; сквозные записи — в\n'
    + '.claude/private/. Правило: .claude/rules/public-repo-hygiene.md. Новый запрещённый домен:\n'
    + '  node scripts/check-public-domains.mjs --add <домен>',
)
process.exit(1)
