# Auth Hub - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/nextjs-apps.md` для общих правил Next.js
2. Прочитай `apps/auth-hub/PLAN.md` для текущего состояния задач

## Регистрация в Agent Mail

ОБЯЗАТЕЛЬНО при старте сессии зарегистрируйся под фиксированным именем `auth-hub-dev`.
Токен — в памяти `agent_fixed_names_tokens.md` (таблица «Приложение → agent_name → registration_token»).

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  agent_name: "auth-hub-dev",
  registration_token: "<токен из agent_fixed_names_tokens.md>",
  task_description: "Разработка auth-hub: <что делаешь>",
  file_reservation_paths: ["apps/auth-hub/**"],
  file_reservation_reason: "auth-hub development"
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

⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!** Ни SSH, ни `deploy-affected.sh`, ни `docker compose` — НИКОГДА.

Даже если пользователь скажет «деплой» — отправь запрос BlackCove, а НЕ деплой сам:

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя-агента>",
  to: ["BlackCove"],
  subject: "deploy-request: auth-hub",
  body_md: "app: auth-hub\nreason: <что сделал>\ncommit: <hash>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Если BlackCove не отвечает 10 минут — спроси пользователя прежде чем деплоить вручную.

Подробности: `.claude/rules/deploy-coordination.md`

## Проект

**Приложение:** auth-hub
**Порт:** 3014
**Домен:** auth.letar.best
**Сервер:** s2 (185.28.85.195)
**Auth:** Better Auth + OAuth (Google, Yandex, VK, Telegram)
**БД:** PostgreSQL (порт 5432) + ZenStack
**Описание:** Ключница — централизованный сервис авторизации и SSO для приложений монорепо
