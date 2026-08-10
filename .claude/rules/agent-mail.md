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

### ⚠️ Работа внутри git submodule — file reservation ОБЯЗАТЕЛЬНА, но она НЕ физический замок

`file_reservation_paths` не блокирует ничьи действия — «Конфликты не блокируют работу — сервер
сообщает, грант всё равно выдаёт» (см. ниже). Для обычного `apps/<x>/**` в корне letar это
терпимо, потому что там есть технический барьер второго уровня — `pre-commit-scope-guard.sh`
(`.claude/rules/git.md` § «Технический барьер: pre-commit scope-guard»).

Для файлов **внутри** submodule (`apps/<x>/src/**` и т.п., где `<x>` — aboi, driving-school,
premium-rosstil, imot, dsperevod, studio, svoichuzhie, aprel8008, domwellbes,
poster-microtext-desktop и их e2e) этого второго барьера по умолчанию нет — submodule
это отдельный `.git`, и установка хука в корне letar его не покрывает. Ставится он одной командой
`bash scripts/hooks/install.sh --all-submodules`; разбор инцидента, где отсутствие этого барьера
привело к перемешиванию правок двух сессий в одном коммите (2026-08-09), — в
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).

**Даже когда хук установлен во всех submodule** (на 2026-08-10 — да, проверено во всех 14),
`file_reservation_paths` —
единственный сигнал, что кто-то ещё уже работает в том же submodule. Он не помешает случиться
гонке, но даст шанс её заметить: перед началом правок внутри submodule **обязательно** проверь
`fetch_inbox` и существующие резервации на путь этого submodule, а не только зарегистрируй свою.

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

Это отдельная история от бага ниже («`to` отклоняет kebab-case имя») — здесь причина не в
формате имени, а в том, что agent-mail требует явного подтверждения контакта между двумя
агентами, ранее не переписывавшимися. Первый `send_message` автоматически создаёт pending-заявку
и **блокирует** сам себя — сообщение не уходит.

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

### ⛔ `send_message(to: [...])` отдельно отклоняет kebab-case/описательные имена получателя — баг сервера

Отдельный от contact-approval баг (найдено и трижды воспроизведено 2026-08-09, сессия
`svoichuzhie-dev` → `forms-coordinator`, **после** одобренного контакта — воспроизводится
независимо от статуса контакта). Точный текст ошибки:

```
Error calling tool 'send_message': Invalid recipient 'forms-coordinator': 'forms-coordinator'
looks like a descriptive role name. Agent names must be randomly generated adjective+noun
combinations like 'WhiteMountain' or 'BrownCreek', NOT descriptive of the agent's task. Omit
the 'name' parameter to auto-generate a valid name.
```

Ключевой факт: `request_contact(to_agent: "forms-coordinator")` и
`reply_message(to: ["forms-coordinator"])` с **тем же самым** именем получателя проходят без
проблем — валидация формата имени применяется только к полю `to` в `send_message` (первичном,
не reply), не к `request_contact`/`reply_message`. Это касается любого фиксированного
kebab-case/составного имени, похожего на «описательную роль» (`forms-coordinator`,
предположительно `deploy-agent`-подобные тоже под риском) — не только `forms-coordinator`.

**Обход:**

- Если это первое сообщение в переписке — использовать `request_contact` (он же отправляет
  intro-сообщение) вместо голого `send_message`.
- Если уже есть предыдущее сообщение в треде (от получателя или third-party broadcast) —
  `reply_message` вместо `send_message`.
- `send_message` **с** `to`, где получатель — рандомное adjective+noun имя (`AzureGate` и
  т.п.), проблемы не имеет — баг специфичен для kebab-case/описательных имён в позиции `to`.

Баг не в этом репозитории — это регрессия/особенность самого MCP-сервера agent-mail. Если он
пропадёт при апдейте сервера — переоценить актуальность этого раздела.

⚠️ **2026-08-10: `forms-coordinator` переименован в `QuietRidge`** — настоящее adjective+noun
имя вместо kebab-case, которое и вызывало баг выше. `BlackCove` с самого начала строился по этой
же схеме — не совпадение, а единственный рабочий обход. Упоминания `forms-coordinator` в
примерах бага выше — исторический контекст диагностики, оставлены как есть.

## Фиксированные имена координаторов

| Агент            | Имя          | Роль                           |
| ---------------- | ------------ | ------------------------------ |
| Deploy Agent     | `BlackCove`  | Единственный кто деплоит       |
| Forms Coord      | `QuietRidge` | Владелец libs/forms ecosystem  |
| Animatrona Coord | `GrayMill`   | Владелец libs/animatrona-types |

⚠️ **2026-08-10: БД agent-mail была сброшена целиком** (self-hosted Docker-контейнер держал
SQLite в писчем слое, не в volume — потерян при пересоздании контейнера во время попытки
обновления). Все `registration_token` из `agent_fixed_names_tokens` (память) считать
устаревшими до первой успешной регистрации после инцидента. Подробности —
`project_agent_mail_db_loss_incident` в памяти.

## Ключи проекта

| Параметр      | Значение         | Где используется               |
| ------------- | ---------------- | ------------------------------ |
| `human_key`   | `"C:/web/letar"` | только в `macro_start_session` |
| `project_key` | `"c-web-letar"`  | все остальные инструменты      |

## Если сервер недоступен

Если `macro_start_session` возвращает ошибку подключения — продолжай работу без координации. Не блокируй основную задачу.
