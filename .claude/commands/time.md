# Time - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/time/PLAN.md` для текущего состояния задач (если есть)

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `time-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "time-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка time: <что делаешь>",
  file_reservation_paths: ["apps/time/**"],
  file_reservation_reason: "time development"
)
```

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос BlackCove через Agent Mail с
`subject: "deploy-request: time"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** time
**Порт:** 3013
**Сервер:** s2 (185.28.85.195)
**БД:** PostgreSQL + ZenStack
**Описание:** Приложение для управления временем
