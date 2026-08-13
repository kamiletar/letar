# Общий workflow команд `/​<app>`

Извлечено из ~33 команд `.claude/commands/<app>.md`, где эти три блока повторялись почти
дословно (замер — 2026-08-10, `PLAN-INFRA.md §72`). Команда приложения ссылается сюда одной
строкой и подставляет своё имя агента; здесь — то, что от приложения не зависит.

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `<app>-dev`. Токен — в
памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).
Подробности механизма — `.claude/rules/agent-mail.md`.

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  agent_name: "<app>-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка <app>: <что делаешь>",
  file_reservation_paths: ["apps/<app>/**"],
  file_reservation_reason: "<app> development"
)
```

Сразу следом выставь себе `contact_policy: "open"` — иначе первое сообщение от любого нового
агента виснет заявкой `Contact request from <app>-dev`, требующей ручного `respond_contact`:

```
set_contact_policy(
  project_key: "c-web-letar",
  agent_name: "<app>-dev",
  policy: "open",
  registration_token: "<тот же токен>"
)
```

## После завершения задачи

1. Обнови `apps/<app>/PLAN.md` — отметь задачу выполненной
2. Обнови `apps/<app>/PLAN_COMPLETED.md` — добавь детали реализации (если в приложении ведётся отдельно)
3. Обнови `apps/<app>/CHANGELOG.md` — добавь запись об изменениях
4. Обнови `apps/<app>/PLAN_TESTING.md` — если добавил тесты
5. Обнови `apps/<app>/package.json` — увеличь версию (semver)
6. Прогони `nx format <app>` → `nx lint <app>` → `nx typecheck:tsgo <app>`
7. Закоммить осмысленным сообщением (см. `.claude/rules/git.md`)

## Деплой

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно** — ни SSH, ни `deploy-affected.sh`, ни `docker compose`.
Даже если пользователь скажет «деплой» — отправь запрос BlackCove через Agent Mail с
`subject: "deploy-request: <app>"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.
