#!/usr/bin/env bun
// Сторож против дрейфа .gitignore в submodule-репозиториях.
//
// Зачем: корневой .gitignore монорепо на вложенный независимый git-репозиторий
// НЕ действует (.claude/rules/git.md § «Каждому submodule нужен свой
// .gitignore»), поэтому каждый из 14 submodule держит собственную копию правил.
// Копии расходятся молча: 2026-08-28 выяснилось, что все 11 submodule с
// Next.js-приложениями держали точное `.next/` вместо шаблона `.next*/`, из-за
// чего временный build-каталог (`NEXT_DIST_DIR=.next-prodcheck`) висел untracked
// и ронял граф Nx у ВСЕХ параллельно работающих агентов сразу. Разбор —
// .claude/docs/nx-temp-build-dir-breaks-project-graph.md, PLAN-INFRA-4.md §117.
//
// Что делает: для каждого submodule из .gitmodules спрашивает у git, попадает ли
// под его .gitignore пробный путь, ХАРАКТЕРНЫЙ для проблемы (не сам `.next`, а
// `.next-prodcheck` — то есть проверяется наличие шаблона, а не точного имени).
//
// Что НЕ делает: ничего не правит. Коммит внутри submodule — отдельный
// репозиторий и отдельное решение владельца (push + bump SHA в letar, порядок
// обязателен, см. .claude/rules/git.md § «Работа с приватными submodule»).
//
// Использование: bun scripts/check-submodule-gitignore.mjs
// Код возврата: 1 при нехватке обязательного шаблона, иначе 0.
//
// ⚠️ В CI это не запускается и запускаться не может: приватные submodule там
// намеренно не выкачиваются (см. шапку .github/workflows/ci.yml), а на пустом
// каталоге проверять нечего. Точки вызова — периодический прогон
// (агент monorepo-health-check) и момент заведения/правки .gitignore submodule
// (.claude/rules/git.md).

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────────────────────────────────────────────────────
// Единственное место, где перечислены требования. Добавляешь строку сюда —
// проверка распространяется на все 14 submodule сразу.
//
// `probe` — путь, который спрашивается у `git check-ignore`. Он намеренно НЕ
// совпадает с именем каталога, который хочется игнорировать: имя вида
// `.next-prodcheck` проходит только под шаблон (`.next*/`) и не проходит под
// точное имя (`.next/`). Именно этим точное имя и плохо — перечисление отстаёт
// от следующего агента, который заведёт временный каталог с новым суффиксом.
//
// Пробник — путь ВНУТРИ каталога (`<dir>/package.json`), а не сам каталог.
// Причина — ловушка проверки: `.next*/` это dir-only паттерн, и на
// несуществующий путь он не матчится, поэтому `git check-ignore .next-prodcheck`
// в чистом дереве даёт ложный минус. Для вложенного пути git знает, что
// компонент — каталог, и матчит корректно без создания чего-либо на диске
// (проверено эмпирически 2026-08-28: `.next*/` → ignored, `/.next/` → нет).
const REQUIREMENTS = [
  {
    id: '.next*/',
    probe: '.next-prodcheck/package.json',
    level: 'required',
    hint: 'шаблон вместо точного `.next/` — временный distDir роняет граф Nx (§117)',
  },
  {
    id: 'node_modules',
    probe: 'node_modules/.package-lock.json',
    level: 'required',
    hint: 'зависимости submodule ставятся в его собственный node_modules',
  },
  {
    id: 'dist',
    probe: 'dist/index.js',
    level: 'required',
    hint: 'артефакты сборки',
  },
  {
    // Рекомендация, а не требование: сейчас такого правила нет ни у одного
    // submodule, и падение всех 14 разом утопило бы настоящие находки. Симметрично
    // корневым `.gitignore`/`.nxignore`, где `dist-*` уже стоит. ⚠️ `dist*` брать
    // нельзя — под него попадает настоящий исходник (api/distributions/), это
    // тихое отравление кэша Nx, а не ошибка.
    id: 'dist-*',
    probe: 'dist-check/index.js',
    level: 'recommended',
    hint: 'временный dist с суффиксом — тот же класс, что `.next-prodcheck`',
  },
]

/** Пути submodule из .gitmodules — порядок как в файле. */
function readSubmodulePaths() {
  const text = readFileSync(join(repoRoot, '.gitmodules'), 'utf8')
  return [...text.matchAll(/^\s*path\s*=\s*(.+)$/gm)].map((m) => m[1].trim())
}

/** Игнорируется ли путь внутри репозитория `cwd`. */
function isIgnored(cwd, probe) {
  try {
    execFileSync('git', ['-C', cwd, 'check-ignore', '-q', '--', probe], { stdio: 'ignore' })
    return true
  } catch {
    // exit 1 — не игнорируется; любой другой код (нет репозитория и т.п.) тоже
    // трактуем как «не подтверждено», вызывающий уже отсеял невыкаченные каталоги.
    return false
  }
}

const rows = []
const skipped = []

for (const path of readSubmodulePaths()) {
  const abs = join(repoRoot, path)

  // Submodule может быть не выкачан — это штатная ситуация на чужой машине
  // (.claude/docs/bun-lockfile-private-submodules.md), не расхождение.
  if (!existsSync(join(abs, '.git'))) {
    skipped.push({ path, why: 'не выкачан' })
    continue
  }

  // Репозиторий без package.json — не JS-проект (.claude/private: только
  // markdown). Требовать там node_modules/dist/.next бессмысленно. Проверка
  // структурная, а не по списку имён, чтобы не протухнуть на новом submodule.
  if (!existsSync(join(abs, 'package.json'))) {
    skipped.push({ path, why: 'не JS-проект (нет package.json)' })
    continue
  }

  const missing = REQUIREMENTS.filter((r) => !isIgnored(abs, r.probe))
  rows.push({ path, missing })
}

// ─────────────────────────────────────────────────────────────────────────────
// Отчёт

const pad = rows.length > 0 ? Math.max(...rows.map((r) => r.path.length)) : 0
const withRequired = rows.filter((r) => r.missing.some((m) => m.level === 'required'))
const withRecommended = rows.filter((r) => r.missing.some((m) => m.level === 'recommended'))

if (withRequired.length === 0) {
  console.log(`✅ обязательные шаблоны на месте во всех проверенных submodule (${rows.length})`)
} else {
  console.log(`⚠️  ${withRequired.length} submodule с расхождением .gitignore:\n`)
  console.log(`  ${'submodule'.padEnd(pad)}  чего не хватает`)
  console.log(`  ${'-'.repeat(pad)}  ${'-'.repeat(40)}`)
  for (const { path, missing } of withRequired) {
    const ids = missing.filter((m) => m.level === 'required').map((m) => m.id)
    console.log(`  ${path.padEnd(pad)}  ${ids.join(', ')}`)
  }
  console.log('')
  for (const req of REQUIREMENTS.filter((r) => r.level === 'required')) {
    const hit = withRequired.filter((r) => r.missing.includes(req))
    if (hit.length > 0) {
      console.log(`  ${req.id} — ${req.hint}`)
    }
  }
}

if (withRecommended.length > 0) {
  console.log(
    `\nℹ️  рекомендуется (не влияет на код возврата): ${
      REQUIREMENTS.filter((r) => r.level === 'recommended').map((r) => r.id).join(', ')
    } — ${withRecommended.length} submodule без него`,
  )
}

if (skipped.length > 0) {
  // Пропуски печатаются всегда и поимённо: молчаливый пропуск читается как
  // «проверено и чисто» — ровно та ошибка, от которой предостерегает
  // .claude/docs/verification-pitfalls.md.
  console.log('\nпропущено:')
  for (const { path, why } of skipped) {
    console.log(`  ${path} — ${why}`)
  }
}

if (withRequired.length > 0) {
  console.log(
    '\nПравится вручную: .gitignore внутри каждого submodule — это отдельный\n'
      + 'репозиторий, коммит и push там требуют решения владельца. Порядок\n'
      + 'обязателен: сначала push submodule, только потом bump SHA в letar,\n'
      + 'иначе `not our ref` блокирует все деплои (.claude/rules/git.md).',
  )
  process.exit(1)
}
