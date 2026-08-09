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

### ⚠️ Без `agent_name`/`registration_token` сервер выдаёт случайную identity — это не нейтрально

Если вызвать `macro_start_session` без `agent_name`, agent-mail сгенерирует случайное
adjective+noun имя (`SunnyTower`, `WhiteMountain` и т.п.) и зарегистрирует **новую** identity —
без истории, без принятых контактов, незнакомую другим агентам/координаторам. Найдено
2026-08-09: сессия `svoichuzhie` стартовала как `SunnyTower` вместо фиксированного
`svoichuzhie-dev`, из-за чего первые `send_message` к `forms-coordinator`/`BlackCove` упирались
в `Contact approval required` и путаницу с диагностикой (см. ниже).

**Перед вызовом `macro_start_session` проверь, есть ли у этого приложения фиксированная
identity** — таблица `<app>-dev` + `registration_token` хранится в приватной cross-session
памяти (не в репозитории — токены не публикуются, см. `public-repo-hygiene.md`). Если запись
для приложения есть — передай её явно:

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  task_description: "<кратко что делаешь>",
  agent_name: "<app>-dev",
  registration_token: "<токен из памяти>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

Если фиксированной identity для приложения ещё нет — заведи её штатно (`register_agent` с
kebab-case именем `<app>-dev`) и сохрани `registration_token` в памяти для будущих сессий, а не
оставляй сервер генерировать случайное имя молча.

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

### ⚠️ `send_message` первый раз к незнакомому агенту → `Contact approval required`

Это **не баг валидации имени** и не требование «случайного» имени — сообщения об ошибке,
упоминающие пример вида `WhiteMountain`, вводят в заблуждение (найдено 2026-08-09, сессия
`svoichuzhie-dev` → `forms-coordinator`). Реальная причина: agent-mail требует явного
подтверждения контакта между двумя агентами, ранее не переписывавшимися. Первый `send_message`
автоматически создаёт pending-заявку и **блокирует** сам себя — сообщение не уходит.

**Что делать:**

1. Если получил ошибку `Contact approval required for recipients: <имя>` — заявка уже создана
   автоматически, ждать не нужно повторять `send_message` до апрува. Либо явно:
   ```
   request_contact(
     project_key: "c-web-letar",
     from_agent: "<твоё-имя>",
     to_agent: "<получатель>",
     reason: "<коротко зачем>"
   )
   ```
2. Получатель подтверждает:
   ```
   respond_contact(
     project_key: "c-web-letar",
     to_agent: "<получатель>",
     from_agent: "<твоё-имя>",
     accept: true
   )
   ```
3. После апрува `send_message` между этими двумя агентами проходит без повторной заявки (TTL
   контакта — 30 дней по умолчанию).

Это не связано с тем, зарегистрирован ли получатель под фиксированным kebab-case именем
(`agent_fixed_names_tokens` в памяти) — контакт-апрув требуется даже между двумя легитимными
фиксированными identity, если они ещё не переписывались.

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
