# Agent Mail — ОБЯЗАТЕЛЬНАЯ регистрация

**КРИТИЧНО:** При начале работы над любым приложением ты **ОБЯЗАН** первым делом вызвать `macro_start_session` для регистрации в системе координации агентов.

## Когда вызывать

Сразу после получения первой задачи от пользователя (после `/animatrona`, `/animatrona-tracker`, или любой другой команды запуска воркфлоу).

## Как вызывать

```
mcp__agent-mail__macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  task_description: "<кратко что делаешь>",
  file_reservation_paths: ["apps/<твоё-приложение>/**"],
  file_reservation_reason: "<приложение> development"
)
```

Возвращает `{project, agent, file_reservations, inbox}` — сразу видно inbox и резервации.

### ⚠️ Всегда передавай `agent_name` + `registration_token`

Без них сервер молча заведёт **новую** identity со случайным именем (`SunnyTower`, `WhiteMountain`)
— без истории, без принятых контактов, незнакомую другим агентам. Фиксированные имена
`<app>-dev` и токены к ним хранятся в приватной cross-session памяти (не в репозитории).

Если для приложения фиксированной identity ещё нет — заведи её штатно (`register_agent` с
kebab-case именем `<app>-dev`) и сохрани `registration_token` в памяти. Не оставляй серверу
генерировать имя.

⛔ **Исключение: если токен из памяти НЕ подошёл** (`Invalid registration_token` или похожая
ошибка), НЕ вызывай `register_agent`/`macro_start_session` с тем же именем `<app>-dev` повторно
— даже если кажется, что identity «ещё не заведена». Сервер требует доказательство владения даже
для уже существующего имени (см. предупреждение про `domwellbes-dev` ниже), и невозможно отличить
«имя правда свободно» от «имя занято, токен просто устарел» без ответа сервера. Повторная попытка
регистрации тем же именем — это ровно тот механизм, из-за которого при одновременном старте
нескольких сессий одного приложения (`/domwellbes`, `/mandala`, `/studio` — все три уже столкнулись
с этим 2026-08-11…19) выигрывает только одна, а остальные держат в памяти токен, который сервер
больше не признаёт «своим именем».

**Сначала выясни, действительно ли имя занято, а не просто retired.** Вызови
`resource://agents/{project_key}` через `ReadMcpResourceTool` (`server: "agent-mail"`,
`uri: "resource://agents/c-web-letar"`) — токен не нужен, ответ содержит и активных, и
`retired_agents` со всеми полями кроме токена. Если нужное имя там в `retired_agents` и
`inception_ts` ≈ `last_active_ts` (создана и почти сразу ушла в retired, за ней не было живой
сессии) — это не коллизия с чужим владельцем, а сирота от гонки при создании. Её можно вернуть
себе: agent-mail — self-hosted Docker на этой же машине
(`C:\web\letar\infra\agent-mail\mcp_agent_mail`, контейнер `mcp_agent_mail-agent-mail-1`, БД —
`/app/storage.sqlite3`). Прочитай `registration_token` READ-ONLY-запросом, не трогая ничего:

```bash
docker exec mcp_agent_mail-agent-mail-1 python3 -c "
import sqlite3
con = sqlite3.connect('file:/app/storage.sqlite3?mode=ro', uri=True)
cur = con.cursor()
cur.execute(\"SELECT registration_token FROM agents WHERE name=?\", ('<app>-dev',))
print(cur.fetchone())
"
```

Дальше — обычный `unretire_agent` с этим токеном. Это легитимно (сервер и БД — свои, не чужие),
не «атака», а чтение собственного секрета из своей же инфраструктуры. Прецедент —
`domwellbes-dev`, восстановлена так 2026-08-19 (детали в памяти `agent_fixed_names_tokens.md`).

**Только если в `resource://agents/...` имя числится среди активных** (не retired) с недавним
`last_active_ts` — вот тогда это настоящая коллизия с живым владельцем, и лезть в БД нельзя (можно
сломать чужую текущую сессию). В этом случае — `create_agent_identity` БЕЗ `name_hint`. Она
гарантированно создаёт уникальное имя на сервере (adjective+noun), коллизия невозможна по
построению, сколько бы сессий ни стартовало одновременно — в отличие от `register_agent` с
угаданным именем, где уникальность проверяется по принципу check-then-act. Занеси новое имя в
`agent_fixed_names_tokens.md` как «рабочее имя для `<app>`, пока `<app>-dev` занята» (см.
`mandala-relay`/`studio-relay` как образец) и работай под ним.

⚠️ **Токен из памяти может не подойти: база сервера иногда обнуляется.** Признак — в ответе
`macro_start_session` приходит `id: 1` и **новый** `registration_token`, а `whois` по знакомому
имени отвечает «not found». Тогда все старые токены мертвы, идентичности нужно заводить заново,
а память — обновлять. Проверено 2026-08-10: пропали `BlackCove` и все 30 `<app>-dev`. Разбор —
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md).

## Пример для animatrona-tracker

```
macro_start_session(
  human_key: "C:/web/letar",
  program: "claude-code",
  model: "claude-sonnet-5",
  task_description: "Разработка animatrona-tracker: синхронизация пинов",
  file_reservation_paths: ["apps/animatrona-tracker/**"],
  file_reservation_reason: "animatrona-tracker development"
)
```

### ⚠️ Работа внутри submodule — резервация обязательна, но это не замок

`file_reservation_paths` ничьих действий не блокирует: сервер сообщает о конфликте и всё равно
выдаёт грант. Технический барьер — pre-commit scope-guard, он установлен во всех 14 submodule
(`bash scripts/hooks/install.sh --all-submodules`), но ловит только коммит из нескольких scope
сразу и не различает «две сессии правят разные файлы внутри одного `src/`».

Поэтому перед правками внутри submodule **проверь `fetch_inbox` и чужие резервации на
`apps/<submodule>/**`**, а не только зарегистрируй свою. Это единственный способ узнать, что
рядом уже кто-то работает. Разбор инцидента —
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md).

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
  to: ["deploy-agent-dev"],
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

### ⚠️ Известные особенности сервера при отправке сообщений

Три вещи ломают первый `send_message` и выглядят как разные проблемы:

1. **`Contact approval required`** — первое сообщение незнакомому агенту блокирует само себя,
   заявка создаётся автоматически. Дальше нужен `respond_contact` от получателя.
2. **`Invalid recipient '<имя>': looks like a descriptive role name`** — валидация поля `to` в
   `send_message` отвергает kebab-case имена (`forms-coordinator`). При этом `request_contact` и
   `reply_message` то же имя принимают.
3. **Обнулённая база** — знакомого получателя просто нет, `whois` отвечает «not found».

Обходы, точные тексты ошибок и история воспроизведения —
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md).

## Фиксированные имена координаторов

| Агент            | Имя                          | Роль                           |
| ---------------- | ---------------------------- | ------------------------------ |
| Deploy Agent     | `deploy-agent-dev`           | Единственный кто деплоит       |
| Forms Coord      | `forms-coordinator-dev`      | Владелец libs/forms ecosystem  |
| Animatrona Coord | `animatrona-coordinator-dev` | Владелец libs/animatrona-types |

⚠️ **2026-08-20: переименованы в единую схему `<роль>-dev`** (были `BlackCove`/`QuietRidge`/
`GrayMill` — adjective+noun, заводились так из-за бага `send_message(to:)`, см.
[agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md)). Баг триггерится не любым
kebab-case, а только суффиксом-ролью в конце имени (`coordinator`/`agent`/...) — `<роль>-dev`
той же ловушки не ловит, `-dev` в списке суффиксов нет. Переименование сделано прямым `UPDATE`
поля `name` в БД agent-mail (не пересозданием identity) — вся история сообщений/контактов/
токен сохранены, старые имена в текстах ниже, описывающих прошлые инциденты по датам, оставлены
как есть (не переписывать историю).

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
