#!/usr/bin/env bun
// check-section-numbers.mjs — блокирует коммит, вводящий дубль номера §NN внутри одного
// из двух независимых семейств журналов (INFRA: PLAN-INFRA*.md; JOURNAL: PLAN.md +
// PLAN-JOURNAL-*.md — см. next-section-number.mjs про то, почему это разные счётчики).
//
// Вызывается из scripts/hooks/pre-commit-section-number-check.sh.
//
// Зачем нужен ИМЕННО pre-commit барьер, а не только next-section-number.mjs: root cause
// коллизии — номер, вычисленный агентом рано в сессии и кэшированный в голове до момента
// вставки (см. комментарий в next-section-number.mjs). Никакая проверка «перед» не
// закрывает это окно полностью — вставка может случиться спустя долгое время после того,
// как агент «спросил» свежий номер. Единственное, что ловит уже случившуюся коллизию
// НАДЁЖНО — сверка по факту прямо перед тем, как секция попадёт в историю git.
//
// Логика: сравнивает состояние "до" (HEAD) и "после" (staged-версия для застейдженных
// файлов семейства, HEAD — для остальных файлов того же семейства) по количеству
// вхождений каждого §NN. Блокирует только НОВОЕ увеличение счётчика дублей — то есть
// коллизию, которую вносит именно этот коммит. Уже существующие дубли (например §66 в
// PLAN-INFRA-4.md, задокументированный и намеренно не тронутый — см. PLAN-INFRA.md)
// НЕ блокируют повторные коммиты, пока их количество не растёт дальше.
//
// Обход для сознательных случаев (ложное срабатывание, осознанный дубль вида §66):
//   GIT_ALLOW_SECTION_DUP=1 git commit ...

import path from 'node:path'

const FAMILIES = [
  { name: 'INFRA', member: /^PLAN-INFRA(-\d+)?\.md$/ },
  { name: 'JOURNAL', member: /^(PLAN|PLAN-JOURNAL-\d+)\.md$/ },
]

function gitRun(args) {
  const result = Bun.spawnSync(['git', ...args], { stdout: 'pipe', stderr: 'pipe' })
  return { ok: result.exitCode === 0, text: result.stdout.toString('utf8') }
}

const PLAN_DIRS = ['.', 'docs/plans']

// Пути членов семейства: в дереве коммита (`HEAD`) или в индексе (ref = null).
function familyPaths(family, ref) {
  const { text } = ref ? gitRun(['ls-tree', '-r', '--name-only', ref]) : gitRun(['ls-files'])
  return text
    .split('\n')
    .filter((f) => f && PLAN_DIRS.includes(path.posix.dirname(f)) && family.member.test(path.posix.basename(f)))
}

function stagedFiles() {
  const { text } = gitRun(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB'])
  return new Set(text.split('\n').filter(Boolean))
}

function headBlob(file) {
  const { ok, text } = gitRun(['show', `HEAD:${file}`])
  return ok ? text : ''
}

function indexBlob(file) {
  const { ok, text } = gitRun(['show', `:${file}`])
  return ok ? text : ''
}

function extractHeaders(text, file) {
  const out = []
  const lines = text.split('\n')
  const headerRe = /^## §(\d+(?:\.\d+)*)\b/
  for (let i = 0; i < lines.length; i++) {
    const m = headerRe.exec(lines[i])
    if (m) { out.push({ number: m[1], file, line: i + 1 }) }
  }
  return out
}

function countByNumber(headers) {
  const map = new Map()
  for (const h of headers) {
    if (!map.has(h.number)) { map.set(h.number, []) }
    map.get(h.number).push(h)
  }
  return map
}

function main() {
  if (process.env.GIT_ALLOW_SECTION_DUP === '1') {
    console.error('ℹ️  проверка дублей §NN пропущена (GIT_ALLOW_SECTION_DUP)')
    process.exit(0)
  }

  const staged = stagedFiles()

  // Семейство живёт в корне (PLAN.md) и в docs/plans/ (PLAN-INFRA-*, PLAN-JOURNAL-*).
  const inFamilyDir = (f) => PLAN_DIRS.includes(path.posix.dirname(f))
  const touchesFamily = [...staged].some((f) => inFamilyDir(f) && FAMILIES.some((fam) => fam.member.test(path.posix.basename(f))))
  if (!touchesFamily) { process.exit(0) }

  let anyBad = false

  for (const family of FAMILIES) {
    // Состав «до» берём из HEAD, «после» — из индекса: коммит с переносом файла (git mv) иначе
    // выглядел бы как рождение новых дублей.
    const beforeHeaders = []
    const afterHeaders = []
    for (const file of familyPaths(family, 'HEAD')) { beforeHeaders.push(...extractHeaders(headBlob(file), file)) }
    for (const file of familyPaths(family, null)) { afterHeaders.push(...extractHeaders(indexBlob(file), file)) }

    const before = countByNumber(beforeHeaders)
    const after = countByNumber(afterHeaders)

    for (const [number, occurrences] of after) {
      const afterCount = occurrences.length
      const beforeCount = before.get(number)?.length ?? 0
      if (afterCount >= 2 && afterCount > beforeCount) {
        anyBad = true
        console.error(`⛔ §${number} (семейство ${family.name}) — новый дубль, вносимый этим коммитом:`)
        for (const occ of occurrences) {
          console.error(`    ${occ.file}:${occ.line}`)
        }
      }
    }
  }

  if (anyBad) {
    console.error('')
    console.error('Два агента независимо посчитали один и тот же номер свободным (см. PLAN-INFRA.md')
    console.error('§ «Номера секций не гарантированно уникальны»). Возьми свежий свободный номер:')
    console.error('  bun scripts/next-section-number.mjs <файл>')
    console.error('и перенумеруй свою секцию (не старую — старая, скорее всего, уже где-то процитирована).')
    console.error('')
    console.error('Если это осознанный дубль (как задокументированный §66):')
    console.error('  GIT_ALLOW_SECTION_DUP=1 git commit ...')
    process.exit(1)
  }

  process.exit(0)
}

main()
