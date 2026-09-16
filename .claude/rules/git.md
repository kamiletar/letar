# Правила Git

> Правило без `paths:` — грузится в каждую сессию, поэтому здесь только императив и команды.
> Разборы инцидентов, механизмы и замеры — в
> [git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md) (816 строк, ссылки на
> нужные разделы стоят по месту). Читай его, если правило кажется избыточным или собираешься
> его менять.

## Формат коммитов

```
<type>(<scope>): <description>

[optional body]
```

| Тип        | Описание                            |
| ---------- | ----------------------------------- |
| `feat`     | Новая функциональность              |
| `fix`      | Исправление бага                    |
| `refactor` | Рефакторинг без изменения поведения |
| `docs`     | Документация                        |
| `test`     | Тесты                               |
| `chore`    | Обслуживание (deps, config)         |
| `style`    | Форматирование кода                 |
| `perf`     | Оптимизация производительности      |

Scope — имя приложения (`domwellbes`, `dashboard`), библиотеки (`ui`, `forms`) либо `deps`/`config`.

Ветки: `main` — production, от неё `feature/<name>`, `fix/<name>`, `refactor/<name>`,
`chore/<name>`. ⛔ Но не в общем чекауте `C:\web\letar` — см. запрет ниже.

## ⛔ `git push` — только с одобрения пользователя или по заявке на деплой

Коммить можно свободно, **push** — нет. Спрашивай перед каждым push, даже если пользователь
одобрял push раньше в этом же разговоре: одно одобрение не действует на будущие.

Исключение — push как шаг уже согласованной заявки на деплой
([deploy-coordination.md](/.claude/rules/deploy-coordination.md)); отдельного подтверждения на
сам push там не нужно. `git push --force` запрещён без явного разрешения всегда.

**Почему правило, а не дисциплина:** параллельные пуши перезапускают прогон CI/e2e заново — при
нескольких агентах e2e не успевает добежать до конца ни разу. Одобрение разносит пуши по времени.

## Правила

- Один коммит = одно логическое изменение, сообщение на русском или английском единообразно.
- ⚠️ **Коммить сразу после каждого готового куска** — законченной логической единицы (файл
  починен, тест написан), а не «всей задачи целиком». Не жди просьбы пользователя и не копи
  готовое до конца сессии: пока правки лежат в рабочем дереве, открыто окно для гонки с другими
  агентами и для потери работы при обрыве сессии. Это основная защита, всё остальное — страховка.
- Не коммитить `.env`, `node_modules`, `dist`.
- Перед push: lint + typecheck + test.

## Работа рядом с другими агентами

В репозитории одновременно работают несколько агентов над разными проектами. Правила ниже — не
гигиена, а защита от попадания чужой работы в твой коммит.

**Коммить только своими путями, перечисляя файлы:**

```bash
git add apps/my-app/some-file.ts apps/my-app/other-file.ts
git commit -m "feat(my-app): описание" -- apps/my-app/some-file.ts apps/my-app/other-file.ts
```

⚠️ **Pathspec защищает от чужих файлов ВНЕ твоих путей, но не от чужих правок ВНУТРИ них.**
`git commit -- <pathspec>` берёт содержимое рабочего дерева, а не индекса: каталог в pathspec
заберёт весь изменённый внутри него чужой WIP и оставит индекс рассинхронизированным.
Перечисляй **файлы**, не каталоги, и после коммита проверяй `git show --stat HEAD` — `git diff
--cached` до коммита этого не поймает по построению. Механизм —
[git-pathspec-commit-worktree-not-index](/.claude/docs/git-pathspec-commit-worktree-not-index.md).

⚠️ **Частичный hunk-стейджинг (`git add -p`) коммить БЕЗ pathspec** — иначе pathspec подтянет
незастейдженные хунки того же файла из рабочего дерева.

⛔ **Запрещено:** `git reset --hard`, `git reset HEAD`, `git checkout -- .`, `git add .`,
`git stash` без явной необходимости, `git push --force`. Первые четыре блокирует хук
`.claude/hooks/validate-bash.js`.

**Откатываешь свои правки — перечисляй файлы, а не каталог.** Опасен каталог в pathspec, а не
синтаксис `--`: указание коммита границу не сужает. Под тот же запрет попадают
`git checkout <sha> -- <каталог>`, `git restore --source=<sha> <каталог>`,
`git restore --worktree <каталог>`, `git checkout <branch> -- <каталог>` — хук их **не** ловит.

⚠️ **Не прогоняй pre-commit-хуки задним числом в общем чекауте** — соблазн «проверить файлы
своего коммита» превращается в `git checkout <sha> -- .` и перезаписывает всё рабочее дерево
(так безвозвратно потеряны правки третьей сессии, 2026-08-19). Нужна проверка — делай её в
`git worktree add` во временном каталоге, затем `git worktree remove`.

**Видишь в `git status` чужие файлы** — игнорируй, добавляй только свои. Перед любым массовым
откатом сначала посмотри `git status` глазами.

### ⛔ Не заводи локальные ветки в общем чекауте `main`

`C:\web\letar` — один чекаут на всех агентов и фоновые процессы. `git checkout -b` переключает
`HEAD`, который видят **все**: чужой коммит может уйти на твою ветку, а твой WIP — оказаться на
пути его возврата в `main`. Коммить напрямую в `main`, scoped-путями.

Нужна изоляция с рабочим `node_modules` (обычный worktree его не даёт):

```bash
git worktree add ../letar-wt-<задача> -b <ветка> origin/main
# внутри worktree, Windows:
mklink /J node_modules C:\web\letar\node_modules
```

⛔ **Запрещено:** `git checkout -b` / `git switch -c` внутри `C:\web\letar` и внутри submodule
на общем `main`.

`nx typecheck:tsgo`/`nx lint` там работают; `nx build`/`nx test` со сложным графом могут
спотыкаться о репо-широкие проблемы — паритета со сборкой в основном чекауте не жди.

⚠️ **Не путать с `isolation: "worktree"` у Agent tool** — это другой механизм (харнесс сам
создаёт и убирает каталог фонового агента), запрет его не касается.

### Технический барьер: pre-commit scope-guard

```bash
bash scripts/hooks/install.sh --all-submodules
```

Ставит хук в корень letar и во все 14 submodule: коммит блокируется, если застейджены файлы из
более чем одного scope (`apps/<x>`, `libs/<x>`, `infra/<x>` или первый сегмент пути).

Осознанный multi-scope коммит — явным флагом:

```bash
GIT_ALLOW_MULTI_SCOPE_COMMIT=1 git commit -m "..."
```

⚠️ **Флаг не отключает проверку, а превращает блокировку в предупреждение** со списком scope.
Сводка не заменяет `git diff --cached --name-only` глазами: прецедент 2026-08-19 — флаг стоял «на
всякий случай» у легитимного коммита и заодно забрал два чужих файла.

**Исключение `docs-root`:** любой markdown в корне репозитория (`PLAN*.md`, `CHANGELOG*.md`,
`README.md`, `ROADMAP.md`…) — один scope, не форкается по имени файла. Внутри submodule туда же
попадает корневой `package.json` (bump версии едет с `CHANGELOG.md` почти каждый коммит); в корне
letar он остаётся отдельным scope. Настоящий multi-scope (`apps/appA/PLAN.md` + `apps/appB/PLAN.md`)
по-прежнему блокируется.

Хук не автоустанавливается для новых клонов и не ловит «чужая правка внутри одного scope» — от
этого защищает только file reservation через Agent Mail. ⚠️ MCP-инструмент
`install_precommit_guard` (Agent Mail) нерабочий — возвращает пустой хук.

## Работа с приватными submodule

```bash
cd apps/driving-school          # внутри submodule
git checkout main               # submodule по умолчанию в detached HEAD
git pull origin main
# ... меняешь код ...
git add . && git commit -m "feat(driving-school): описание"
git push origin main            # пуш в приватный репо

cd ../..                        # назад в letar
git add apps/driving-school     # фиксируем новый SHA submodule
git commit -m "chore: bump driving-school submodule" -- apps/driving-school
git push
```

**Перед правками внутри submodule:** проверь `fetch_inbox` и чужие file reservation на
`apps/<submodule>/**`. Резервация не блокирует физически, но это единственный способ увидеть, что
там уже кто-то работает.

### ⛔ Порядок push нерушим: сначала submodule, потом letar

Запушенный bump SHA при незапушенном коммите внутри submodule ломает **весь деплой сразу**:
`git submodule update` на сервере падает с `upload-pack: not our ref` ещё до выбора приложения.
За 2026-08-27…28 повторилось пять раз — ловушка не в невнимательности, а в разделении труда:
коммит внутрь submodule делает одна сессия, bump SHA позже фиксирует другая.

Барьер — `pre-push` хук (ставится тем же `install.sh`). Проверить руками, не дожидаясь push
(полезно перед `deploy-request`):

```bash
bash scripts/check-submodule-push-state.sh
```

Аварийный обход, когда последствия понятны — `GIT_ALLOW_UNPUSHED_SUBMODULES=1 git push`
(как и multi-scope флаг, превращает блокировку в предупреждение).

### ⛔ Не делай

- Не редактируй файлы submodule без `git checkout main` — правки в detached HEAD теряются при
  следующем `git submodule update`.
- Не добавляй пути submodule в корневой `.gitignore` — Nx уважает gitignore и проекты исчезнут
  из графа.
- Не добавляй `src/generated/` в `.gitignore` submodule, если папка была tracked.

**Каждому submodule нужен свой `.gitignore`** — корневой на вложенный репозиторий не действует;
клади его **до** первого `git add` (образец — `apps/domwellbes/`). А вот свой `dprint.json`
обязателен не всем: dprint ищет конфиг вверх по дереву каталогов независимо от границ git, и
submodule вне `excludes` корневого конфига прозрачно наследует корневой.

⚠️ **`git commit -- <путь>` после `git rm --cached` возвращает файл** — удаление из индекса
коммить **без** pathspec (единственное законное исключение из «коммить только свои пути», и
только внутри submodule):

```bash
git rm -r --cached dist
git add .gitignore
git commit -m "chore: убрать артефакты сборки из индекса"
```

**Обновить все submodules:**

```bash
git submodule update --remote --recursive
GIT_ALLOW_MULTI_SCOPE_COMMIT=1 git commit -m "chore: bump all submodules"
```
