#!/usr/bin/env node
// Ловит шимы Bun на Windows без парного .bunx в node_modules/.bin.
//
// Bun на Windows хранит каждый bin как пару <name>.exe + <name>.bunx. Шим без метаданных
// падает при запуске с «error: could not find bin metadata file», и `nx dev <app>` /
// `preview_start` завершаются кодом 0 за 5 секунд, не стартовав сервер (2026-10-08: у
// next.exe не оказалось next.bunx). Ни typecheck, ни lint, ни nx эту порчу не видят —
// узнаёшь только в момент запуска. Разбор и ручная починка —
// .claude/docs/bun-bin-shim-missing-bunx.md.
//
// Проверяет корневой node_modules/.bin (там лежат bin, которые вызывает nx). Это локальная
// порча одной машины: в CI node_modules свежие, на не-Windows .exe нет вовсе — проверка
// пуста и возвращает 0.
//
// Скрипт ничего не чинит: `bun install --force` в общем чекауте затрагивает node_modules
// всех приложений, пока в нём работают другие агенты.
//
// Использование:
//   node scripts/check-bun-bin-shims.mjs
//
// Exit code 0 — все .exe-шимы с парой (или проверять нечего). Exit code 1 — найдены шимы без
// .bunx (список в консоль).

import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from './lib/repo-root.mjs'

const binDir = path.join(repoRoot(), 'node_modules', '.bin')

if (!existsSync(binDir)) {
  console.log('node_modules/.bin нет (зависимости не установлены) — проверять нечего')
  process.exit(0)
}

const shims = readdirSync(binDir).filter((name) => name.endsWith('.exe'))
const broken = shims
  .filter((name) => !existsSync(path.join(binDir, `${name.slice(0, -'.exe'.length)}.bunx`)))
  .sort()

if (broken.length === 0) {
  console.log(`✅ шимов .exe: ${shims.length}, у всех есть парный .bunx`)
  process.exit(0)
}

console.error(`❌ шимов .exe без парного .bunx: ${broken.length} из ${shims.length}\n`)
for (const name of broken) {
  console.error(`   node_modules/.bin/${name}`)
}
console.error(
  '\nЗапуск такого bin падает с «could not find bin metadata file».'
    + '\nНе запускай `bun install --force` в общем чекауте — рецепт точечной починки:'
    + '\n.claude/docs/bun-bin-shim-missing-bunx.md',
)
process.exit(1)
