# Prettier vs dprint — корневая причина и системный фикс (2026-08-13)

Десятый по счёту инцидент «внезапного форматирования» на 13.08.2026 (206 файлов в
`domwellbes`, 10 в `svoichuzhie`) заставил разобраться в первопричине, а не latать симптом.

## Диагноз

Prettier как пакет в репозитории не подключён — ни `.prettierrc`, ни `prettier` в
зависимостях, ни один `targets.format` его не вызывает. То, что выглядело как «Prettier
перезаписал код», на самом деле — многолетний долг: у `apps/domwellbes` и `apps/svoichuzhie`
свой `dprint.json` появился только 2026-08-06, до этого корневой `dprint.json` их исключал
через `excludes`, и код годами писался в незапинутом редакторе (в репозитории не было
`editor.defaultFormatter`). dprint впервые дотянулся до этого кода и переписал его в свой
стиль — большим диффом, который выглядит как «поломка».

Отдельная находка: встроенная команда **`nx format`/`nx format:write`/`nx format:check`**
(без `run-many -t`) — это код из пакета `@nx/workspace`, жёстко зашитый на Prettier, который
физически лежит в `node_modules` как транзитивная зависимость (bun hoisting). Команда
отрабатывает молча, без ошибок, и переписывает файлы в Prettier-стиль. Она **НЕ является**
таргетом `format` из `project.json` (тот вызывает `dprint fmt` через
`nx run-many -t format --projects=<...>`) — совпадение имени случайно, но путает.

`NX_SKIP_FORMAT=true` — официальная переменная Nx, но она гасит Prettier только внутри
`formatFiles()` (автоформат файлов, создаваемых генераторами `nx g ...`). Команду
`nx format`/`nx format:write` она **не трогает** — это доказано и по коду Nx, и эмпирически.

## Что сделано

1. **`.claude/hooks/validate-bash.js`** — уже блокировал голую `nx format`/`nx format:write`
   для агентов (позиционный regex, PLAN-INFRA.md §32). Оставлено как есть.
2. **`.claude/settings.json`** → `env.NX_SKIP_FORMAT: "true"` — доп. слой защиты для
   генераторов, не заменяет пункт 1.
3. **`.vscode/settings.json`** — per-language `editor.defaultFormatter: "dprint.dprint"`
   (`typescript`/`typescriptreact`/`javascript`/`javascriptreact`/`json`/`jsonc`/`markdown`,
   НЕ глобально — в репо есть `.py`/`.go`/`.kt`, которые dprint не форматирует).
4. **`.vscode/extensions.json`** — `esbenp.prettier-vscode` убран из `recommendations` и
   добавлен в `unwantedRecommendations`, добавлен `dprint.dprint`. Раньше расширения
   противоречили друг другу — это отдельный источник дрейфа, который мог всё это время
   заново подсовывать Prettier новым разработчикам/агентам через VSCode UI.
5. **Документация исправлена** (все места, где была голая `nx format` как «правильная»
   команда): `.claude/commands/letar.md`, `.claude/commands/workflow/code-review.md`,
   `.claude/commands/workflow/refactor.md`, `.claude/agents/code-quality-gate.md`,
   `.claude/agents/refactor-expert.md`, `.claude/skills/nx-monorepo/SKILL.md`,
   `.claude/skills/nx-monorepo/reference/commands.md` — последний прямо утверждал, что
   `nx format <project>` резолвится в таргет `project.json` («~30x быстрее Prettier»), что
   неверно: это разные команды, совпавшие именем.
6. **`scripts/hooks/pre-commit-dprint-check.sh`** (добавлен 13.08.2026, `db7a819e`) —
   блокирует коммит несоответствующих dprint-стилю файлов независимо от источника
   расхождения. Единственный слой, который не полагается на то, что «источник закрыт».
7. Разовая чистка накопленного долга — `nx run-many -t format --projects=<app>` по всем
   приложениям с недавно заведённым собственным `dprint.json`
   (`nx show projects --with-target format` → сверить дату появления `dprint.json`).

## Почему многослойно, а не одним фиксом

Ни один отдельный слой не защищает полностью: IDE-настройка не защищает от ручного вызова в
терминале, git-хук обходится `--no-verify`, `NX_SKIP_FORMAT` не покрывает саму команду
`nx format`. Рабочая защита — сумма слоёв: IDE формирует правильную привычку, хук ловит
коммит, документация не учит агента/человека неправильной команде.

## Если инцидент повторится (11-й раз)

Проверить в этом порядке:

1. `git log --follow --diff-filter=A -- <app>/dprint.json` — не появился ли `dprint.json`
   недавно у приложения, которое раньше было в `excludes` корневого (значит — снова старый
   долг, не новая порча).
2. `grep -rn "nx format\b" .claude/ scripts/` (без `run-many -t` перед) — не просочилась ли
   голая команда обратно в доки/агентов.
3. `git log -p -1 -- <файл>` на паре испорченных файлов — двойные кавычки/точки с запятой
   вместо одинарных кавычек/без точек с запятой — характерный след Prettier-дефолтов.
