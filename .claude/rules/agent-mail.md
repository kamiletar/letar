# Agent Mail — ОБЯЗАТЕЛЬНАЯ регистрация

**КРИТИЧНО:** При начале работы над любым приложением ты **ОБЯЗАН** первым делом вызвать `macro_start_session` для регистрации в системе координации агентов.

## Когда вызывать

Сразу после получения первой задачи от пользователя (после `/animatrona`, `/animatrona-tracker`, или любой другой команды запуска воркфлоу).

## Как вызывать

```
mcp__agent-mail__macro_start_session(
  human_key: "C:/web/lena",
  program: "claude-code",
  model: "opus-4.6",
  task_description: "<кратко что делаешь>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

## Пример для animatrona-tracker

```
macro_start_session(
  human_key: "C:/web/lena",
  program: "claude-code",
  model: "opus-4.6",
  task_description: "Разработка animatrona-tracker: синхронизация пинов",
  file_reservation_paths: ["apps/animatrona-tracker/**"],
  file_reservation_reason: "animatrona-tracker development"
)
```

## Во время работы

- **Перед редактированием `libs/**`** — проверь резервации через `file_reservation_paths`
- **Периодически** (каждые 5-10 инструментов) — проверяй `fetch_inbox` на входящие сообщения
- **При изменении API или общего кода** — отправь `send_message` с `broadcast: true`

## Если сервер недоступен

Если `macro_start_session` возвращает ошибку подключения — просто продолжай работу без координации. Не блокируй основную задачу.
