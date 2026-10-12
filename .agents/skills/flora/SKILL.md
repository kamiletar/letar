---
name: flora
description: Воркфлоу разработки flora — приватный submodule, учёт времени, требования 152-ФЗ
disable-model-invocation: true
---

# Flora - Воркфлоу разработки

## Инициализация

1. **Сразу стартуй таймер** — `time_start({ app: "flora", description: "изучение плана и постановка задачи" })`,
   затем `time_switch`, когда направление работы прояснится (см. «Учёт времени» ниже)
2. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
3. ⚠️ **Очередь задач — `apps/flora/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/flora/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next flora`. Вызов с id (`/flora FL-011`) — сразу
   `bun scripts/tasks.mjs show FL-011`. `PLAN*.md`, `TASKS.md`, `BACKLOG.md` **заморожены** и остаются справкой: целиком их
   не читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

## Регистрация в Agent Mail

Имя агента: `flora-dev`. Общий шаблон вызова `macro_start_session` и что делать при отказе —
`.claude/rules/app-workflow.md` § 1. Фиксированной identity с токеном для этого приложения ещё
нет: при первой регистрации заведи штатно (`register_agent`, kebab-case `flora-dev`) и сохрани
токен в `agent_fixed_names_tokens.md`.

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start FL-NNN --owner flora-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new flora …`, не абзацем в плане

## После завершения задачи

`bun scripts/tasks.mjs done FL-NNN --summary "…"`, дальше общий чек-лист —
`.claude/rules/app-workflow.md` § 3.

## Деплой

Запрещено деплоить самостоятельно — см. `.claude/rules/app-workflow.md` § 4. Запрос —
`deploy-agent-dev` через Agent Mail с `subject: "deploy-request: flora"`.

⚠️ Приложение ещё не готово к деплою: нет `Dockerfile.production`, `docker-compose.production.yml`,
`.env.docker(.enc)` и регистрации в Dashboard — см. скил `create-new-app`.

## Работа с submodule

Приложение — **приватный git submodule** (`kamiletar/letar-private-flora`). Перед редактированием:

```bash
cd apps/flora && git checkout main && git pull origin main
# ... правки ...
git add <файлы> && git commit -m "feat(flora): описание" && git push origin main
cd ../.. && git add apps/flora && git commit -m "chore: bump flora submodule" -- apps/flora
```

⛔ Порядок push нерушим: сначала submodule, потом letar — `.claude/rules/git.md`.

## Учёт времени

Проект ведётся для клиента студии по **почасовой оплате** (заведён в studio, `repoSlug = flora`).
Стартовать таймер при начале работы:

```
time_start({ app: "flora", description: "<что делаешь, языком клиента>" })
```

⚠️ В `description` — только предмет работы по этому проекту. Никаких других клиентов, чужих
проектов и внутренней кухни: описание видит заказчик. При смене вида деятельности —
`time_switch`. Правила остановки — `.claude/rules/time-tracking.md`.

## Проект

**Приложение:** flora
**Порт:** 3126
**Сервер:** s2
**Submodule:** kamiletar/letar-private-flora
**Описание:** см. `apps/flora/PLAN.md`
