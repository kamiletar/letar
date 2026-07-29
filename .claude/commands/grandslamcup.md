# Grand Slam Cup - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/grandslamcup/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `grandslamcup-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "grandslamcup-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка grandslamcup: <что делаешь>",
  file_reservation_paths: ["apps/grandslamcup/**"],
  file_reservation_reason: "grandslamcup development"
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
`subject: "deploy-request: grandslamcup"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** grandslamcup
**Порт:** 3016
**Домен:** grandslamcup.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Ключница (OIDC, clientId: grandslamcup-prod)
**БД:** PostgreSQL (порт 5453) + ZenStack
**Описание:** Турнир поэтов — площадка для поэтических турниров и баттлов
