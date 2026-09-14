# MCP серверы

**ВАЖНО:** Всегда используй MCP серверы для актуальной документации вместо предположений о знаниях.

## Ревизия 2026-09-14: 22 записи в `.mcp.json` → 4

Каждая сессия Claude Code поднимает **все** записи `.mcp.json`, нужны они этой сессии или нет.
При нескольких параллельных сессиях (обычная практика в этом репозитории) это давало десятки
процессов и заметный расход RAM: `cmd /c bunx tsx` — цепочка процессов на каждый из 9 наших
TS-серверов, `pg-wrapper.mjs` порождал ещё дочерний Node или Python на каждую из 8 баз (3 из них
поднимали `uvx postgres-mcp` ради Pro-инструментов — EXPLAIN/health-check/подбор индексов, за всю
историю вызванных ~9 раз и регулярно не укладывавшихся в 30-секундный таймаут подключения).

Замер «до» (несколько живых сессий): 385 процессов, ~966 МБ working set, из них python 28,
uv/uvx 28, cmd 108.

**Решение:** 9 наших TS-серверов (studio-time, studio, umami, glitchtip, deploy, form, synth,
domwellbes-assist ×2) слиты в один процесс `letar`; 8 Postgres-серверов — в один процесс
`letar-db`, без Python. `chakra-ui`, `next-devtools` и проектный `context7` удалены — 25/17/39
вызовов за 1779 сессий, next-devtools к тому же регулярно падал на старте (см. ниже), context7
дублирует desktop-расширение (`mcp__Context7__*`). `nx-mcp` остался, но с закреплённой версией.

Итог: 4 записи в `.mcp.json` (`nx-mcp`, `letar`, `letar-db`, `agent-mail`), 3 stdio-процесса на
сессию вместо 21.

## Доступные MCP серверы

| MCP Сервер     | Реализация                                                      | Назначение                                                                                 |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **nx-mcp**     | `bunx nx-mcp@<закреплённая версия>`                             | Операции с Nx воркспейсом, проекты, таргеты, документация                                  |
| **letar**      | `.claude/mcp/letar.ts` (объединяет 9 наших фабрик, см. ниже)    | Тайм-трекер, деплой, формы, студия, аналитика, GlitchTip, синтезатор, наставник domwellbes |
| **letar-db**   | `.claude/mcp/letar-db.ts` (реестр `.claude/mcp/databases.json`) | SQL/схема ко всем Postgres-базам монорепо                                                  |
| **agent-mail** | HTTP, `http://127.0.0.1:8765/mcp`                               | Координация нескольких Claude Code сессий (см. ниже)                                       |

Документация любых внешних библиотек (React, TanStack и т.п.) — desktop-расширение Context7
(`mcp__Context7__resolve-library-id` + `get-library-docs`), не отдельный проектный сервер.

⚠️ **`nx-mcp` запускается с `--minimal false`.** По умолчанию флаг равен `true`, и сервер отдаёт
только `nx_docs` и три `ci_*` — `nx_workspace`, `nx_project_details`, `nx_generators` при этом
отсутствуют в списке инструментов, хотя инструкции их требуют. Версия закреплена в `.mcp.json`
(не `@latest`) — см. «Гонка распаковки bunx» ниже.

## letar — объединённый сервер наших TS-инструментов {#letar}

`.claude/mcp/letar.ts` — скрипт вне графа Nx (как раньше `pg-wrapper.mjs`), запускается напрямую
`bun` (без `bunx`/`cmd`). Каждая часть строится своей обычной фабрикой (`createXMcpServer` из
`libs/*`, `apps/synth`, `apps/domwellbes`), подключается к внутреннему in-memory MCP-клиенту (тот
же приём, что `libs/mcp-test-kit` использует в тестах — `InMemoryTransport.createLinkedPair()`),
и наружу отдаётся один слитый список инструментов/ресурсов/промптов. **Код библиотек и их
`server.spec.ts` не меняются** — они по-прежнему тестируются через `connectedClient` напрямую.

Изоляция сбоев: если файл части отсутствует (приватный submodule `apps/domwellbes` может не быть
на диске — CI, чужая машина) или падает при импорте/старте — эта часть пропускается со строкой
в stderr, остальные части продолжают работать.

### Части и их инструменты

| Часть       | Источник                              | Инструменты (префикс)                                                                                                                              |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| studio-time | `libs/studio-time-mcp`                | `time_*` — тайм-трекер, см. [time-tracking.md](/.claude/rules/time-tracking.md)                                                                    |
| studio      | `libs/studio-mcp`                     | `studio_client_*`/`studio_project_*`/`studio_recurring_*`/`studio_invoice_*`                                                                       |
| umami       | `libs/umami-mcp`                      | `umami_*` — см. ниже                                                                                                                               |
| glitchtip   | `libs/glitchtip-mcp`                  | `glitchtip_*`                                                                                                                                      |
| deploy      | `libs/deploy-mcp`                     | `deploy_*`, `run_e2e`, `e2e_status` — см. ниже                                                                                                     |
| form        | `libs/form-mcp`                       | `list_fields`, `get_field_props`, `get_field_example`, `get_form_pattern`, `get_directives`, `generate_form` + resources `form-docs://*` + prompts |
| synth       | `apps/synth/src/mcp`                  | `load_patch`, `play_demo`, `send_midi_sequence`, `generate_chord_pattern`, `highlight_param`, `focus_section`, `dim_all`                           |
| assist      | `apps/domwellbes/src/mcp` (submodule) | `assist_*` — наставник domwellbes, см. ниже                                                                                                        |

**Переименования во внешнем списке** (внутри своих лиц имена не менялись, только то, что видит
наружу `letar`): у deploy `list_servers`/`git_status`/`agent_health` стали `deploy_list_servers`/
`deploy_git_status`/`deploy_agent_health` — были голыми именами без префикса, риск столкновения
с чужим сервером. Всё остальное уже было с уникальным префиксом.

### Наставник domwellbes: dev/prod через параметр `target`

Раньше — два отдельных stdio-процесса (`domwellbes-assist-mcp` и `domwellbes-assist-mcp-prod`),
переключение требовало почти всегда рестарта сессии (Claude Code не даёт реконнектить один
project-сервер из `.mcp.json` без рестарта всей сессии). Теперь один набор инструментов
`assist_*`, и у каждого — необязательный параметр `target: "dev" | "prod"` (по умолчанию `dev`).
Секреты (`ASSIST_MCP_SECRET`/`ASSIST_MCP_SECRET_PROD`, `ASSIST_BASE_URL`/`ASSIST_BASE_URL_PROD`)
берутся из `apps/domwellbes/.env.local` через `loadEnvCascade`, ровно как раньше. Если
`ASSIST_MCP_SECRET_PROD` не задан — `target: "prod"` в схеме инструмента просто не появляется,
недоступен только этот вариант, dev продолжает работать.

## letar-db — Postgres-сервер {#letar-db}

`.claude/mcp/letar-db.ts` + реестр `.claude/mcp/databases.json` (без секретов — только пути к
env-файлам, имена переменных, режим доступа и параметры туннеля). Три инструмента:

| Инструмент | Описание                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dbs`      | Список зарегистрированных баз: имя, режим (`rw`/`ro`), поднят ли SSH-туннель                                                                                                                                      |
| `sql`      | Выполняет SQL на указанной базе (параметр `db`) — на `ro`-базах всегда в `READ ONLY` транзакции с `ROLLBACK`, на `rw` без обёртки (нужно для `CREATE INDEX CONCURRENTLY`/`VACUUM`). Вывод обрезается до 500 строк |
| `schema`   | Без `table` — список таблиц публичной схемы; с `table` — колонки и индексы                                                                                                                                        |

### Доступные базы

| База              | Режим | БД             | Подключение                       |
| ----------------- | ----- | -------------- | --------------------------------- |
| `domwellbes`      | rw    | domwellbes     | 5444 (dev)                        |
| `studio`          | rw    | studio_dev     | 5446 (dev)                        |
| `driving-school`  | rw    | driving_school | 5432 (dev)                        |
| `kami`            | ro    | lena_kami      | 5437 (dev), `MCP_LOCAL_URL`       |
| `grandslamcup`    | ro    | grandslamcup   | 5453 (dev)                        |
| `kami-prod`       | ro    | lena_kami      | туннель 5455 → 185.28.85.195:5437 |
| `studio-prod`     | ro    | studio         | туннель 5456 → 185.28.85.185:5455 |
| `domwellbes-prod` | ro    | domwellbes     | туннель 5457 → 185.28.85.195:5456 |

`rw` = раньше `--pro restricted` (Postgres MCP Pro в режиме restricted — писать можно, DDL не
блокируется кодом; это НЕ было read-only, вопреки внешнему виду прежнего названия). `ro` = раньше
плоский `server-postgres` (каждый запрос всегда шёл в `BEGIN TRANSACTION READ ONLY`). **Запрет
записи в прод держится в коде** (`mode: "ro"` в реестре), не в разрешениях Claude Code — поэтому
`mcp__letar-db__*` можно смело держать в общем allow-листе.

**Добавить базу** — запись в `databases.json`, без рестарта сессии (реестр перечитывается на
каждый вызов `dbs`/`sql`/`schema`). Остальные БД монорепо (mandala, archetest, time,
animatrona-tracker, dashboard, form-develop) можно добавить по аналогии.

⚠️ **Хост SSH-туннеля — только литеральный IP, не `s2.letar.best`.** Под TUN-VPN хостнейм
резолвится в Fake-IP из диапазона `198.18.0.0/15`, SSH туда не доходит вовсе — тот же класс
ловушки, что [electron-net-fetch-tun-vpn](/.claude/docs/electron-net-fetch-tun-vpn.md).

⚠️ **Прод и dev легко перепутать по имени базы.** Для проверки прод-состояния использовать
только `<app>-prod`.

**Timestamp/timestamptz/date отдаются сырым текстом** (`pg.types.setTypeParser`) — закрывает
известный сдвиг TZ старых `postgres-*` MCP.

### Пример

```typescript
mcp__letar - db__sql({ db: 'domwellbes', sql: 'SELECT count(*) FROM "User"' })
mcp__letar - db__schema({ db: 'kami', table: 'Product' })
```

## Гонка распаковки `bunx @latest` {#bunx-race}

`bunx pkg@latest` использует одну общую temp-папку на все сессии
(`%LOCALAPPDATA%\Temp\bunx-<hash>-<pkg>@latest`) — при параллельном старте нескольких сессий
пакет перераспаковывается заново, и одна из сессий может подхватить процесс в момент, когда
файл рантайма ещё не на месте. Это была настоящая причина регулярных падений `next-devtools`
(`Cannot find module`/`ENOENT` на разные файлы каждый раз) — **не** отсутствие запущенного Next
dev-сервера, как можно было бы предположить. `nx-mcp@latest` подвержен тому же риску. Фикс —
закреплённая версия в `.mcp.json` (`nx-mcp@<версия>`, не `@latest`) — конкретная версия уже
лежит в кэше и не перераспаковывается. Обновлять версию вручную, когда нужно.

## Context Mode {#context-mode}

Плагин `context-mode` автоматически перехватывает вывод MCP-инструментов и сжимает его до попадания в контекст (315 KB → 5.4 KB, 98% сжатие). Работает прозрачно через хук.

```bash
/context-mode:stats   # Статистика экономии токенов за сессию
/context-mode:doctor  # Диагностика если что-то не работает
/context-mode:upgrade # Обновить плагин
```

### Инструменты для явного использования

| Инструмент              | Применение                                         |
| ----------------------- | -------------------------------------------------- |
| `execute`               | Запуск кода (10 языков) — только stdout в контекст |
| `execute_file`          | Обработка файла без загрузки содержимого           |
| `batch_execute`         | Несколько команд/запросов за один вызов            |
| `index`                 | Индексирование markdown-документов в SQLite FTS5   |
| `search(queries:[...])` | Батчевый поиск — несколько запросов сразу          |
| `fetch_and_index`       | URL → markdown → индекс                            |

Особенно полезен при: grep по большим файлам, Playwright снапшотах, анализе логов, GitHub API с длинными списками.

**Правило использования `index`:** Индекс эфемерный — живёт только в текущей сессии. Используй `index` точечно перед работой с конкретным файлом/библиотекой, потом ищи через `search`.

---

## Agent Mail MCP {#agent-mail}

HTTP MCP-сервер для координации нескольких Claude Code инстансов в монорепо. Обеспечивает обмен сообщениями, резервирование файлов и обнаружение соседних агентов.

**Upstream:** [github.com/Dicklesworthstone/mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail)\
**Docker образ:** `ghcr.io/dicklesworthstone/mcp_agent_mail:latest`\
**Compose:** `C:\web\letar\infra\agent-mail\mcp_agent_mail\compose.yaml`

### Запуск

```bash
cd C:/web/letar/infra/agent-mail/mcp_agent_mail
docker compose up -d
```

Сервер стартует на `http://127.0.0.1:8765`. Данные хранятся в SQLite внутри Docker volume `agent_mail_data`.

### Обновление

```bash
cd C:/web/letar/infra/agent-mail/mcp_agent_mail
docker compose pull && docker compose up -d
```

### После переустановки сервера / пересоздания volume

При `docker compose down -v` или переустановке хоста SQLite volume уничтожается: все проекты, агенты, сообщения и резервации теряются.

**Что нужно сделать:**

1. Каждый агент при следующем старте сессии вызывает `macro_start_session` — проект и агент создаются заново автоматически.
2. `human_key: "C:/web/letar"` остаётся стабильным идентификатором — именно по нему проект находится/создаётся.
3. Все исторические треды (темы, сообщения, inbox прошлых агентов) безвозвратно утеряны — воспринимай как чистый лист.

**Симптом что volume пересоздан:** `macro_start_session` возвращает 403 Forbidden → пробуй ещё раз после перезапуска контейнера (`docker compose up -d`).

### Основные инструменты

| Инструмент               | Описание                                               |
| ------------------------ | ------------------------------------------------------ |
| `macro_start_session`    | Регистрация агента при старте сессии                   |
| `send_message`           | Отправить сообщение другому агенту                     |
| `fetch_inbox`            | Получить входящие сообщения                            |
| `list_agents`            | Список всех активных агентов                           |
| `file_reservation_paths` | Зарезервировать файлы для эксклюзивного редактирования |

---

## Deploy (@letar/deploy-mcp) {#deploy-mcp}

Структурированный слой над REST API `dashboard-agent` для управления деплоем — деплой
через типизированные инструменты вместо сырого SSH + парсинга stdout. Полная документация:
[libs/deploy-mcp/README.md](/libs/deploy-mcp/README.md).

Внутри `letar` (см. выше). В первую очередь для **deploy-agent-dev** (deploy agent).

### Tools

| Инструмент            | Описание                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `deploy_list_servers` | Серверы + маппинг «приложение → сервер» (из `@letar/infra-config`)                                                      |
| `deploy_agent_health` | Health-check (`GET /health`) — «сервер недоступен» vs «токен неверный»                                                  |
| `deploy_git_status`   | Ветка, незапушенные/входящие коммиты — проверять перед деплоем                                                          |
| `deploy_status`       | Статус деплоя + инкрементальные логи по курсору `sinceLine`; включает `phases[]`/`stalled`                              |
| `deploy_wait`         | Long-poll вместо ручного поллинга — отпускает раньше `waitSeconds` (≤120с) при смене фазы/терминале (PLAN-INFRA.md §38) |
| `deploy_cancel`       | Отмена текущего деплоя (SIGTERM)                                                                                        |
| `deploy_app`          | Запуск деплоя (`target`: `production`\|`staging`; staging → s3) + e2e-gate                                              |
| `run_e2e`             | Playwright e2e на s3 против staging-контейнера (Фаза 2)                                                                 |
| `e2e_status`          | Статус e2e-прогона + персистентный `lastStatus` (что читает gate)                                                       |

### Соединение и секреты

- **SSH-туннель** `ssh -L <localPort>:localhost:3100 -N deploy@<host>` (s2 → 13100, s3 → 13101), поднимается лениво.
- **Bearer-токен** читается из `apps/dashboard-agent/.env.docker` (или расшифровывается из `.env.docker.enc` через `sops`) — не хранится в `.mcp.json`.
- **Диагностика:** начинай с `deploy_agent_health` — различает недоступность сервера и неверный токен.

## Umami (@letar/umami-mcp) {#umami-mcp}

Доступ к self-hosted Umami (`stats.letar.best`) через её REST API. Полная документация:
[libs/umami-mcp/README.md](/libs/umami-mcp/README.md). Внутри `letar` (см. выше).

| Инструмент                                        | Описание                                   |
| ------------------------------------------------- | ------------------------------------------ |
| `umami_list_websites`                             | Все сайты, заведённые в Umami              |
| `umami_find_website({ domain })`                  | Проверить, заведён ли домен                |
| `umami_get_website_stats({ websiteId, period? })` | Статистика сайта за период (1h/24h/7d/30d) |
| `umami_create_website({ name, domain })`          | Завести новый сайт в Umami                 |

## Form (@letar/form-mcp) {#form-mcp}

MCP для AI-ассистентов, работающих с @letar/forms и @letar/zenstack-form-plugin. Полный контекст
о 40+ field-компонентах, паттернах форм и директивах. **npm:** `@letar/form-mcp` — тот же пакет
публикуется отдельно и работает как самостоятельный сервер вне монорепо. Внутри `letar` (см. выше).

### Tools

| Инструмент          | Описание                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_fields`       | Список 40+ типов полей, фильтр по категории (text, number, date, select, special)                                                                   |
| `get_field_props`   | Пропсы и документация конкретного поля                                                                                                              |
| `get_field_example` | TSX код-пример использования поля                                                                                                                   |
| `get_form_pattern`  | Полные примеры: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action                                          |
| `get_directives`    | Описание директив zenstack-form-plugin — возвращает и основной `@meta("form.*", value)` (поле `example`), и legacy `@form.*` (поле `legacyExample`) |
| `generate_form`     | Генерация кода формы по спецификации полей                                                                                                          |

### Resources

Документация доступна через `form-docs://` URI: `fields`, `form-level`, `schema-generation`,
`offline`, `i18n`, `zenstack`, `api-reference`.

### Prompts

`create-form`, `add-field`, `migrate-form`.

## Конфигурация

Все MCP серверы настроены в `.mcp.json`:

```json
{
  "mcpServers": {
    "nx-mcp": { "command": "cmd", "args": ["/c", "bunx", "nx-mcp@0.25.0", "C:/web/letar", "--minimal", "false"] },
    "letar": { "command": "bun", "args": [".claude/mcp/letar.ts"] },
    "letar-db": { "command": "bun", "args": [".claude/mcp/letar-db.ts"] },
    "agent-mail": { "type": "http", "url": "http://127.0.0.1:8765/mcp" }
  }
}
```

После изменения `.mcp.json` требуется перезапуск Claude Code — за исключением новой базы в
`databases.json` (letar-db) или другой части в `letar`, которые подхватываются самим скриптом
без правки `.mcp.json`, но **процесс всё равно перезапускается только с новой сессией** (Claude
Code не даёт реконнектить project-сервер без рестарта).

✅ **`.mcp.json` версионируется** — в нём нет секретов: пароли БД лежат в `.env.local`/`.env.docker`
(gitignored), `databases.json` содержит только пути к этим файлам, токен деплой-агента читается
из `apps/dashboard-agent/.env.docker`. `root@185.28.85.195` для туннелей — не секрет, SSH-доступ
туда требует ключа из `~/.ssh/`.

## Смоук-проверка без Claude {#smoke}

`.claude/mcp/smoke.ts` поднимает `letar`/`letar-db` как реальный дочерний stdio-процесс и печатает
`listTools`/`listResources`/`listPrompts`:

```bash
bun .claude/mcp/smoke.ts letar
bun .claude/mcp/smoke.ts letar-db
```

`.claude/mcp/smoke-call.ts` — разовый вызов конкретного инструмента:

```bash
bun .claude/mcp/smoke-call.ts letar-db sql '{"db":"domwellbes","sql":"select 1"}'
```
