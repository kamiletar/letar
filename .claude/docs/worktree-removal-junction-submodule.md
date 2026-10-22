# Удаление worktree с submodule и junction на `node_modules`

**Короткий вывод:** `git worktree remove` на worktree с submodule отказывает, а рекурсивное
удаление каталога с junction `node_modules` может пойти по ссылке и снести **реальные**
зависимости всего монорепо. Порядок: проверить submodule → `--force` → `git branch -d` →
`git worktree prune` → снять junction через `rmdir` → только потом удалять остальное.

Найдено 2026-10-22 при уборке влитого worktree с submodule `apps/domwellbes`. Worktree с
junction создаётся по [git.md](/.claude/rules/git.md) (`mklink /J node_modules C:\web\letar\node_modules`).

## Ловушка 1. `git worktree remove` отказывает из-за submodule

```text
fatal: working trees containing submodules cannot be moved or removed
```

Перед `--force` убедись, что внутри submodule нет неотправленной работы:

```bash
git -C <worktree>/apps/<submodule> log --not --remotes --oneline   # пусто = всё на origin
git -C C:/web/letar/apps/<submodule> cat-file -t <sha>             # каждый нужный sha есть в основном checkout
```

Пусто и `commit` — `git worktree remove --force <путь>`. Иначе сначала push submodule.

## Ловушка 2. После `--force` каталог остался, а ветку не удалить

`--force` снимает регистрацию, но каталог (у нас 6573 файла, «Permission denied») может
остаться. Пока worktree числится в `git worktree list`, `git branch -d` отказывает. Порядок:

```bash
git worktree remove --force <путь>
git branch -d <ветка>
git worktree prune
```

## Ловушка 3. Junction `node_modules` ведёт в настоящий каталог

`rm -rf` и `Remove-Item -Recurse` (особенно в старых PowerShell) могут пойти по ссылке и
удалить содержимое `C:\web\letar\node_modules`. Сначала найди все ссылки, снимай их `rmdir`
(он убирает только ссылку), и лишь потом удаляй остальное:

```powershell
Get-ChildItem <путь> -Force -Recurse -Attributes ReparsePoint   # все junction/symlink внутри
cmd /c rmdir <путь>\node_modules                                 # снимает ссылку, цель не трогает
Set-Location C:\                                                 # выйти из удаляемого каталога
Remove-Item <путь> -Recurse -Force
```

**Проверка до и после:** число пакетов в `C:\web\letar\node_modules` (у нас было 238) и
`Test-Path C:\web\letar\node_modules\nx\package.json`. Не совпало — зависимости задеты,
восстановление через `bun install --force`
([bun-workspace-deleted-from-worktree-breaks-all](/.claude/docs/bun-workspace-deleted-from-worktree-breaks-all.md)).

## Нюансы Windows

- Оболочка, чей cwd стоит внутри удаляемого каталога, блокирует удаление: сначала
  `Set-Location C:\`.
- `-ErrorAction SilentlyContinue` скрывает причину отказа. Диагностируй на одном файле с
  `-ErrorAction Stop`.
