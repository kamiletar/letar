# Agent Mail — ОБЯЗАТЕЛЬНАЯ регистрация

**КРИТИЧНО:** При начале работы над любым приложением ты **ОБЯЗАН** первым делом вызвать `macro_start_session` для регистрации в системе координации агентов.

## Когда вызывать

Сразу после получения первой задачи от пользователя (после `/animatrona`, `/animatrona-tracker`, или любой другой команды запуска воркфлоу).

## Как вызывать

```
mcp__agent-mail__macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  task_description: "<кратко что делаешь>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

Возвращает `{project, agent, file_reservations, inbox}` — сразу видно inbox и резервации.

## Пример для animatrona-tracker

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-4-6",
  task_description: "Разработка animatrona-tracker: синхронизация пинов",
  file_reservation_paths: ["apps/animatrona-tracker/**"],
  file_reservation_reason: "animatrona-tracker development"
)
```

## Во время работы

### Проверка inbox

Проверяй каждые 5–10 инструментов:

```
fetch_inbox(
  project_key: "c-web-letar",
  agent_name: "<твоё-имя>",
  include_bodies: true
)
```

### Файловые резервации перед редактированием libs/

```
file_reservation_paths(
  project_key: "c-web-letar",
  agent_name: "<твоё-имя>",
  paths: ["libs/<что-редактируешь>/**"],
  ttl_seconds: 3600,
  exclusive: false,
  reason: "<задача>"
)
```

Конфликты не блокируют работу — сервер сообщает, грант всё равно выдаёт. При конфликте координируйся с владельцем через `send_message`.

### Обновление TTL при задачах дольше часа

```
renew_file_reservations(
  project_key: "c-web-letar",
  agent_name: "<твоё-имя>",
  extend_seconds: 3600
)
```

### Отправка сообщений — всегда с thread_id

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя>",
  to: ["BlackCove"],
  subject: "deploy-request: <app>",
  body_md: "...",
  thread_id: "deploy-<app>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

### При изменении API или общего кода

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя>",
  to: [],
  broadcast: true,
  subject: "api-change: <что изменилось>",
  body_md: "..."
)
```

### Освобождение резерваций по завершении

```
release_file_reservations(
  project_key: "c-web-letar",
  agent_name: "<твоё-имя>"
)
```

## Фиксированные имена координаторов

| Агент            | Имя                 | Роль                           |
| ---------------- | ------------------- | ------------------------------ |
| Deploy Agent     | `BlackCove`         | Единственный кто деплоит       |
| Forms Coord      | `forms-coordinator` | Владелец libs/forms ecosystem  |
| Animatrona Coord | `GrayMill`          | Владелец libs/animatrona-types |

## Ключи проекта

| Параметр      | Значение         | Где используется               |
| ------------- | ---------------- | ------------------------------ |
| `human_key`   | `"C:/web/letar"` | только в `macro_start_session` |
| `project_key` | `"c-web-letar"`  | все остальные инструменты      |

## Если сервер недоступен

Если `macro_start_session` возвращает ошибку подключения — продолжай работу без координации. Не блокируй основную задачу.
