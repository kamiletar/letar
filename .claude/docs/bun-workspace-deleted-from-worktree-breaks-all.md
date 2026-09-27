# Удалённый из рабочего дерева workspace ломает `bun install` и граф Nx у всех сессий

**Короткий вывод:** если каталог `libs/<x>` пропал из общего чекаута (незакоммиченное удаление,
`D` в `git status`), разом ломаются три вещи. `bun install` отказывается работать, симлинки
`node_modules/@letar/*` исчезают, граф Nx не строится. Сломано у **всех** агентов, не только у
потребителей `<x>`. Восстановление: `git checkout HEAD -- libs/<x>`, затем
`bun install --force`. ⚠️ Обычный `bun install` без `--force` симлинки не возвращает.

## Симптом

Найдено 2026-09-27: пропал `libs/forms-core`. Кто и как его удалил, так и не выяснилось. В
`git status` были только строки `D libs/forms-core/...`. Каталог был пуст, удаление не
застейджено, переименованной копии среди untracked не было.

```text
error: workspace "<app>" depends on workspace "@letar/forms-core" (libs/forms-core),
       which is listed in bun.lock but not on disk
note: a pruned checkout must keep every workspace that its remaining workspaces depend on
```

Одновременно:

- `Cannot find package '@letar/forms-core'` из `libs/forms*/vitest.config.mts`. Nx грузит
  эти конфиги при построении графа, поэтому падают `nx build`/`test`/`lint` **любого**
  проекта, даже не связанного с формами;
- каталоги `libs/*/node_modules/@letar/` и `apps/*/node_modules/@letar/` пропали целиком.
  Корневого `node_modules/@letar` в репо нет вовсе, симлинки живут внутри каждого пакета, см.
  [libs.md](/.claude/rules/libs.md).

## Механизм

- `bun install` проверяет, что каждый workspace из `bun.lock` лежит на диске. Одного пропавшего
  хватает, чтобы он не выполнил установку ни для кого.
- Симлинки `node_modules/@letar/*` пропадают вместе с целевым пакетом. Вероятно, их убрала
  неудачная попытка `bun install` уже после удаления. Точной последовательности не видно.
- Когда каталог вернулся, обычный `bun install` отвечает «no changes»: `bun.lock` совпадает с
  `package.json`, и связи он не перепроверяет. Симлинки вернул только `--force`: он пересобрал
  3257 пакетов.

## Восстановление

Сначала убедиться, что это не чья-то незаконченная операция. Нужно написать в Agent Mail
владельцу либы или всем (`broadcast`) и подождать ответа. Удаление может оказаться частью
переименования, которое другая сессия ещё делает. Решение о восстановлении — за владельцем
репо или владельцем либы.

```bash
git status --short libs/<x> | grep -v '^ D'   # пусто — значит только удаления, чужих правок нет
git checkout HEAD -- libs/<x>                 # вернуть из HEAD (перечисляем каталог либы — осознанно)
bun install --force                           # из корня: вернуть симлинки
bun install                                   # повторно: должно быть «no changes»
nx show project <x> && nx typecheck:tsgo <x>
```

⚠️ `git checkout HEAD -- <каталог>` запрещён [git.md](/.claude/rules/git.md) как массовый
откат. Здесь он допустим только потому, что первая команда показала: в каталоге одни
удаления, и чужой WIP затереть нечем.

⚠️ Побочный эффект `--force`: он пересчитывает `bun.lock` и может подтянуть туда версии других
workspace, уже закоммиченные, но не отражённые в lock. Такой хвост коммитится **отдельно** от
восстановления. Чужие незакоммиченные версии на диске в него не включаются.

## Связанное

- [bun-install-stale-isolated-cache](bun-install-stale-isolated-cache.md) — другие случаи, где
  нужен `--force`, и где не помогает даже он.
- [bun-lockfile-private-submodules](bun-lockfile-private-submodules.md) — ещё один случай,
  когда `bun.lock` расходится с диском: невыкачанные submodule.
- [git-multi-agent-incidents](git-multi-agent-incidents.md) — другие способы, которыми общий
  чекаут теряет файлы.
