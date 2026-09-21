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

## Второй класс: lock отстаёт от `package.json` уже в самом HEAD (2026-09-21)

Не «не запушено», а «не закоммичено»: коммит с версией есть, коммита `bun.lock` для неё — нет.
Найдено разом шесть workspace: три приватных submodule, `apps/dashboard-agent`,
`libs/ipfs-kubo-core` и `libs/auth` (0.15.3 против 0.16.0 — про него никто не знал, в исходной
находке его не было). Три механизма, и первые два воркфлоу порождает штатно:

1. **Бамп `version` без `bun install`** (`app-workflow.md` § «После завершения задачи», шаг 5).
   Проверено по истории: коммиты `dashboard-agent 0.16.4`/`0.16.5`/`0.17.0` и `ipfs-kubo-core`
   0.1.1 `bun.lock` не трогали. В `git log -- bun.lock` при этом десяток коммитов вида «версия X
   в bun.lock» — то есть одну и ту же дырку латают руками по одному пакету за раз.
2. **Бамп внутри приватного submodule.** `bun.lock` лежит в корне letar, submodule — отдельный
   репозиторий, и его коммит физически не может включить правку корневого lock. Следом идёт
   `chore: bump <submodule>` в letar (gitlink), и lock обновляют, только если про него вспомнят.
   Так разошлись все три приватных.
3. **`bun install` в дереве с чужим WIP пишет в lock чужое состояние — и результат может быть
   ХУЖЕ коммитного.** Незакоммиченный рабочий lock нёс `libs/deploy-mcp` 0.4.1 при
   `package.json` и HEAD-lock 0.5.0: слепо закоммитить «обновлённый» lock значило внести новое
   расхождение, замаскировав его на фоне пяти правильных. Поэтому lock перед коммитом сверяют
   построчно с `package.json` (защита ниже), а не доверяют факту «его обновил bun».

⚠️ Воспроизвести падение локально нельзя: `bun 1.4.2 install --frozen-lockfile` (в том числе с
`--lockfile-only`) на lock со старыми `version` завершается кодом 0 без единой строки — а сервер
падает (см. «Симптом»). `--dry-run` тем более ничего не проверяет. Поэтому «прогнал frozen
локально, зелёное» — не доказательство; доказательство — собственная сверка ниже.

### Защита

`scripts/check-lock-workspace-versions.mjs` (реестр `check-all`, id `lock-versions`, группа
`deps`, gate) сверяет блок `workspaces` в `bun.lock` с `package.json` каждого пакета: `version`,
четыре карты зависимостей, а также наличие workspace на диске без записи в lock. 36 мс.

- **pre-commit** (`pre-commit-deps-integrity.sh`): коммит, содержащий сам `bun.lock`, при
  расхождении **блокируется**. Коммит `package.json` или сдвига указателя submodule — только
  **предупреждение**: lock и `package.json` едут разными коммитами (scope-guard режет связку
  `bun.lock` и `apps/<x>` как multi-scope), и в момент бампа расхождение неизбежно — но хук напоминает про
  lock ровно в тот момент, когда про него обычно забывают. Внутри submodule хук запускает ту же
  сверку от корня letar (предупреждением).
- **В CI не запускается** (`ci: 'no'`): шаг `Install dependencies` там идёт **без**
  `--frozen-lockfile` и перезаписывает `bun.lock` до проверки — она сверяла бы уже пересобранный
  lock и зеленела бы всегда. Это тот же класс, что «проверка, которая не может упасть»
  ([verification-pitfalls](verification-pitfalls.md)).
- ⚠️ Хук — копия на момент `install.sh` ([precommit-hook-install-staleness](precommit-hook-install-staleness.md)):
  чтобы он заработал в корне и во всех 14 submodule, нужно `bash scripts/hooks/install.sh
  --all-submodules`. До этого защищает только ручной `bun scripts/check-all.mjs --only=lock-versions`.

### Как чинить, когда сверка красная

```bash
bun scripts/check-lock-workspace-versions.mjs      # какие именно строки разошлись
git diff bun.lock | grep '^[-+] '                   # после правки — только version-строки, без чужого
```

`bun install --lockfile-only` допустим только в чистом дереве. Если расхождение по submodule —
lock коммитят **после** `bash scripts/check-submodule-push-state.sh` без красных строк: пока
SHA submodule не на его origin, бампнутая версия в lock ссылается на код, которого сервер не
получит. Локальный коммит lock при этом безвреден (pre-push хук не даст запушить letar раньше
submodule), вредна именно связка «lock запушен, submodule нет».

## Почему это не поймать раньше

Ни `nx typecheck:tsgo`, ни `nx lint`, ни `nx build` локально не видят этой проблемы — она
проявляется только на `bun install --frozen-lockfile` в чужом окружении (сервере), которое
тянет именно `origin/main`, а не локальный HEAD разработчика. См. также
[bun-lockfile-private-submodules.md](bun-lockfile-private-submodules.md) — смежный, но другой
класс: там `--frozen-lockfile` падает из-за невыкачанных submodule, здесь — из-за реального
рассинхрона версий на `origin/main`.
