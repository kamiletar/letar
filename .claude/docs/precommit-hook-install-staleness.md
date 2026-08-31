# Установленные pre-commit хуки не подтягивают новые скрипты сами — нужен повторный `install.sh`

⚠️ Найдено на инциденте domwellbes 2026-09-01: cron-джоба `deliver-project-message-notifications`
падала с `HTTP 500` на каждом запуске, потому что модели `ProjectMessageNotification`/
`ProjectMessageRead` (и колонка `ProjectParticipant.revokedById`) попали в
`schema/projects.zmodel` только через `nx db:push` на dev — без файла миграции. На проде таблиц
не существовало. Сам класс бага (db:push расходится с migrate-историей, деплой этого не видит,
`prisma migrate status` сверяет только файлы против `_prisma_migrations`) уже полностью разобран в
[database.md § «Изменил схему — файл миграции обязан ехать в ТОМ ЖЕ коммите»](database.md#-изменил-схему--файл-миграции-обязан-ехать-в-том-же-коммите)
и [rules/database.md](/.claude/rules/database.md) (там же — безопасный рецепт восстановления:
`migrate diff` + ручной файл + `migrate resolve --applied`, без сброса dev-БД). Этот документ — про
то, почему сработавший для похожего прецедента (`ProjectMilestoneRmrSnapshot`, 2026-08-28)
защитный механизм в этот раз не сработал вообще.

## Что должно было это поймать — и не поймало

Коммит `3244464` (`feat(domwellbes): read-tracking и notification outbox для чата проекта`,
2026-08-31) добавил в `schema/projects.zmodel` две новые модели без единой строки в
`prisma/migrations/`. Именно такой коммит и обязан ловить `pre-commit-schema-migration-check.sh`
(структурное изменение внутри блока `model`/`enum`, не field-level атрибут) — но коммит прошёл
чисто, без `--no-verify` и без `GIT_ALLOW_SCHEMA_WITHOUT_MIGRATION=1` в сообщении.

**Причина:** установленный в этом submodule pre-commit-хук был сгенерирован 2026-08-17 —
`_pre-commit-scope-guard.sh` + `_pre-commit-semgrep.sh` + `_pre-commit-dprint-check.sh` +
`_pre-commit-sops.sh`, без единого упоминания schema-migration-check. Сам хук
`pre-commit-schema-migration-check.sh` и его подключение в `scripts/hooks/install.sh` появились
только 2026-08-28 — **на 11 дней позже**, чем этот submodule в последний раз проходил `bash
scripts/hooks/install.sh`. Установка хуков — не симлинк на `scripts/hooks/`, а копирование:
`install.sh` копирует текущий набор скриптов в `.git/modules/apps/<app>/hooks/` **один раз**, в
момент запуска. Новый скрипт, добавленный в `scripts/hooks/` позже, не появляется в уже
установленных копиях сам — их состояние заморожено на момент последнего `install.sh`.

## Почему это осталось незамеченным

- `typecheck:tsgo`/`lint`/тесты — зелёные: отсутствие миграции не ломает ни один из них, модель
  реально существует в dev-БД (через `db:push`), код и типы корректны.
- Деплой не ловит (см. `database.md`) — `prisma migrate status` сверяет файлы против
  `_prisma_migrations`, а не схему против фактических таблиц.
- Хук молчит не потому, что нашёл коммит безопасным, а потому что его в установленном наборе
  физически нет — не «false negative» эвристики (`scripts/check-schema-migration.mjs`), а
  отсутствие самого шага.
- Ни один прогон `bun scripts/check-all.mjs` (реестр проверок целостности монорепо) не сверяет
  установленный набор git-хуков submodule с исходниками в `scripts/hooks/` — drift между «что
  лежит в `.git/modules/.../hooks/`» и «что сейчас умеет `install.sh`» невидим для CI и для
  агента, пока кто-то явно не заглянет в оба места.

## Как диагностировать

Сравнить, что реально подключено в установленном pre-commit конкретного репозитория (letar или
submodule), с тем, что умеет генерировать актуальный `install.sh`:

```bash
# что установлено (пример для domwellbes)
GITDIR=$(git -C apps/domwellbes rev-parse --git-dir)
cat "$GITDIR/hooks/pre-commit"          # список bash "$DIR/_pre-commit-*.sh" — построчно
ls "$GITDIR/hooks/" | grep '^_pre-commit'

# что должно быть подключено сейчас
grep -n '_pre-commit-.*\.sh"' scripts/hooks/install.sh
```

Если в установленном `pre-commit` нет строки на `_pre-commit-schema-migration-check.sh` (или
любой другой скрипт, за который сейчас отвечает `install.sh`) — набор устарел, независимо от того,
когда сам submodule в последний раз клонировался или пересобирался.

Более грубый, но быстрый сигнал — просто сравнить mtime:

```bash
ls -la "$GITDIR/hooks/pre-commit" scripts/hooks/install.sh
```

Установленный `pre-commit` старше, чем `install.sh` в `scripts/hooks/`, — повод перепроверить
построчно, а не считать хуки актуальными по умолчанию.

**Не только domwellbes была затронута.** Тот же греп по всем приложениям с БД на 2026-09-01 нашёл
ещё три submodule со стухшим набором хуков (schema-migration-check не подключён): `aboi`,
`driving-school`, `dsperevod`. В тот же день `bash scripts/hooks/install.sh --all-submodules`
переустановлен для всех 15 submodule — на 2026-09-01 `schema-migration-check` подключён везде,
включая эти три. Урок остаётся актуальным: набор хуков — копия на момент установки, не симлинк,
и после любого нового скрипта в `scripts/hooks/` (не только этого) отставание снова начнёт расти
для submodule, которые не переустанавливали с момента добавления.

## Как чинить

```bash
bash scripts/hooks/install.sh --all-submodules
```

Идемпотентно — безопасно перезапускать в любой момент, перезаписывает `.git/modules/*/hooks/*`
свежими копиями из `scripts/hooks/`. Для самого letar (не submodule) — `bash
scripts/hooks/install.sh` без флага.

**Независимая от хуков проверка** (работает даже если хуки вообще не установлены или устарели) —
прогнать генерацию миграции без коммита. Если Prisma сообщает `Drift detected` — на dev-БД есть
изменения без файла миграции, независимо от того, что показывает git-хук:

```bash
nx db:migrate <app>   # не коммитить результат, если запускаешь только для диагностики; Ctrl+C на интерактивном промпте после "Drift detected" тоже подходит
```

## Как предотвращать

- **Заводишь или меняешь скрипт в `scripts/hooks/`** — сразу выполни `bash
  scripts/hooks/install.sh --all-submodules` из этой же сессии. Не полагайся на то, что кто-то
  другой (или ты сам в следующей сессии) вспомнит переустановить хуки во всех 14 submodule.
- **После обновления хуков** — стоит свериться, что установка действительно прошла везде, а не
  только там, где были открыты рабочие деревья на момент запуска (`install.sh --all-submodules`
  обходит только существующие на диске checkout'ы submodule).
- Диагностика выше (`grep` установленного `pre-commit` против `install.sh`) — кандидат на
  добавление в `bun scripts/check-all.mjs` как отдельная проверка целостности (уровень `warn`,
  по аналогии с остальными проверками накопленного долга в реестре) — на 2026-09-01 такой
  проверки в раннере нет, обходить это место нужно вручную.
