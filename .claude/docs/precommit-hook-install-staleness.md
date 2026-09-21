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

## Дополнение 2026-09-05: хук был свежим, но не смотрел не на то расширение схемы

Это НЕ повтор истории выше — здесь установленный набор `.git/hooks/pre-commit` был актуальным
(включал `_pre-commit-schema-migration-check.sh`, переустановлен незадолго до инцидента), и хук
исполнялся на каждый коммит. Пропуск был не в установке, а в самой логике
`scripts/check-schema-migration.mjs` (и параллельно — в grep-фильтре
`pre-commit-schema-migration-check.sh`).

**Что произошло:** коммит `0cbf176` в `apps/domwellbes` добавил `House.deletedAt DateTime?` в
`schema/house-config.zmodel` (фрагмент multi-file схемы, см.
[zenstack-multifile-schema-circular-imports.md](zenstack-multifile-schema-circular-imports.md)) —
без единой строки в `prisma/migrations/`. Оба слоя проверки матчили staged-файлы буквальным
именем `schema\.zmodel$` — и файл-фрагмент `schema/house-config.zmodel` под этот паттерн не
попадал вообще:

- в шелл-обёртке — `grep -qE '(^|/)schema\.zmodel$'` решал, вызывать ли `bun`-чекер вообще;
- внутри `check-schema-migration.mjs` — тот же паттерн фильтровал `entries`, а путь до
  `prisma/migrations/` вдобавок резолвился как `path.dirname(файла)`, что для фрагмента дало бы
  неверный каталог (`apps/domwellbes/schema/prisma/migrations/`) даже если бы фильтр пропустил.

Хук не нашёл коммит безопасным — он в буквальном смысле не видел файл, потому что тот не назывался
`schema.zmodel`. Прод упал на `next build` при статическом экспорте `/sitemap.xml`:
`column House.deletedAt does not exist`. Фикс в `bdd8cfb` (submodule domwellbes) плюс структурный
фикс здесь — `scripts/check-schema-migration.mjs` теперь матчит любой `*.zmodel`-файл и резолвит
корень приложения (и, соответственно, `prisma/migrations/`) поиском ближайшего предка с
`schema.zmodel`, а не по имени/каталогу самого изменённого файла.

**Урок, общий с историей выше:** «хук установлен и недавно переустановлен» и «хук установлен
свежим набором СКРИПТОВ, но с логикой, которая распознаёт не все формы того, что должна ловить» —
два независимых способа получить один и тот же симптом (структурное изменение схемы уехало без
миграции). Проверка через `cat "$GITDIR/hooks/pre-commit"` из раздела «Как диагностировать» выше
ловит только первый; для второго нужно читать логику самого чекера и сверять её со всеми формами,
в которых схема реально существует в репозитории (см. список приложений с multi-file схемой в
`zenstack-multifile-schema-circular-imports.md`), а не только с каноничным одиночным
`schema.zmodel`.

## Дополнение 2026-09-16: не расширение/установка, а `--name-only` на не-ASCII путях

Третий независимый способ получить тот же симптом («хук стоит, свежий, но не сработал») — здесь
причина не в установке и не в фильтре по имени файла, а в том, как `pre-commit-scope-guard.sh`
разбирал вывод `git diff --cached --name-only`.

**Что произошло:** коммит в `apps/domwellbes` переименовывал
`docs/architect-guide/DomWellbes_Архитектору_v1.0.pdf` → `..._v1.1.pdf` вместе с
`docs/ARCHITECT_BRIEF.md` — один каталог, один логический scope. При `core.quotepath=true`
(дефолт git) голый `--name-only` отдаёт путь с не-ASCII байтами в кавычках с восьмеричными
escape-последовательностями: `"docs/architect-guide/DomWellbes_\320\220...pdf"`. Разбор
`cut -d/ -f1-2` на такой строке даёт scope `"docs/architect-guide` (с кавычкой в начале) —
формально другой scope, чем `docs` у соседнего `ARCHITECT_BRIEF.md`. Коммит из одного каталога
блокировался как multi-scope.

Тот же паттерн (`--name-only` без `-z`) стоял ещё в двух местах и там был тише: в
`pre-commit-dprint-check.sh` и `pre-commit-semgrep.sh` он не блокировал коммит, а молча выкидывал
файл с не-ASCII именем из проверки — `[[ -f "$f" ]]` не находит реального файла по
квотированному/эскейпленному пути, файл считается «не существует», и dprint/semgrep её просто не
видят. Для semgrep это значит: файл с кириллицей в имени по факту никогда не сканировался на
секреты и SQL-инъекции.

**Фикс:** во всех трёх — `--name-only -z` (git отдаёт пути через NUL без кавычек и escape
независимо от `core.quotepath`) + `mapfile -d ''`/`while read -r -d ''` вместо парсинга строк.
`pre-commit-deps-integrity.sh` и `pre-commit-schema-migration-check.sh` не трогали — они матчат
только заведомо ASCII-имена (`bun.lock`, `package.json`, `*.zmodel`).

**Не забыть:** правка в `scripts/hooks/` — переустановить копии командой из раздела «Как
предотвращать» ниже, иначе submodule продолжат работать со старой (уязвимой к этому багу) копией
до следующего `install.sh --all-submodules`.

**Почему фикс не вынесен в общий sourced-файл.** Три хука получили один и тот же
трёхстрочник (`mapfile -d '' ... < <(git diff --cached --name-only -z --diff-filter=... [-- pathspec])`)
почти дословно — казалось бы, кандидат на `scripts/hooks/_lib-staged-files.sh`, который остальные
`source`-или бы. Разобрано и осознанно отклонено:

- Общая часть — буквально одна команда `git`; расходится у каждого хука сразу за ней
  (`diff-filter` разный, у dprint — pathspec по расширениям через `--`, у semgrep — pathspec
  ОТСУТСТВУЕТ и вместо него постфильтр `grep -Ezi` по регэкспу расширений, у scope-guard —
  вообще без pathspec). Функция с параметрами под все три формы вызова была бы не короче, чем
  сами три строки, которые она заменяет.
- `install.sh` копирует хуки как самостоятельные плоские файлы в `hooks_dir` (без подкаталогов
  для bash-скриптов — в отличие от `.mjs`-чекеров, которым уже заведён `hooks_dir/lib/`, см.
  `install_into()` в `scripts/hooks/install.sh`). Новый sourced-файл — это ещё один путь, который
  `install_into()` обязан скопировать в обе ветки (`ROOT_GIT_DIR` и цикл по submodule), и ещё одна
  точка, которая отстанет, если кто-то добавит четвёртый хук с `source`, не поправив
  `install.sh` — то есть тот же класс риска, который весь этот документ и описывает
  (установленная копия расходится с исходником в `scripts/hooks/`). Экономия в 3 строки на файл
  не оправдывает добавления этого риска.
- `pre-commit-deps-integrity.sh` и `pre-commit-schema-migration-check.sh` **не** используют `-z`
  вообще (см. выше) — то есть даже среди пяти хуков, трогающих `git diff --cached --name-only`,
  нет единого паттерна, который стоило бы централизовать: у двух логика короче ровно потому, что
  им не нужна NUL-safety (ASCII-only имена).

Если позже появится четвёртый хук с той же NUL-safe связкой **и** с тем же набором
diff-filter/pathspec, что у одного из существующих трёх, — тогда выносить в общий файл
оправданно; до тех пор дублирование трёх похожих, но не идентичных, трёхстрочников дешевле, чем
новая точка рассинхронизации install.sh.

## Дополнение 2026-09-22: `pre-commit-syntax-check` — новый скрипт, установлен сразу везде

Добавлен хук `pre-commit-syntax-check.sh` (+ `scripts/check-staged-syntax.mjs`, копируется как
`_check-staged-syntax.mjs`; про инцидент, ради которого он заведён, — в
[git-multi-agent-incidents](git-multi-agent-incidents.md)). По правилу из раздела ниже
`bash scripts/hooks/install.sh --all-submodules` выполнен в той же сессии: хук стоит в корне letar и
во всех 14 submodule, `scripts/check-precommit-hook-staleness.mjs` ожидает уже 9 скриптов и
подхватил новый сам — он собирает список из строк `_pre-commit-*.sh` в `install.sh`, а не из
комментария в шапке.

Что этот хук добавляет к теме документа:

- **Новый `.mjs`-чекер обязан приезжать вместе с `lib/`.** Как `check-stray-dts.mjs`, он импортирует
  `./lib/repo-root.mjs`, а в hooks-каталоге относительный `..` указывает на `.git`, не на корень —
  поэтому `install.sh` кладёт `hooks_dir/lib/repo-root.mjs` рядом. Копируешь ещё один чекер с
  импортами — проверь, что каждый импорт лежит в `hooks_dir`.
- **`typescript` резолвится не от расположения хука, а от корня репозитория** (`createRequire` от
  `<корень>/package.json`): для submodule `require` поднимается по родителям `apps/<x>` до
  `node_modules` монорепо — проверено на submodule обоих типов git-dir (`.git/modules/...` у
  `domwellbes`, каталог `.git` внутри у `studio`). Клон submodule вне монорепо `typescript` не найдёт
  — хук выведет предупреждение и пропустит проверку, а не заблокирует коммит.
- **Проверка читает индекс** (`git cat-file --batch :<путь>`). До 2026-09-22 `dprint-check` и
  `semgrep` брали из индекса только имена, а содержимое — с диска; теперь оба тоже смотрят индекс
  (`dprint fmt --stdin` для расходящихся с диском файлов, `git checkout-index` во временный каталог
  для semgrep) — см. разбор в `git-multi-agent-incidents.md`.

## Как предотвращать

- **Заводишь или меняешь скрипт в `scripts/hooks/`** — сразу выполни `bash
  scripts/hooks/install.sh --all-submodules` из этой же сессии. Не полагайся на то, что кто-то
  другой (или ты сам в следующей сессии) вспомнит переустановить хуки во всех 14 submodule.
- **После обновления хуков** — стоит свериться, что установка действительно прошла везде, а не
  только там, где были открыты рабочие деревья на момент запуска (`install.sh --all-submodules`
  обходит только существующие на диске checkout'ы submodule).
- Диагностика выше автоматизирована: `scripts/check-precommit-hook-staleness.mjs`, подключена в
  `bun scripts/check-all.mjs` как `precommit-hook-staleness` (группа `submodule`, уровень `warn` —
  накопленный долг между добавлением нового hook-скрипта и следующим `install.sh
  --all-submodules`, как и `submodule-gitignore`/`submodule-push-state` рядом). Не заменяет
  привычку переустанавливать хуки сразу после правки `scripts/hooks/` (см. пункт выше) — только
  делает отставание видимым, если о нём забыли.
