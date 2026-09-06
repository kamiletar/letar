# `bun.lock` расходится с версиями `package.json` из-за незапушенных коммитов — блокирует ЛЮБОЙ деплой

⚠️ Ловушка: ошибка выглядит как проблема конкретного приложения («не могу задеплоить X»), но
причина — в состоянии всего репозитория, и чинить нужно не деплоящееся приложение, а корень.

## Симптом

`deploy-affected.sh` на любом приложении падает на установке зависимостей:

```
error: lockfile had changes, but lockfile is frozen
⚠️  --frozen-lockfile failed (возможно uninitialized submodules). Повторяю без флага...
Saved lockfile
❌ bun.lock изменился после фолбэка — версии пакетов разошлись с закоммиченными (см. PLAN-INFRA.md §50)
❌ Деплой остановлен: обнови bun.lock локально (bun install), закоммить и запушь.
```

Диф после фолбэка выглядит как чистые version bumps без изменений зависимостей:

```diff
     "apps/kami-key-the-landing": {
       "name": "@letar/kami-key-the-landing",
-      "version": "0.2.2",
+      "version": "0.4.0",
```

## Причина

`bun.lock` хранит копию поля `version` (и `dependencies`) каждого workspace-пакета на момент
последнего `bun install`. Обычный воркфлоу сессии (`app-workflow.md` § «После завершения
задачи», шаг 5 — «увеличь версию `package.json`») бампает версию в `package.json`, но не всегда
запускает `bun install` после этого — а если и запускает, `bun.lock` может остаться
незакоммиченным отдельно от коммита с версией, или закоммиченный коммит просто не был запушен.

2026-09-06: в общем чекауте `C:\web\letar` лежали 4 закоммиченных, но не запушенных коммита
(версии `kami-key-the-landing`, `kami`, `kami-key-the`, `animatrona`, плюс два новых `libs/`).
Локальный `bun.lock` у HEAD был корректным — но `origin/main` отставал, и именно оттуда тянет
`git pull` внутри `deploy-affected.sh` на сервере. Деплой **любого** приложения (не только тех,
чья версия бампнулась) падает на этом шаге, потому что `bun install --frozen-lockfile`
проверяет консистентность всего workspace целиком, а не только поддерева деплоящегося
приложения.

## Диагностика

```bash
git fetch origin main --quiet
git log --oneline origin/main..HEAD     # есть коммиты, которых нет в origin/main?
```

Если да — сравнить версии в `package.json` конкретного приложения с тем, что записано в
локальном `bun.lock` (должны совпадать на HEAD):

```bash
grep -A2 '"apps/<app>":' bun.lock
grep '"version"' apps/<app>/package.json
```

Если совпадают на HEAD, но не совпадают на `origin/main` (`git show origin/main:bun.lock | grep
-A2 '"apps/<app>":'`) — это точно тот класс проблемы, а не реальный дрейф резолва зависимостей.

## Фикс

**Не** гонять `bun install` вручную в общем рабочем дереве, если рядом есть незакоммиченные
правки других агентов (`git status --short` покажет их) — `bun install` пересоберёт `bun.lock`
с учётом ИХ незакоммиченных `package.json`, и результат будет отражать чужой WIP, а не
`origin/main`. Правильный путь — просто запушить то, что уже корректно закоммичено локально:

```bash
bash scripts/check-submodule-push-state.sh   # сначала submodule (см. git.md — порядок пушей)
git -C apps/<submodule> push origin main     # если submodule отстаёт
git push origin main
```

Как только `origin/main` получает уже существующий, корректный `bun.lock` — деплой любого
приложения проходит без дополнительных действий.

## Почему это не поймать раньше

Ни `nx typecheck:tsgo`, ни `nx lint`, ни `nx build` локально не видят этой проблемы — она
проявляется только на `bun install --frozen-lockfile` в чужом окружении (сервере), которое
тянет именно `origin/main`, а не локальный HEAD разработчика. См. также
[bun-lockfile-private-submodules.md](bun-lockfile-private-submodules.md) — смежный, но другой
класс: там `--frozen-lockfile` падает из-за невыкачанных submodule, здесь — из-за реального
рассинхрона версий на `origin/main`.
