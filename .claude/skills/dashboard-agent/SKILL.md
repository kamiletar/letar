---
name: dashboard-agent
description: Воркфлоу разработки dashboard-agent — регистрация в Agent Mail, задачи, деплой через deploy-agent-dev
disable-model-invocation: true
---

# Dashboard Agent - Воркфлоу разработки

## Инициализация

1. Зарегистрируйся в Agent Mail под фиксированным именем `dashboard-agent-dev`
   (токен — в памяти `agent_fixed_names_tokens.md`, таблица «Приложение → agent_name → registration_token»):

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  agent_name: "dashboard-agent-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Dashboard Agent — разработка apps/dashboard-agent",
  file_reservation_paths: ["apps/dashboard-agent/**"],
  file_reservation_reason: "dashboard-agent development"
)
```

2. **Выставь открытую contact policy** — иначе первое сообщение от незнакомого агента виснет
   заявкой на подтверждение контакта (см. `.claude/rules/agent-mail.md`):

```
set_contact_policy(
  project_key: "c-web-letar",
  agent_name: "dashboard-agent-dev",
  policy: "open",
  registration_token: "<токен из agent_fixed_names_tokens.md>"
)
```

3. **Стартуй таймер** `time_start({ app: "dashboard-agent", ... })` — общий шаблон и правила
   переключения/остановки см. `.claude/rules/app-workflow.md` и `.claude/rules/time-tracking.md`.

4. ⚠️ **Очередь задач — `apps/dashboard-agent/tasks/`** (формат — [tasks-per-file](/.claude/docs/tasks-per-file.md)).
   Прочитай [`tasks/README.md`](/apps/dashboard-agent/tasks/README.md) и выполни
   `bun scripts/tasks.mjs next dashboard-agent`. Вызов с id (`/dashboard-agent DG-003`) — сразу
   `bun scripts/tasks.mjs show DG-003`. `PLAN.md` и `PLAN_COMPLETED.md` **заморожены** и остаются справкой: целиком их не
   читать, открывать только раздел из поля `source` выбранной задачи (`grep -n` и `Read` с `offset`)

5. Проверь inbox — могут быть входящие задачи от других агентов:

```
fetch_inbox(
  project_key: "c-web-letar",
  agent_name: "dashboard-agent-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  include_bodies: true
)
```

## Действия

После изучения документации:

- Выбери задачу из «можно брать», `start DG-NNN --owner dashboard-agent-dev`
- План работы запиши в раздел «План» файла задачи и предложи его
- Находку вне задачи заводи через `tasks new dashboard-agent …`, не абзацем в плане

## После завершения задачи

1. `bun scripts/tasks.mjs done DG-NNN --summary "…"` — итог и детали живут в файле задачи
2. Обнови `CHANGELOG.md` — добавь запись об изменениях
3. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос deploy-agent-dev через Agent Mail с
`subject: "deploy-request: dashboard-agent"`.

Шаблон вызова и что делать, если deploy-agent-dev молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** dashboard-agent (Node.js, Fastify)
**Сервер:** s2 (185.28.85.195) — s1 выведен из эксплуатации 2026-06-20; staging-инстанс на s1 (с 2026-09-19; раньше на старом s3)
**Описание:** Лёгкий агент мониторинга — сбор метрик системы, Docker контейнеров, PostgreSQL
**Особенности:** Без UI, фоновый сервис. Данные отправляет в dashboard (тот же сервер)
