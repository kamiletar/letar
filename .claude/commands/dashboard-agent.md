---
description: Воркфлоу разработки dashboard-agent — регистрация в Agent Mail, задачи, деплой через BlackCove
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

2. Прочитай `apps/dashboard-agent/PLAN.md` для текущего состояния задач (если есть)

3. Проверь inbox — могут быть входящие задачи от других агентов:

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

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `CHANGELOG.md` — добавь запись об изменениях
3. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос BlackCove через Agent Mail с
`subject: "deploy-request: dashboard-agent"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** dashboard-agent (Node.js, Fastify)
**Сервер:** s1 (194.164.245.97)
**Описание:** Лёгкий агент мониторинга — сбор метрик системы, Docker контейнеров, PostgreSQL
**Особенности:** Без UI, фоновый сервис. Данные отправляет в dashboard (s2)
