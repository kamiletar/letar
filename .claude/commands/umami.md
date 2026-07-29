# Umami - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/umami/PLAN.md` для текущего состояния задач (если есть)

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `umami-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "umami-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка umami: <что делаешь>",
  file_reservation_paths: ["apps/umami/**"],
  file_reservation_reason: "umami development"
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
`subject: "deploy-request: umami"`.

Шаблон вызова и что делать, если BlackCove молчит 10 минут — `.claude/rules/deploy-coordination.md`.

## Проект

**Приложение:** umami
**Порт:** 3009
**Сервер:** s1 (194.164.245.97)
**Описание:** Self-hosted аналитика для всех проектов Letar
**Особенности:** Docker-based, stats.letar.best
