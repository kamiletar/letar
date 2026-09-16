# Agent Mail — ОБЯЗАТЕЛЬНАЯ регистрация

> Правило без `paths:` — грузится в каждую сессию, поэтому здесь только порядок действий.
> Баги сервера, их причины по исходникам и процедуры восстановления identity —
> [agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md).

**КРИТИЧНО:** при начале работы над любым приложением первым делом вызови
`macro_start_session` — без регистрации другие агенты тебя не видят и конфликтуют по файлам.

## Старт сессии

```
mcp__agent-mail__macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  agent_name: "<app>-dev",
  registration_token: "<токен из памяти agent_fixed_names_tokens.md>",
  task_description: "<кратко что делаешь>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

Возвращает `{project, agent, file_reservations, inbox}` — сразу видно inbox и резервации.

### ⚠️ Всегда передавай `agent_name` + `registration_token`

Без них сервер молча заведёт **новую** identity со случайным именем (`SunnyTower`,
`WhiteMountain`) — без истории, без принятых контактов, незнакомую другим агентам. Фиксированные
имена `<app>-dev` и токены хранятся в приватной cross-session памяти (не в репозитории). Нет
фиксированной identity для приложения — заведи штатно (`register_agent`, kebab-case `<app>-dev`)
и сохрани токен в памяти.

### Сразу после регистрации — `contact_policy: "open"`

Для **любой** identity, фиксированной и временной. Иначе первое сообщение от незнакомого агента
виснет заявкой `Contact request from <твоё-имя>`, требующей ручного `respond_contact`.

```
set_contact_policy(
  project_key: "c-web-letar",
  agent_name: "<твоё-имя>",
  policy: "open",
  registration_token: "<твой токен>"
)
```

### Если регистрация не прошла

| Ответ сервера                       | Что делать                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «retired»                           | Норма, не авария: сервер ретирит по простою. `unretire_agent` с тем же токеном                                                                                                                 |
| `Invalid registration_token`        | ⛔ НЕ регистрировать то же имя повторно. Процедура возврата имени — [agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md#токен-из-памяти-не-подошёл-как-вернуть-себе-своё-имя) |
| `id: 1` + новый токен, `whois` пуст | База сервера обнулена — все старые токены мертвы, заводи identity заново и обнови память                                                                                                       |
| Ошибка подключения                  | Продолжай работу без координации, не блокируй основную задачу                                                                                                                                  |

## Во время работы

**Inbox** — проверяй каждые 5–10 инструментов:

```
fetch_inbox(project_key: "c-web-letar", agent_name: "<твоё-имя>", include_bodies: true)
```

**Резервации перед редактированием `libs/`:**

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

Задача дольше часа — `renew_file_reservations(..., extend_seconds: 3600)`. По завершении —
`release_file_reservations(...)`.

⚠️ **Резервация ничего не блокирует** — сервер сообщает о конфликте и всё равно выдаёт грант.
Технический барьер (pre-commit scope-guard) ловит только коммит из нескольких scope и не
различает две сессии внутри одного `src/`. Поэтому перед правками в submodule **проверь
`fetch_inbox` и чужие резервации на `apps/<submodule>/**`**, а не только зарегистрируй свою —
это единственный способ узнать, что рядом уже кто-то работает.

**Сообщения — всегда с `thread_id`:**

```
send_message(
  project_key: "c-web-letar",
  sender_name: "<твоё-имя>",
  to: ["deploy-agent-dev"],
  subject: "deploy-request: <app>",
  body_md: "...",
  thread_id: "deploy-<app>",
  topic: "deploy",
  importance: "high",
  ack_required: true
)
```

Изменил API или общий код — то же самое с `to: [], broadcast: true` и `subject: "api-change: …"`.

⚠️ **Три вещи ломают первый `send_message`** и выглядят по-разному: `Contact approval required`
(заявка создаётся сама, нужен `respond_contact` получателя), `Invalid recipient '<имя>': looks
like a descriptive role name` (валидация `to` отвергает имена с суффиксом-ролью, `request_contact`
и `reply_message` то же имя принимают) и обнулённая база. Тексты ошибок и обходы —
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md).

## Фиксированные имена координаторов

| Агент            | Имя                          | Роль                                                    |
| ---------------- | ---------------------------- | ------------------------------------------------------- |
| Deploy Agent     | `deploy-agent-dev`           | Единственный кто деплоит                                |
| Forms Coord      | `forms-coordinator-dev`      | Владелец libs/forms ecosystem                           |
| Animatrona Coord | `animatrona-coordinator-dev` | Владелец libs/animatrona-types                          |
| UI Coord         | `ui-coordinator-dev`         | Владелец libs/ui (заведён 2026-09-04, ~20 потребителей) |

## Ключи проекта

| Параметр      | Значение         | Где используется               |
| ------------- | ---------------- | ------------------------------ |
| `human_key`   | `"C:/web/letar"` | только в `macro_start_session` |
| `project_key` | `"c-web-letar"`  | все остальные инструменты      |
