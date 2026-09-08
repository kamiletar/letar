# Nx: e2e-проект в публичном репо для приложения-submodule не держит implicitDependencies на него

## Симптом

`nx show projects --affected --files=apps/dsperevod/package.json` не включает `dsperevod-e2e`
(аналогично `svoichuzhie-e2e`, `aprel8008-e2e`) — правка приложения не помечает его e2e-набор
affected, хотя у большинства остальных `apps/*-e2e` (`aboi-e2e`, `domwellbes-e2e`,
`driving-school-e2e`, `studio-e2e`) точно такая же связь есть (`implicitDependencies: ["<app>"]`).

Выглядит как забытая связь в графе — найдено при аудите PLAN-INFRA-6.md §162. **Это не забытая
связь, а намеренное исключение.**

## Причина

`apps/dsperevod`, `apps/svoichuzhie`, `apps/aprel8008` — приватные submodule-приложения. Но их
e2e-пакеты (`apps/dsperevod-e2e`, `apps/svoichuzhie-e2e`, `apps/aprel8008-e2e`) — **обычные
каталоги публичного репо**, не submodule (сверено с `.gitmodules`).

CI чекаутит репозиторий без приватных submodule (`submodules: false`) — `apps/dsperevod` и
аналоги физически отсутствуют на раннере. Если публичный e2e-пакет объявляет
`implicitDependencies` на отсутствующий проект, Nx падает на `assertWorkspaceValidity` с
`WorkspaceValidityError` **ещё до запуска** `lint`/`typecheck`/`test` — для всего графа целиком,
не только для этого e2e-проекта. Убрано коммитом `7ef25dd4` (2026-08-11), тема
`fix(ci): убрать implicitDependencies на отсутствующие в CI submodule-приложения`.

`dsperevod-e2e`/`svoichuzhie-e2e` вместо связи с приложением держат `implicitDependencies` на
общие библиотеки e2e-обвязки (`@letar/env-load`, `@letar/e2e-testing`) — те публичные, на CI
существуют, падения не дают.

## Почему у `aboi-e2e`/`driving-school-e2e`/`studio-e2e`/`domwellbes-e2e` та же связь стоит и не ломает CI

Эти четыре e2e-пакета — **сами submodule** (см. `.gitmodules`:
`apps/aboi-e2e` → `letar-private-aboi-e2e.git` и т.д.). На CI-чекауте без submodule они не
существуют вовсе — Nx их просто не видит, `implicitDependencies` внутри несуществующего проекта
никогда не оценивается. Конфликта нет по построению, а не потому что там особый случай.

Различитель: **e2e-пакет публичный (обычный каталог `apps/`), а тестируемое приложение —
submodule** → implicitDependencies опасен, только через общие публичные либы. **e2e-пакет сам
submodule** → implicitDependencies на своё приложение безопасен.

## Практическое следствие

Для `dsperevod`/`svoichuzhie`/`aprel8008` **affected-граф не запустит e2e автоматически** ни
локально, ни в CI (если бы CI гонял e2e — сейчас `hard e2e-gate` для них
[не реализован](/.claude/docs/e2e-testing.md), см. `project_e2e_gate_hard_scope` в памяти).
Правишь одно из этих трёх приложений — гоняй `nx e2e <app>-e2e` явно, не полагайся на
`nx affected -t e2e`.

## Не чинить

Возврат `implicitDependencies: ["dsperevod"]` и т.п. воспроизведёт `WorkspaceValidityError` на
первом же CI-прогоне после публичного checkout без submodule — проверено эмпирически в исходном
коммите (WSL, чистый клон без submodule).
