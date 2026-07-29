# Form Example - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/form-example/PLAN.md` для текущего состояния задач (если есть)
2. Прочитай `libs/forms/README.md` для контекста библиотеки

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `form-example-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "form-example-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка form-example: <что делаешь>",
  file_reservation_paths: ["apps/form-example/**"],
  file_reservation_reason: "form-example development"
)
```

## Координация (Forms Coordinator)

**Проверяй inbox** на задачи от координатора (topic: `forms-task`):

```
fetch_inbox(project_key: "c-web-letar", agent_name: "form-example-dev", registration_token: "<токен из agent_fixed_names_tokens.md>", topic: "forms-task", include_bodies: true)
```

После завершения — **отвечай через reply_message**.

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
`subject: "deploy-request: form-example"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** form-example (Next.js, PostgreSQL)
**Порт:** 3022
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** Full-stack витрина @letar/forms — 16 интерактивных примеров
