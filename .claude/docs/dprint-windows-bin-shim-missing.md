# dprint внезапно «не найден» на Windows — пропавший shim в `node_modules/.bin`

## Симптом

Посреди рабочей сессии `nx run-many -t format --projects=<любой>` начинает падать с
«dprint не найден», хотя минутами раньше `dprint fmt`/`bunx dprint` в той же сессии отрабатывал
нормально. Диагностика на момент обнаружения:

- `which dprint` / `where dprint` — пусто, dprint нет ни в PATH, ни в scoop-шимах, ни в cargo.
- `node_modules/.bin/dprint*` — файла нет вовсе.
- Сам пакет при этом на месте: `node_modules/dprint/dprint.exe` присутствует и рабочий
  (`node node_modules/dprint/bin.cjs --version` печатает версию без ошибок).

Пре-коммит хук `scripts/hooks/pre-commit-dprint-check.sh` в этой ситуации не блокирует коммит —
он ловит отсутствие dprint и молча пропускает проверку формата с предупреждением. Это ожидаемо
(мягкий отказ лучше жёсткого блока на неполной инфраструктуре), но означает, что до починки любой
коммит мог уйти без проверки dprint.json.

## Причина №1 (сам инцидент): пропавший bin-shim при целом пакете

`dprint` — обычная `devDependency` в корневом `package.json` (`^0.55.2`), устанавливается через
`bun install`. У bun есть два независимых артефакта на пакет: содержимое самого пакета в
`node_modules/dprint/` (бинарник `dprint.exe`, `bin.cjs`) и **shim** в `node_modules/.bin/`,
через который его резолвят `bunx`/`bun run`/nx-таргет `format`. В этом инциденте пакет остался
цел, а shim в `.bin` пропал — вероятно, частичная/прерванная предыдущая установка
(конкурентный `bun install` от другого агента, антивирус, ручное вмешательство — точный
триггер не восстановлен).

**Фикс:** `bun install` из корня репозитория. Он не перекачивает пакет (`Checked N installs...
no changes`), но пересобирает и раскладывает shim'ы в `.bin` заново. После этого
`node_modules/.bin/dprint.exe` появляется, `bunx dprint`/nx-таргет `format` снова работают.

```bash
bun install
nx run-many -t format --projects=<пара приложений для проверки>
```

Если `bun install` не помог — проверить, не удалил ли антивирус/Defender сам `.exe` внутри
`node_modules/dprint/` (карантин бинарников — известное поведение для незнакомых `.exe` в
`node_modules`), тогда нужен `rm -rf node_modules/dprint && bun install`.

## Причина №2 (найдена попутно, не связана с самим инцидентом): Windows-баг в резолвере пре-коммит-хука

`scripts/hooks/pre-commit-dprint-check.sh` при отсутствии `dprint` в PATH ищет бинарник вручную,
поднимаясь по дереву каталогов и проверяя `-x "$dir/node_modules/.bin/dprint"`. На Windows bun
кладёт в `.bin` файл **с расширением `.exe`** (`dprint.exe`), а не голый `dprint` — файла с таким
именем без расширения на Windows не существует никогда. Значит fallback-резолв в этом хуке был
неработоспособен на Windows в принципе, если PATH не содержит `dprint` — то есть ровно в
ситуации, которую хук должен был подстраховывать. `command -v dprint` (первая ветка) эту дыру не
закрывал, потому что `node_modules/.bin` в PATH не добавлен.

**Фикс:** резолвер сначала проверяет `node_modules/.bin/dprint.exe`, затем (для Linux/macOS-хуков
той же кодовой базы) — голый `node_modules/.bin/dprint`. Исправлено 2026-08-13.

## Итог

Оба фикса — в `bun install` (разовое восстановление окружения) и в
`scripts/hooks/pre-commit-dprint-check.sh` (постоянный фикс резолвера). Проверка на реальном
прогоне после фикса — `nx run-many -t format` на паре приложений, cache miss, dprint реально
вызывается (не просто «не упало»).

## Связанные доки

- [dprint-worktree-submodule-scope.md](/.claude/docs/dprint-worktree-submodule-scope.md)
- [dprint-format-project-scope-not-file-scope.md](/.claude/docs/dprint-format-project-scope-not-file-scope.md)
- [dprint-eslint-curly-conflict.md](/.claude/docs/dprint-eslint-curly-conflict.md)
- [prettier-dprint-conflict-root-cause.md](/.claude/docs/prettier-dprint-conflict-root-cause.md)
