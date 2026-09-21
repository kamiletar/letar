# Agent Mail: особенности и баги сервера

Вынесено из `.claude/rules/agent-mail.md` 2026-08-10 — правило грузится в контекст каждой
сессии, а эти разборы нужны только когда что-то уже сломалось. Действующая инструкция —
[.claude/rules/agent-mail.md](/.claude/rules/agent-mail.md).

Баги относятся к самому MCP-серверу agent-mail, а не к этому репозиторию: при обновлении сервера
проверь, воспроизводятся ли они ещё.

---

## Разбор по исходникам сервера (2026-08-20) — root cause вместо догадок

Ниже — то, что раньше было помечено «не выяснено»/«похоже, не доказано», проверено чтением
исходников внутри контейнера (`docker exec mcp_agent_mail-agent-mail-1 ...`, файлы
`/app/src/mcp_agent_mail/{app,config,utils}.py`) и апстрим-репозитория
[Dicklesworthstone/mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail).

### ✅ `<app>-dev` — легальный, официально поддерживаемый паттерн, переименовывать не нужно

Сервер знает **два** формата имени агента, не один:

1. **adjective+noun** (`BlueLake`) — auto-generated, случайный.
2. **explicit identity** (`utils.validate_explicit_agent_id`) — «stable, human-chosen identities
   like `cc-0`, `alpha-one`, or `worker_42` — useful for swarm workflows where agents are
   relaunched onto the same identity» (дословно из докстринга). Требование одно: хотя бы один
   разделитель `-`/`_`/`.` в имени — иначе строка уходит по ветке adjective+noun и там не пройдёт.

`<app>-dev` содержит `-` → это explicit identity **по дизайну**, а не обход валидации. Путь
регистрации (`_get_or_create_agent` в `app.py`) проверяет `validate_explicit_agent_id` **первым
делом**, до какой-либо adjective+noun проверки — вот почему `register_agent`/`macro_start_session`
с `<app>-dev` всегда молча срабатывали, это не везение.

### ⛔ Баг найден и локализован: `send_message(to:)` не проверяет explicit identity вообще

`send_message` на каждого получателя в `to` напрямую вызывает `_detect_agent_name_mistake()`
(`app.py:7118`) — эта функция **не содержит вызова `validate_explicit_agent_id`**, в отличие от
`_get_or_create_agent`. Она матчит имя против списка эвристик, и одна из них —
`_looks_like_descriptive_name`: любое имя, оканчивающееся на `agent|bot|assistant|helper|manager|
coordinator|developer|engineer|migrator|refactorer|fixer|harmonizer|integrator|optimizer|
analyzer|worker` — считается «descriptive role name» и отклоняется с текстом про
«WhiteMountain/BrownCreek».

**Отсюда следует то, чего не было в старой версии этого файла: баг триггерится не любым
kebab-case именем, а конкретно суффиксом-словом.** `forms-coordinator` ловит его (оканчивается на
`coordinator`), гипотетический `deploy-agent` тоже поймал бы (`agent`). А `aboi-dev`,
`studio-dev`, `svoichuzhie-dev` — **не ловят**, потому что `-dev` не входит в список суффиксов и
не проверяется `_looks_like_unix_username` (та проверка требует `str.isalnum()`, а дефис его
рвёт). Практический вывод: переименование `<app>-dev` → adjective+noun **не требуется и не было
нужно** — только координаторские имена, буквально оканчивающиеся на одно из слов списка выше.
`QuietRidge`/`BlackCove` остаются правильным решением для координаторских ролей, но не потому что
kebab-case вообще запрещён, а потому что конкретно эти суффиксы попадают под фильтр.

Баг — асимметрия конкретно в `send_message`: `register_agent`, `request_contact`,
`reply_message` этот путь не проверяют вовсе, отсюда и наблюдение «то же имя в `to` не проходит, а
в `request_contact`/`reply_message` — проходит».

### ✅ Причина потери БД 2026-08-10 — найдена и это расхождение с апстримом, не баг сервера

Официальный `docker-compose.yml` апстрима держит БД в **Postgres с именованным volume**
(`pgdata:/var/lib/postgresql/data`, `DATABASE_URL=postgres+asyncpg://...`). Наш self-hosted
деплой (`infra/agent-mail/setup.sh`) этот compose-файл не использует — до 2026-08-20 контейнер
был поднят на дефолтном `DATABASE_URL=sqlite+aiosqlite:///./storage.sqlite3` (относительный
путь). Так было на момент инцидента (история, не текущее состояние): `/app/storage.sqlite3`
лежал в писчем слое (`WorkingDir=/app`), а примонтирован volume был только `/data`
(`STORAGE_ROOT=/data/mailbox` — человекочитаемый git-архив сообщений, не БД). Любой
`docker rm`/пересоздание контейнера стирал `storage.sqlite3` вместе со всеми
`registration_token`.

⚠️ **Сейчас БД лежит в `/data/storage.sqlite3`** (проверено 2026-09-22:
`DATABASE_URL=sqlite+aiosqlite:////data/storage.sqlite3`, файл ~10 МБ и живой). `/app/storage.sqlite3`
остался пустым файлом в 0 байт от старого дефолта: `sqlite3.connect` на нём проходит молча, а
запрос `SELECT ... FROM agents` падает с `no such table: agents` (проверено 2026-09-22). Ошибку
`unable to open database file` дают только пути, которых нет вовсе. Все команды чтения в доках и
командах — только по `/data/`.

**Фикс применён 2026-08-20.** Контейнер `mcp_agent_mail-agent-mail-1` пересоздан с
`DATABASE_URL=sqlite+aiosqlite:////data/storage.sqlite3` (файл теперь внутри volume
`mcp_agent_mail_agent_mail_data`, а не в писчем слое). Перенос сделан консистентным снапшотом
(`sqlite3.connect(...).execute("VACUUM INTO '/data/storage.sqlite3'")` изнутри контейнера, без
остановки БД под нагрузкой), затем `docker stop` + `docker run` с тем же именем/сетью/портом/
volume + новым `DATABASE_URL`. Все 78 агентов, 387 сообщений, 429 резерваций, 44 контакта —
подтверждены в стартовом stats-баннере нового контейнера, все существующие `registration_token`
из памяти `agent_fixed_names_tokens.md` остаются рабочими (БД не менялась, только путь файла).
**Теперь `docker rm`/пересоздание контейнера больше не стирает БД** — она в volume, как и
`/data/mailbox`. Официальный путь апстрима (Postgres+volume, см. `docker-compose.yml` в
[Dicklesworthstone/mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail)) остаётся
более robust под конкурентную запись, если когда-нибудь понадобится — но текущий фикс полностью
закрывает причину инцидента 2026-08-10 при заметно меньшей сложности.

⚠️ **Если `infra/agent-mail/setup.sh` когда-нибудь будет использован для пересоздания
контейнера с нуля (переустановка, миграция на новый сервер) — не запускать `docker run` без
`-e DATABASE_URL=sqlite+aiosqlite:////data/storage.sqlite3`.** Дефолт из образа снова уйдёт в
писчий слой без предупреждения. `setup.sh` сам контейнер не поднимает (только клонирует
`mcp_agent_mail`, см. `scripts/start-agent-mail.sh` внутри) — актуальную команду `docker run` с
этим флагом стоит зафиксировать там же, если сервер когда-то пересоздаётся не вручную.

### ✅ «Identity ретирится сама между сессиями» — подтверждено, это встроенный idle-reaper

`config.py`: `auto_retire_stale_agents_enabled` (default `true`), sweep каждые
`AUTO_RETIRE_STALE_AGENTS_INTERVAL_SECONDS=3600` (час), порог —
`AUTO_RETIRE_STALE_AGENTS_THRESHOLD_SECONDS=86400` (**24 часа** простоя). Комментарий в
исходнике объясняет зачем: без этого «после ~30+ мёртвых агентов `send_message`-broadcast
начинает биться в contact-approval стену, потому что каждый новый агент требует апрува от всех
мёртвых». Это не баг и не связано с форматом имени — обычный сервисный демон. `unretire_agent` на
старте сессии — штатный шаг для любого приложения, если между сессиями прошло больше суток, а не
recovery-процедура на крайний случай.

Если 24-часовой порог даёт слишком много `unretire_agent`-трения (например, работа над
приложением идёт раз в несколько дней) — поднимается через
`AUTO_RETIRE_STALE_AGENTS_THRESHOLD_SECONDS` в окружении контейнера, без пересборки образа.

---

## Почему нельзя оставлять серверу генерировать имя

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

## Токен из памяти не подошёл: как вернуть себе своё имя

Симптом — `Invalid registration_token` (именно неверный токен, не «retired»: на «retired»
штатный ответ — обычный `unretire_agent` с тем же токеном, это не авария, сервер сам ретирит
агентов по простою).

⛔ **Не вызывай `register_agent`/`macro_start_session` с тем же именем повторно.** Сервер
требует доказательство владения даже для уже существующего имени, а отличить «имя свободно» от
«имя занято, токен устарел» без ответа сервера невозможно. Повторная регистрация — ровно тот
механизм, из-за которого при одновременном старте нескольких сессий одного приложения
(`/domwellbes`, `/mandala`, `/studio` — все три столкнулись с этим 2026-08-11…19) выигрывает
одна, а остальные держат в памяти токен, который сервер больше не признаёт.

**Шаг 1. Выясни, занято имя или это retired-сирота.** Токен не нужен: `ReadMcpResourceTool`
(`server: "agent-mail"`, `uri: "resource://agents/c-web-letar"`) возвращает и активных, и
`retired_agents` со всеми полями, кроме токена.

**Шаг 2а. Имя в `retired_agents`, и `inception_ts` ≈ `last_active_ts`** (создана и почти сразу
ушла в retired, живой сессии за ней не было) — это не чужой владелец, а сирота от гонки при
создании. Прочитай собственный токен READ-ONLY из своей же инфраструктуры: agent-mail —
self-hosted Docker на этой машине (`C:\web\letar\infra\agent-mail\mcp_agent_mail`, контейнер
`mcp_agent_mail-agent-mail-1`, БД `/data/storage.sqlite3` — не `/app/`, см. выше).

```bash
docker exec mcp_agent_mail-agent-mail-1 python3 -c "
import sqlite3
con = sqlite3.connect('file:/data/storage.sqlite3?mode=ro', uri=True)
cur = con.cursor()
cur.execute(\"SELECT registration_token FROM agents WHERE name=?\", ('<app>-dev',))
print(cur.fetchone())
"
```

Дальше — обычный `unretire_agent` с этим токеном. Прецедент — `domwellbes-dev`, восстановлена
так 2026-08-19.

**Шаг 2б. Имя среди активных с недавним `last_active_ts`** (⚠️ сюда попадаешь, только если токен
не подошёл; при валидном токене сервер коллизии не видит вовсе и молча делает две сессии одним
агентом — проверка `whois` до регистрации описана в
[agent-mail.md § «Вторая сессия того же приложения»](/.claude/rules/agent-mail.md)) — настоящая коллизия с живым
владельцем, в БД лезть нельзя (сломаешь чужую сессию). Тогда `create_agent_identity` **без**
`name_hint`: уникальность там по построению, в отличие от `register_agent` с угаданным именем
(check-then-act). Занеси новое имя в память как «рабочее имя для `<app>`, пока `<app>-dev`
занята» (образец — `mandala-relay`/`studio-relay`) и сразу выставь `set_contact_policy`
с `policy: "open"` — временная identity без него виснет на первой заявке контакта так же, как
постоянная, а про неё забывают быстрее.

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
