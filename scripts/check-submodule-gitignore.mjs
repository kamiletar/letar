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
// Второй предмет — того же корня, но другой природы: сгенерированные
// ZenStack/Prisma-артефакты. Если submodule со своей schema.zmodel не исключает
// `src/generated/`, сгенерированный Prisma Client коммитится как обычный файл и
// расходится со схемой при каждом изменении модели, маскируя поломку генерации:
// устаревший, но рабочий файл выглядит зелёным. Разбор — .claude/docs/database.md
// (раздел про дрейф `zenstack:generate`).
//
// Что делает: для каждого submodule из .gitmodules спрашивает у git две вещи —
//   1) попадает ли под его .gitignore пробный путь, ХАРАКТЕРНЫЙ для проблемы
//      (не сам `.next`, а `.next-prodcheck` — то есть проверяется наличие
//      шаблона, а не точного имени);
//   2) нет ли уже ЗАКОММИЧЕННЫХ файлов там, где их быть не должно
//      (`git ls-files src/generated`) — расхождение, которое уже случилось.
//
// Что НЕ делает: ничего не правит. Коммит внутри submodule — отдельный
// репозиторий и отдельное решение владельца (push + bump SHA в letar, порядок
// обязателен, см. .claude/rules/git.md § «Работа с приватными submodule»).
//
// Использование: bun scripts/check-submodule-gitignore.mjs
// Код возврата: 1 при обязательном расхождении, иначе 0.
//
// ⚠️ В CI это не запускается и запускаться не может: приватные submodule там
// намеренно не выкачиваются (см. шапку .github/workflows/ci.yml), а на пустом
// каталоге проверять нечего. Точки вызова — периодический прогон
// (агент monorepo-health-check) и момент заведения/правки .gitignore submodule
// (.claude/rules/git.md).

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCheckedOut, readSubmodulePaths } from './lib/submodules.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────────────────────────────────────────────────────
// Единственное место, где перечислены требования. Добавляешь строку сюда —
// проверка распространяется на все 14 submodule сразу.
//
// `level` делит находки на обязательные (ненулевой код возврата) и
// рекомендательные (только сообщение). Граница проходит не по «важности», а по
// тому, случилось расхождение или пока только может случиться: файлы уже в
// индексе — обязательное, отсутствие исключения в .gitignore — превентивное.
//
// `kind` — что именно спрашивается у git:
//   'ignore' (по умолчанию) — попадает ли `probe` под .gitignore submodule;
//   'tracked'               — сколько файлов по `path` уже лежит в его индексе.
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
//
// `when` — необязательный предикат по каталогу submodule: требование
// применяется только там, где оно осмысленно. Нет `when` — спрашиваем у всех.
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
  {
    // Расхождение, которое УЖЕ случилось: сгенерированный код лежит в индексе
    // submodule, а не просто рискует туда попасть. Отсюда 'required'.
    //
    // ⚠️ Проверка намеренно сделана ПО ФАКТУ, а не по наличию schema.zmodel
    // рядом, и упрощать её обратно нельзя: генератор одного submodule
    // (apps/driving-school) пишет вывод в другой (libs/driving-school-db).
    // «Есть ли схема рядом» такой случай не ловит — у приёмника вывода своей
    // схемы нет. «Есть ли уже закоммиченные файлы» ловит всегда, независимо от
    // того, чей генератор их написал. Поэтому здесь нет `when`.
    id: 'src/generated в индексе',
    kind: 'tracked',
    path: 'src/generated',
    level: 'required',
    hint: 'сгенерированный Prisma Client закоммичен — расходится со схемой и маскирует поломку генерации',
    fix: '`git -C <submodule> rm -r --cached src/generated`, затем коммит БЕЗ pathspec:\n'
      + '`git commit -- <путь>` берёт содержимое рабочего дерева, а не индекса, и молча\n'
      + 'возвращает только что удалённый файл обратно\n'
      + '(.claude/docs/git-pathspec-commit-worktree-not-index.md). Заодно добавь\n'
      + '`src/generated/` в .gitignore этого submodule — иначе файлы вернутся при\n'
      + 'следующей генерации.',
  },
  {
    // Вторая половина той же пары, превентивная: схема есть, исключения нет, в
    // git пока ничего не попало, но попадёт при первом `zenstack:generate`.
    // Гейт по schema.zmodel здесь осмыслен: у submodule без своей схемы и
    // своего src/generated не будет, требовать от него исключение незачем.
    // Обратную сторону гейта (вывод уезжает в ЧУЖОЙ submodule) закрывает
    // проверка выше — она без гейта и по факту индекса.
    id: 'src/generated/',
    probe: 'src/generated/index.ts',
    when: (abs) => existsSync(join(abs, 'schema.zmodel')),
    level: 'recommended',
    hint: 'submodule со своей schema.zmodel без исключения — сгенерированный код уедет в git',
  },
]

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

/** Сколько файлов по пути `path` уже лежит в индексе репозитория `cwd`. */
function countTracked(cwd, path) {
  try {
    const out = execFileSync('git', ['-C', cwd, 'ls-files', '--', path], { encoding: 'utf8' })
    return out.split('\n').filter(Boolean).length
  } catch {
    // Нет репозитория или git отказал — «не подтверждено», как и в isIgnored.
    return 0
  }
}

/** Находки по одному submodule; пустой массив — чисто. */
function checkSubmodule(abs) {
  const problems = []
  for (const req of REQUIREMENTS) {
    if (req.when && !req.when(abs)) {
      continue
    }
    if (req.kind === 'tracked') {
      const count = countTracked(abs, req.path)
      if (count > 0) {
        problems.push({ req, detail: `${count} файлов` })
      }
    } else if (!isIgnored(abs, req.probe)) {
      problems.push({ req, detail: null })
    }
  }
  return problems
}

const rows = []
const skipped = []

for (const path of readSubmodulePaths(repoRoot)) {
  const abs = join(repoRoot, path)

  // Submodule может быть не выкачан — это штатная ситуация на чужой машине
  // (.claude/docs/bun-lockfile-private-submodules.md), не расхождение.
  if (!isCheckedOut(abs)) {
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

  rows.push({ path, problems: checkSubmodule(abs) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Отчёт

/** Подпись находки в таблице: id плюс уточнение, если оно есть. */
function label({ req, detail }) {
  return detail ? `${req.id} (${detail})` : req.id
}

/** Строки отчёта, где есть находка нужного уровня. */
function rowsAt(level) {
  return rows.filter((r) => r.problems.some((p) => p.req.level === level))
}

/** Печатает таблицу «submodule → находки» и подсказки по сработавшим правилам. */
function printFindings(hitRows, level, pad) {
  for (const { path, problems } of hitRows) {
    const found = problems.filter((p) => p.req.level === level).map(label)
    console.log(`  ${path.padEnd(pad)}  ${found.join(', ')}`)
  }
  console.log('')
  for (const req of REQUIREMENTS.filter((r) => r.level === level)) {
    if (hitRows.some((r) => r.problems.some((p) => p.req === req))) {
      console.log(`  ${req.id} — ${req.hint}`)
    }
  }
}

const pad = rows.length > 0 ? Math.max(...rows.map((r) => r.path.length)) : 0
const withRequired = rowsAt('required')
const withRecommended = rowsAt('recommended')

if (withRequired.length === 0) {
  console.log(`✅ обязательные проверки пройдены во всех проверенных submodule (${rows.length})`)
} else {
  console.log(`⚠️  ${withRequired.length} submodule с расхождением:\n`)
  console.log(`  ${'submodule'.padEnd(pad)}  что не так`)
  console.log(`  ${'-'.repeat(pad)}  ${'-'.repeat(40)}`)
  printFindings(withRequired, 'required', pad)
}

if (withRecommended.length > 0) {
  // Рекомендательные печатаются поимённо по submodule: часть из них
  // применяется не ко всем (`when`), и общий список идентификаторов вводил бы
  // в заблуждение насчёт того, где именно находка.
  console.log('\nℹ️  рекомендуется (не влияет на код возврата):\n')
  printFindings(withRecommended, 'recommended', pad)
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
  // Часть обязательных находок чинится не правкой .gitignore — для них у
  // требования есть свой рецепт.
  for (const req of REQUIREMENTS.filter((r) => r.level === 'required' && r.fix)) {
    if (withRequired.some((r) => r.problems.some((p) => p.req === req))) {
      console.log(`\n${req.id} — как чинить:\n${req.fix}`)
    }
  }
  console.log(
    '\nПравится вручную: .gitignore внутри каждого submodule — это отдельный\n'
      + 'репозиторий, коммит и push там требуют решения владельца. Порядок\n'
      + 'обязателен: сначала push submodule, только потом bump SHA в letar,\n'
      + 'иначе `not our ref` блокирует все деплои (.claude/rules/git.md).',
  )
  process.exit(1)
}
