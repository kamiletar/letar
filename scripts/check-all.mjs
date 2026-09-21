#!/usr/bin/env bun
// Единая точка запуска проверок целостности монорепо.
//
// Зачем: к 2026-08-28 в scripts/ накопилось пять независимых проверок, и каждая
// запускалась только руками — то есть только если человек или агент доходил до
// чеклиста `/infra:deps-update`. Цена пропуска у самой дешёвой из них
// (check-patched-deps, 0.3 с) — возврат бага гидратации во все ~30 приложений
// сразу, без единой ошибки сборки, lint или typecheck (PLAN-INFRA-4.md §118,
// .claude/docs/chakra-css-memo-prop-order-hydration.md).
//
// Что раннер добавляет поверх пяти отдельных команд:
//   1. Различие gate / warn / report вынесено из комментариев внутри файлов в
//      данные — раньше «код возврата 1 — это gate, а 0 — отчёт» знал только тот,
//      кто прочитал шапку конкретного скрипта.
//   2. Явное объявление покрытия в CI. Приватные submodule там намеренно не
//      выкачиваются (см. шапку .github/workflows/ci.yml), поэтому часть проверок
//      в CI видит не весь репозиторий — и, что хуже, МОЛЧА зеленеет на
//      отсутствующих файлах. Раннер такие случаи называет вслух, а не
//      проглатывает: молчаливый пропуск читается как «проверено и чисто»
//      (.claude/docs/verification-pitfalls.md).
//
// Использование:
//   bun scripts/check-all.mjs                      # всё, что применимо локально
//   bun scripts/check-all.mjs --group=deps         # только про зависимости
//   bun scripts/check-all.mjs --only=patched-deps  # точечно (через запятую)
//   bun scripts/check-all.mjs --ci                 # режим CI: пропустить нерелевантное там
//   bun scripts/check-all.mjs --list               # реестр без запуска
//
// Код возврата: 1, если упала хотя бы одна проверка уровня `gate`. Уровни `warn`
// и `report` на код возврата не влияют никогда.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─────────────────────────────────────────────────────────────────────────────
// Реестр. Единственное место, где перечислены проверки — добавляешь запись сюда,
// и она попадает и в локальный прогон, и в CI, и в pre-commit (если названа в
// `--only` соответствующего вызова).
//
// severity:
//   gate   — код возврата 1 роняет весь прогон. Для того, что нельзя пропускать.
//   warn   — код возврата 1 печатается, но прогон не роняет. Для накопленного
//            долга, который решено разгребать отдельно, а не блокировать им всё.
//   report — скрипт сам всегда завершается кодом 0, это отчёт для человека.
//
// ci:
//   full    — в CI видит ровно то же, что локально.
//   partial — в CI работает, но часть входа отсутствует (приватные submodule);
//             раннер печатает предупреждение о неполном покрытии.
//   no      — в CI запускать бессмысленно, пропускается в режиме --ci.
// ─────────────────────────────────────────────────────────────────────────────

const CHECKS = [
  {
    id: 'patched-deps',
    group: 'deps',
    title: 'патчи зависимостей всё ещё применяются',
    run: ['bun', ['scripts/check-patched-deps.mjs']],
    severity: 'gate',
    ci: 'full',
    doc: '.claude/docs/chakra-css-memo-prop-order-hydration.md',
  },
  {
    id: 'peer-deps',
    group: 'deps',
    title: 'peer-зависимости между корневыми пакетами',
    run: ['bun', ['scripts/check-peer-deps.mjs']],
    severity: 'report',
    ci: 'full',
    doc: '.claude/docs/root-pin-peer-drift.md',
  },
  {
    id: 'intentional-pins',
    group: 'deps',
    title: 'намеренные точные пины версий против реестра причин',
    run: ['bun', ['scripts/check-intentional-pins.mjs']],
    // gate: снятие такого пина не ловится ничем — ни bun install, ни lint, ни
    // typecheck:tsgo, ни nx test версий не сверяют, а комментарий в JSON
    // невозможен. Прецедент: пин @tanstack/react-devtools@0.10.5 (§112) снят
    // обычным `deps update` через неделю, падение прод-сборки вернулось во все
    // приложения — потребители @letar/query-provider (§142).
    severity: 'gate',
    ci: 'full',
    doc: '.claude/docs/root-pin-peer-drift.md',
  },
  {
    id: 'lock-versions',
    group: 'deps',
    title: 'версии и зависимости workspace в bun.lock совпадают с package.json',
    run: ['bun', ['scripts/check-lock-workspace-versions.mjs']],
    // gate: расхождение даже в одной строке version роняет `bun install
    // --frozen-lockfile` на сервере и встают деплои ВСЕХ приложений сразу; локально
    // ни typecheck, ни lint, ни build его не видят (2026-09-21 — шесть workspace
    // разом, включая три приватных submodule, чей bump физически не может обновить
    // корневой lock).
    severity: 'gate',
    // ⚠️ В CI не запускается: шаг «Install dependencies» там идёт БЕЗ
    // --frozen-lockfile (см. ci.yml) и перезаписывает bun.lock ДО этой проверки —
    // она сверяла бы уже пересобранный lock с package.json и зеленела всегда.
    // Настоящие точки: pre-commit (коммит bun.lock блокируется) и ручной прогон.
    ci: 'no',
    doc: '.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md',
  },
  {
    id: 'pin-drift',
    group: 'deps',
    title: 'apps/libs package.json разошлись с корневым намеренным точным пином',
    run: ['bun', ['scripts/check-pin-drift.mjs']],
    // warn: находка на регистрации (2026-09-13) — 8 пакетов сразу разошлись с
    // корневым zod@4.4.3 (caret-диапазон потребителя резолвится bun isolated
    // linker независимо от корня, дедуп только по буквальному совпадению строки
    // версии). Блокировать этим существующие коммиты одним махом не нужно —
    // поднять до gate после того, как долг разгребён.
    severity: 'warn',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их package.json не проверены',
    doc: '.claude/docs/zod-per-package-pin-drift.md',
  },
  {
    id: 'implicit-deps',
    group: 'deps',
    title: '@letar/*-пакеты в nx.implicitDependencies без записи в dependencies',
    run: ['node', ['scripts/check-implicit-deps.mjs']],
    // warn: признак (sibling-spec) надёжный, но не исчерпывающий — часть
    // рискованных связок он не ловит (импорт без своего spec-файла рядом), и
    // наоборот, «genuinely imported anywhere» без sibling-spec может быть
    // безопасен ещё долго. gate был бы слишком шумным решением для находки,
    // которая пока чинилась только по факту падения vitest — см. аудит
    // 2026-09-07 (6 приложений, 15 пакетов).
    severity: 'warn',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их package.json/исходники не проверены',
    doc: '.claude/docs/vitest-unlinked-workspace-lib-imports.md',
  },
  {
    id: 'nx-graph-deps',
    group: 'deps',
    title: 'импортируемые @letar/* без записи ни в dependencies, ни в nx.implicitDependencies',
    run: ['node', ['scripts/check-nx-graph-deps.mjs']],
    // gate с 2026-09-09: долг на момент регистрации (2026-09-08, 22 из 56 приложений,
    // ~39%) закрыт полностью — на чистом дереве 0 разрывов (56 приложений проверено,
    // §169 PLAN-INFRA-6.md). Условие поднятия из warn выполнено, см. прецедент
    // transpile-packages ниже.
    // Отличие от implicit-deps выше: та проверка — про узкий симптом (пакет только
    // в implicitDependencies рвёт vitest через sibling-spec), эта — про полноту
    // графа Nx вообще (nx affected не видит ребро зависимости).
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их package.json/исходники не проверены',
    doc: 'PLAN-INFRA.md §169',
  },
  {
    id: 'electron-drift',
    group: 'deps',
    title: 'версии electron в приложениях против корневой',
    run: ['bash', ['scripts/check-electron-drift.sh']],
    severity: 'gate',
    ci: 'partial',
    // poster-microtext-desktop — приватный submodule И одно из четырёх
    // Electron-приложений. В CI его каталог пуст, скрипт молча пропускает
    // отсутствующий package.json и печатает «версии синхронны» — ложная зелень
    // ровно того класса, от которого предостерегает verification-pitfalls.md.
    ciNote: 'приватные submodule не выкачаны — poster-microtext-desktop не проверен',
    doc: '.claude/docs/electron-version-drift.md',
  },
  {
    id: 'better-auth-schema',
    group: 'auth',
    title: 'модели Account/oauthClient покрывают обязательные поля better-auth',
    run: ['node', ['scripts/check-better-auth-schema.mjs']],
    // gate: расхождение не ловится ни typecheck, ни lint — падает 500-кой в рантайме на
    // sign-up/reset-password/OAuth-логине без единой строки в логе. См. §71 PLAN.md и
    // .claude/docs/better-auth-1.7-account-issuer-field.md.
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их schema.zmodel не проверены',
    doc: '.claude/docs/better-auth-1.7-account-issuer-field.md',
  },
  {
    id: 'cookie-cache-strategy',
    group: 'auth',
    title: 'session.cookieCache.strategy jwt/jwe без своего advanced.cookiePrefix',
    run: ['node', ['scripts/check-cookie-cache-strategy.mjs']],
    // gate: единственная защита от повтора бага — комментарий в
    // apps/dashboard/src/lib/auth.ts, который никто не обязан читать перед тем как
    // добавить jwt/jwe где-либо ещё. Ни typecheck, ни lint не ловят коллизию — она
    // проявляется 500-кой на GET /api/auth/get-session в ЧУЖОМ приложении на localhost.
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их src/lib/auth.ts не проверены',
    doc: '.claude/docs/better-auth-localhost-cookie-jar-collision.md',
  },
  {
    id: 'lib-subpath-paths',
    group: 'tsconfig',
    title: 'потребители покрывают все subpath-экспорты @letar/*',
    run: ['node', ['scripts/check-lib-subpath-paths.mjs']],
    // Было gate с 2026-08-28 (долг из 75 потребителей внутри apps/ разгребён,
    // checker был зелёным). 2026-09-14 область сканирования расширена на
    // libs/*/tsconfig{.lib,.spec}.json — библиотеки тоже потребляют подпути друг
    // друга (пример: libs/forms/tsconfig.spec.json держал paths на
    // @letar/forms-core/*, и именно там нашли неполный набор 2026-09-14).
    // Расширение сразу вскрыло 8 новых потребителей с неполными paths внутри
    // libs/ (forms, forms-react, forms-shadcn, folder-player-react) — временно
    // понижалось до warn. Долг разгребён тем же днём (2026-09-14) — недостающие
    // строки paths добавлены во все 7 файлов, typecheck:tsgo зелёный на всех
    // четырёх затронутых библиотеках, прогон снова чистый → вернули в gate.
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их tsconfig не проверены',
    doc: '.claude/rules/libs.md',
  },
  {
    id: 'transpile-packages',
    group: 'tsconfig',
    title: 'transpilePackages next.config.* покрывает импортируемые @letar/*-алиасы tsconfig',
    run: ['node', ['scripts/check-transpile-packages.mjs']],
    // ⚠️ Скрипт ловит ДВА разных по тяжести класса, и печатает их раздельно:
    //   1. Ключ transpilePackages отсутствует ЦЕЛИКОМ, хотя приложение импортирует
    //      внешние @letar/*-пакеты — build-breaking. Next читает только НАЛИЧИЕ ключа
    //      (`!!config.transpilePackages` в webpack-config.js): bun линкует @letar/*
    //      симлинком, webpack резолвит его в реальный путь libs/… без node_modules, и
    //      без снятого ключом include файл никогда не попадёт в SWC-компиляцию — прод-билд
    //      падает `Module parse failed`. До 2026-09-15 эта ветка была НЕ покрыта: цикл
    //      молча пропускал приложение целиком, если ключа не было (`if (!transpiled)
    //      continue`) — именно так apps/form-example тихо накопил падающий прод-билд.
    //   2. Ключ есть, но конкретный импортируемый пакет в списке не перечислен —
    //      дрейф соглашения о единообразии литерала с @letar/*-алиасами tsconfig,
    //      сборку НЕ ломает (доказано тремя сборками studio,
    //      .claude/docs/transpile-packages-array-presence-not-content.md).
    // Оба класса роняют прогон одинаково (gate) — критично уже само наличие любого
    // из них, а не только класса 1; разбор, какой именно случай сработал — в выводе
    // скрипта (🔴 КРИТИЧНО vs ⚠️ неполнота списка).
    // На момент регистрации (2026-09-01) долг из 3 приложений (auth-hub, form-docs,
    // animatrona/renderer) закрыт правкой их next.config.* в том же коммите; долг класса 1
    // (apps/form-example) найден и закрыт 2026-09-15, тем же коммитом расширен скрипт.
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их next.config.*/tsconfig не проверены',
    doc: '.claude/docs/transpile-packages-array-presence-not-content.md',
  },
  {
    id: 'zenstack-generate-inputs',
    group: 'tsconfig',
    title: 'zenstack:generate объявляет Nx зависимость от фрагмента и доменных .zmodel-файлов',
    run: ['node', ['scripts/check-zenstack-generate-inputs.mjs']],
    // gate: признак детерминированный (парсинг import/inputs, не эвристика), находок на
    // выровненном дереве быть не должно. Долг из 20 приложений закрыт вручную PLAN-INFRA-6.md
    // §162 (2026-09-08) — сам инцидент, ради которого заводится проверка, произошёл в ТУ ЖЕ
    // сессию: apps/animatrona-ipfs-player завели параллельно и оно пришло без обеих записей,
    // ловушка была живая с первой минуты нового приложения. Ручная дисциплина эту дыру не
    // закрывает, нужен исполняемый гейт.
    severity: 'gate',
    ci: 'partial',
    ciNote: 'приватные submodule не выкачаны — их schema.zmodel/project.json не проверены',
    doc: '.claude/docs/zenstack-shared-fragments-across-apps.md',
  },
  {
    id: 'mcp-typecheck',
    group: 'tsconfig',
    title: 'typecheck .claude/mcp/*.ts (агрегаторы letar/letar-db — вне графа Nx)',
    run: ['bun', ['scripts/check-mcp-typecheck.mjs']],
    // gate: letar.ts/letar-db.ts — реально используемые root-level MCP-серверы (см. .mcp.json),
    // но без project.json они вне графа Nx и `nx run-many -t typecheck:tsgo` их не видит —
    // обнаружено при миграции @modelcontextprotocol/sdk v1→v2 (PLAN-INFRA-6.md §184), вскрыло
    // реальные несовпадения типов, годами копившиеся без единой проверки.
    severity: 'gate',
    ci: 'full',
    doc: '.claude/docs/mcp-servers.md#typecheck',
  },
  {
    id: 'submodule-gitignore',
    group: 'submodule',
    title: 'шаблоны .gitignore во всех submodule',
    run: ['bun', ['scripts/check-submodule-gitignore.mjs']],
    // warn по той же причине: на 2026-08-28 красная (2 submodule). Плюс правка
    // требует коммита ВНУТРИ чужого репозитория — это решение владельца, а не
    // то, что чинится автоматом по дороге.
    severity: 'warn',
    ci: 'no',
    ciNote: 'приватные submodule в CI не выкачиваются — проверять нечего',
    doc: '.claude/docs/nx-temp-build-dir-breaks-project-graph.md',
  },
  {
    id: 'submodule-push-state',
    group: 'submodule',
    title: 'SHA каждого submodule существует на его origin',
    run: ['bash', ['scripts/check-submodule-push-state.sh']],
    // warn, а не gate: между «закоммитил bump SHA» и «запушил submodule» проверка
    // красная законно — это нормальное промежуточное состояние работы, а не поломка
    // (push submodule требует одобрения владельца, см. .claude/rules/git.md). Настоящий
    // барьер стоит там, где состояние становится опасным, — на push:
    // scripts/hooks/pre-push-submodule-check.sh. Здесь запись нужна для видимости и
    // ручного прогона перед deploy-request.
    severity: 'warn',
    ci: 'no',
    ciNote: 'приватные submodule в CI не выкачиваются — проверять нечего',
    doc: '.claude/docs/git-multi-agent-incidents.md',
  },
  {
    id: 'precommit-hook-staleness',
    group: 'submodule',
    title: 'установленные pre-commit хуки submodule против актуального install.sh',
    run: ['bun', ['scripts/check-precommit-hook-staleness.mjs']],
    // warn: install.sh копирует скрипты один раз при запуске, не симлинк — новый
    // скрипт в scripts/hooks/ не появляется в уже установленных копиях сам.
    // Фикс один и тот же для любой находки (install.sh --all-submodules) и не
    // требует решения владельца submodule (в отличие от submodule-gitignore) —
    // но остаётся warn, потому что накопленный долг тут неизбежен между
    // добавлением нового hook-скрипта и следующим прогоном --all-submodules.
    severity: 'warn',
    ci: 'no',
    ciNote: 'приватные submodule в CI не выкачиваются — проверять нечего',
    doc: '.claude/docs/precommit-hook-install-staleness.md',
  },
  {
    id: 'stale-worktrees',
    group: 'git',
    title: 'брошенные worktree фоновых агентов и осиротевшие ветки worktree-agent-*',
    run: ['bun', ['scripts/check-stale-worktrees.mjs']],
    // gate: находка означает потенциально уникальную незакоммиченную работу
    // параллельного агента, а не накопленный долг — молчать про неё нельзя.
    // Чистые хвосты без уникальной работы сам скрипт возвращает кодом 0.
    severity: 'gate',
    ci: 'no',
    ciNote: 'worktree-каталоги — локальный артефакт машины разработчика, в CI их нет',
    doc: 'PLAN-INFRA-4.md §120',
  },
  {
    id: 'stray-dts',
    group: 'hygiene',
    title: 'закоммиченные .d.ts/.d.ts.map — побочные артефакты typecheck:tsgo',
    run: ['node', ['scripts/check-stray-dts.mjs']],
    // gate: коммит артефакта не ловится ничем другим — typecheck/lint/build на его
    // присутствие не реагируют, а .gitignore закрывает только .d.ts.map (у .d.ts
    // бывают легитимные ambient-декларации без одноимённого .ts). Прецедент —
    // 529 untracked-артефактов накопились в 14 либах молча (2026-09-06), и 2 таких
    // файла уже были закоммичены в animatrona-e2e (69fdf2ea) до появления проверки.
    severity: 'gate',
    ci: 'full',
    doc: '.claude/docs/tsgo-stray-declarations.md',
  },
  {
    id: 'doc-counts',
    group: 'docs',
    title: 'счётные утверждения в .claude/docs (doc-count-аннотации) против реального состояния',
    run: ['bun', ['scripts/check-doc-counts.mjs']],
    // warn: расхождение счётчика — повод перечитать абзац и поправить число, а не
    // сигнал сломанной сборки. Пилот на трёх доках (2026-09-03) после аудита
    // 6fb3f93d — семь устаревших абсолютных утверждений, шесть из семи оказались
    // обычными счётчиками. Не покрывает качественные оценки («контракт замкнут») —
    // они не аннотируются, фолсифицировать их грепом нельзя.
    severity: 'warn',
    ci: 'no',
    ciNote: 'команды считают приватные submodule — в CI не выкачаны, значения были бы искажены',
    doc: '.claude/docs/theme-hardcode-gate-coverage.md',
  },
  {
    id: 'docs-index-integrity',
    group: 'docs',
    title: 'двухуровневый индекс документации (CLAUDE.md ↔ .claude/docs/INDEX.md) не разошёлся',
    run: ['bun', ['scripts/check-docs-index-integrity.mjs']],
    // gate: правило «новый док → две записи» держалось только на дисциплине — и
    // именно так короткая карта в CLAUDE.md разрослась до 912 строк из 1120 (81%
    // файла) до разделения на два уровня 2026-09-16. CLAUDE.md и .claude/docs/
    // целиком публичные, поэтому в CI видны без изъятий (в отличие от проверок,
    // которым нужны приватные submodule) — покрытие полное всегда.
    severity: 'gate',
    ci: 'full',
    doc: '.claude/docs/documentation-guidelines.md',
  },
]

// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isCi = args.includes('--ci')
const wantList = args.includes('--list')
const groupArg = args.find((a) => a.startsWith('--group='))?.slice('--group='.length)
const onlyArg = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)

const unknown = args.filter(
  (a) => !['--ci', '--list'].includes(a) && !a.startsWith('--group=') && !a.startsWith('--only='),
)
if (unknown.length > 0) {
  console.error(`неизвестные аргументы: ${unknown.join(', ')}`)
  console.error('см. шапку scripts/check-all.mjs')
  process.exit(2)
}

const onlyIds = onlyArg ? new Set(onlyArg.split(',').map((s) => s.trim())) : null
if (onlyIds) {
  const bogus = [...onlyIds].filter((id) => !CHECKS.some((c) => c.id === id))
  if (bogus.length > 0) {
    console.error(`нет таких проверок: ${bogus.join(', ')}`)
    console.error(`доступные: ${CHECKS.map((c) => c.id).join(', ')}`)
    process.exit(2)
  }
}
if (groupArg && !CHECKS.some((c) => c.group === groupArg)) {
  console.error(`нет такой группы: ${groupArg}`)
  console.error(`доступные: ${[...new Set(CHECKS.map((c) => c.group))].join(', ')}`)
  process.exit(2)
}

const SEVERITY_LABEL = { gate: 'gate ', warn: 'warn ', report: 'отчёт' }

if (wantList) {
  console.log('Проверки целостности монорепо (scripts/check-all.mjs):\n')
  for (const c of CHECKS) {
    console.log(`  ${SEVERITY_LABEL[c.severity]}  ${c.id.padEnd(22)} ${c.title}`)
    console.log(`         ${''.padEnd(22)} группа: ${c.group}, в CI: ${c.ci}`)
  }
  console.log('\ngate роняет прогон, warn и отчёт — нет.')
  process.exit(0)
}

// Отбор с ПОИМЁННЫМ перечислением пропущенного — см. «no silent caps»
// в .claude/docs/verification-pitfalls.md.
const selected = []
const skipped = []
for (const c of CHECKS) {
  if (onlyIds && !onlyIds.has(c.id)) { continue }
  if (groupArg && c.group !== groupArg) { continue }
  if (isCi && c.ci === 'no') {
    skipped.push({ c, why: c.ciNote ?? 'не запускается в CI' })
    continue
  }
  selected.push(c)
}

if (selected.length === 0) {
  console.error(
    'под фильтр не попала ни одна проверка — это почти наверняка опечатка в --group/--only',
  )
  process.exit(2)
}

const results = []
for (const c of selected) {
  const [cmd, cmdArgs] = c.run
  console.log(`\n─── ${c.id} — ${c.title} [${SEVERITY_LABEL[c.severity].trim()}]`)
  if (isCi && c.ci === 'partial') {
    console.log(`    ⚠️  неполное покрытие: ${c.ciNote}`)
  }
  const started = Date.now()
  const res = spawnSync(cmd, cmdArgs, { cwd: repoRoot, stdio: 'inherit', shell: false })
  const ms = Date.now() - started

  if (res.error) {
    // Не найден интерпретатор — это НЕ «проверка прошла». Считаем провалом
    // независимо от severity: молча пропущенная проверка опаснее красной.
    console.error(`    ❌ не удалось запустить (${cmd}): ${res.error.message}`)
    results.push({ c, ok: false, ms, launchFailed: true })
    continue
  }
  results.push({ c, ok: res.status === 0, ms, launchFailed: false })
}

// ─── Сводка ──────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(70)}\nИтог:\n`)

const failedGates = []
const failedWarns = []

for (const { c, ok, ms, launchFailed } of results) {
  const mark = ok ? '✅' : (c.severity === 'gate' || launchFailed ? '❌' : '⚠️ ')
  const partial = isCi && c.ci === 'partial' ? ' (покрытие неполное)' : ''
  console.log(`  ${mark} ${c.id.padEnd(22)} ${String(ms).padStart(5)}ms${partial}`)
  if (ok) { continue }
  if (launchFailed || c.severity === 'gate') { failedGates.push(c) }
  else { failedWarns.push(c) }
}

for (const { c, why } of skipped) {
  console.log(`  ⏭  ${c.id.padEnd(22)}       пропущено: ${why}`)
}

if (failedWarns.length > 0) {
  console.log(`\n⚠️  ${failedWarns.length} проверк(а/и) уровня warn красные — прогон это не роняет:`)
  for (const c of failedWarns) {
    console.log(`     ${c.id} — накопленный долг, разбор: ${c.doc}`)
  }
}

if (failedGates.length > 0) {
  console.error(`\n❌ ${failedGates.length} gate-проверк(а/и) не прошли:`)
  for (const c of failedGates) {
    console.error(`     ${c.id} — ${c.title}`)
    console.error(`       разбор: ${c.doc}`)
  }
  process.exit(1)
}

console.log('\n✅ все gate-проверки зелёные')
process.exit(0)
