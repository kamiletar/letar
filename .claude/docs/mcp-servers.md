# MCP серверы

**ВАЖНО:** Всегда используй MCP серверы для актуальной документации вместо предположений о знаниях.

## Доступные MCP серверы

| MCP Сервер                   | Пакет                                               | Назначение                                                                                      |
| ---------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **nx-mcp**                   | `nx mcp`                                            | Операции с Nx воркспейсом, проекты, таргеты, документация                                       |
| **next-devtools**            | `next-devtools-mcp`                                 | Документация Next.js 16, рантайм dev сервера, ошибки                                            |
| **chakra-ui**                | `@chakra-ui/react-mcp`                              | Компоненты Chakra UI v3, props, примеры, темизация                                              |
| **inkeepMcp**                | `mcp-remote` → `mcp.inkeep.com/zod`                 | Документация Zod v4, схемы валидации                                                            |
| **context7**                 | `@upstash/context7-mcp`                             | Документация любых библиотек (React, TanStack, etc.)                                            |
| **chrome-devtools**          | `chrome-devtools-mcp`                               | Браузерная автоматизация, скриншоты, консоль, сеть                                              |
| **form-mcp**                 | `@letar/form-mcp` (local) / `@letar/form-mcp` (npm) | 40+ field-компонентов, паттерны форм, @form.\* директивы                                        |
| **deploy-mcp**               | `@letar/deploy-mcp` (local)                         | Деплой через dashboard-agent (SSH-туннель): deploy_app, deploy_status, git_status, agent_health |
| **sequential-thinking**      | `@modelcontextprotocol/server-sequential-thinking`  | Структурированное пошаговое рассуждение для сложных задач                                       |
| **postgres-driving-school**  | `@modelcontextprotocol/server-postgres`             | SQL запросы к БД driving-school (read-only)                                                     |
| **postgres-kami**            | `@modelcontextprotocol/server-postgres`             | SQL запросы к БД kami (read-only)                                                               |
| **postgres-premium-rosstil** | `@modelcontextprotocol/server-postgres`             | SQL запросы к БД premium-rosstil (read-only)                                                    |
| **postgres-grandslamcup**    | `@modelcontextprotocol/server-postgres`             | SQL запросы к БД grandslamcup (read-only)                                                       |
| **prisma**                   | `@prisma/mcp`                                       | Работа через Prisma schema, генерация запросов                                                  |

## Воркфлоу работы с Context7

Context7 используется для получения актуальной документации любых библиотек:

1. **Используй `resolve_library_id`** чтобы найти правильный ID библиотеки

   ```typescript
   resolve_library_id({ libraryName: 'react' })
   // Результат: '/facebook/react' или '/facebook/react/v18.2.0'
   ```

2. **Используй `query_docs`** с полученным ID для получения актуальной документации

   ```typescript
   query_docs({
     libraryId: '/facebook/react',
     query: 'how to use hooks',
   })
   ```

3. **Используй документацию** для правильной реализации функций

### Context7 — поиск документации

Формат запроса к `query_docs`:

- **`libraryId`** — ID библиотеки из `resolve_library_id`
- **`query`** — конкретный вопрос или тема для поиска

## Подключение к MCP Next.js Dev Server

**ВАЖНО:** Для доступа к диагностике рантайма, ошибкам, роутам и логам работающего Next.js dev сервера:

### 1. Проверь порт в .env файле

Порт настроен в `.env` файле каждого приложения:

| Приложение      | Файл                        | Порт |
| --------------- | --------------------------- | ---- |
| premium-rosstil | `apps/premium-rosstil/.env` | 3000 |
| imot            | `apps/imot/.env`            | 3001 |
| dashboard       | `apps/dashboard/.env`       | 3002 |
| driving-school  | `apps/driving-school/.env`  | 3003 |
| mandala         | `apps/mandala/.env`         | 3004 |
| kami            | `apps/kami/.env`            | 3005 |

⚠️ **НЕ предполагай порт 3000** - всегда проверяй .env файл!

### 2. Подключайся напрямую к порту из .env

```typescript
// Используй правильный порт из .env
mcp_nextjs_runtime({
  action: 'list_tools',
  port: '3001', // Порт из .env
})
```

### 3. Автообнаружение (может не работать)

```typescript
mcp_nextjs_runtime({
  action: 'discover_servers',
})
```

Если автообнаружение не находит серверов:

1. Спроси пользователя, на каком порту запущен dev сервер
2. Вызови инструмент снова с параметром `port`

## Доступные инструменты рантайма

После подключения к Next.js MCP доступны следующие инструменты:

| Инструмент                  | Описание                                   |
| --------------------------- | ------------------------------------------ |
| **get_errors**              | Текущие ошибки (глобальные, рантайм, билд) |
| **get_routes**              | Все роуты App Router и Pages Router        |
| **get_project_metadata**    | Путь проекта, URL dev сервера              |
| **get_page_metadata**       | Метаданные рендера активной страницы       |
| **get_logs**                | Путь к лог-файлу Next.js dev               |
| **get_server_action_by_id** | Найти Server Action по ID                  |

## Когда использовать MCP инструменты рантайма

**✅ Используй MCP Next.js инструменты когда:**

- Перед реализацией изменений - проверь текущее состояние
- Отладка ошибок - получи информацию об ошибках в реальном времени
- Понимание роутов - посмотри все доступные роуты
- Исследование проблем - доступ к логам и диагностике

**❌ НЕ используй когда:**

- Нужно просто прочитать файл - используй Read
- Нужна документация Next.js - используй `next-devtools` MCP или `nextjs_docs`
- Dev сервер не запущен

## Примеры использования

### Получить ошибки из работающего приложения

```typescript
// 1. Сначала получи список инструментов
mcp_nextjs_runtime({
  action: 'list_tools',
  port: '3001',
})

// 2. Получи текущие ошибки
mcp_nextjs_runtime({
  action: 'get_errors',
  port: '3001',
})
```

### Получить документацию Zod v4

```typescript
// Используй inkeepMcp
ask_question_about_zod_v4({
  query: 'How to use z.object with optional fields?',
})
```

### Получить документацию Chakra UI компонента

```typescript
// Получить свойства компонента
get_component_props({ component: 'Button' })

// Получить примеры использования
get_component_example({ component: 'Button' })
```

### Получить документацию любой библиотеки

```typescript
// 1. Найти ID библиотеки
resolve_library_id({ libraryName: 'framer-motion' })

// 2. Получить документацию
query_docs({
  libraryId: '/framer-motion/motion',
  query: 'animations',
})
```

## Требования

### Next.js MCP

- **Версия Next.js:** 16 или выше (MCP поддержка добавлена в v16)
- **Dev сервер:** Должен быть запущен
- **Порт:** Указан в `.env` файле приложения

⚠️ Если используешь Next.js 15 или ниже - сначала обнови до Next.js 16.

### Другие MCP серверы

- Настроены в `.mcp.json` в корне проекта
- Запускаются через `bunx` при старте Claude Code
- Доступны после перезапуска CLI

---

## Chrome DevTools MCP

Браузерная автоматизация через Chrome DevTools Protocol. Позволяет управлять браузером, делать скриншоты, анализировать сеть и консоль.

### Инструменты

| Инструмент              | Описание                                   |
| ----------------------- | ------------------------------------------ |
| `take_screenshot`       | Сделать скриншот страницы                  |
| `take_snapshot`         | Получить DOM snapshot (accessibility tree) |
| `navigate_page`         | Перейти на URL                             |
| `click`                 | Клик по элементу                           |
| `fill`                  | Заполнить input                            |
| `fill_form`             | Заполнить форму несколькими полями         |
| `hover`                 | Навести курсор на элемент                  |
| `press_key`             | Нажать клавишу                             |
| `evaluate_script`       | Выполнить JavaScript в контексте страницы  |
| `list_console_messages` | Получить сообщения консоли                 |
| `list_network_requests` | Получить сетевые запросы                   |
| `emulate`               | Эмуляция устройства (mobile, tablet)       |
| `handle_dialog`         | Обработать alert/confirm/prompt            |

### Когда использовать

- **E2E тестирование** — проверка UI после изменений
- **Отладка** — скриншоты проблемных состояний
- **Анализ сети** — проверка API запросов
- **Автоматизация** — заполнение форм, клики

### Пример

```typescript
// Сделать скриншот страницы
take_screenshot({ url: 'http://localhost:3000/login' })

// Заполнить форму логина
fill_form({
  url: 'http://localhost:3000/login',
  fields: [
    { selector: 'input[name="email"]', value: 'test@example.com' },
    { selector: 'input[name="password"]', value: 'password123' },
  ],
})

// Проверить консоль на ошибки
list_console_messages({ url: 'http://localhost:3000' })
```

---

## Form MCP (@letar/form-mcp)

MCP сервер для AI-ассистентов, работающих с @letar/forms и @letar/zenstack-form-plugin. Предоставляет полный контекст о 40+ field-компонентах, паттернах форм и директивах.

**npm:** `@letar/form-mcp` | **Локально:** `libs/form-mcp/`

### Tools

| Инструмент          | Описание                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `list_fields`       | Список 40+ типов полей, фильтр по категории (text, number, date, select, special)                          |
| `get_field_props`   | Пропсы и документация конкретного поля                                                                     |
| `get_field_example` | TSX код-пример использования поля                                                                          |
| `get_form_pattern`  | Полные примеры: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action |
| `get_directives`    | Описание @form.\* директив zenstack-form-plugin                                                            |
| `generate_form`     | Генерация кода формы по спецификации полей                                                                 |

### Resources

Документация доступна через `form-docs://` URI:

- `form-docs://fields` — 40+ field-компонентов
- `form-docs://form-level` — Steps, When, Errors, DirtyGuard
- `form-docs://schema-generation` — FromSchema, AutoFields, Builder
- `form-docs://offline` — useOfflineForm, sync queue
- `form-docs://i18n` — FormI18nProvider, локализация
- `form-docs://zenstack` — @form.\* директивы, генерация из schema.zmodel
- `form-docs://api-reference` — Hooks, contexts, типы

### Prompts

- `create-form` — шаблон CRUD формы
- `add-field` — добавление поля
- `migrate-form` — миграция с RHF/Formik/Conform

### Пример

```typescript
// Получить все числовые поля
list_fields({ category: 'number' })

// Получить пример CRUD формы
get_form_pattern({ pattern: 'crud-create' })

// Сгенерировать форму
generate_form({
  fields: [
    { name: 'title', type: 'String', label: 'Заголовок', required: true },
    { name: 'price', type: 'Currency', label: 'Цена' },
  ],
  formName: 'ProductForm',
})
```

---

## Sequential Thinking MCP

Структурированное пошаговое рассуждение для сложных задач. Помогает разбить проблему на шаги и отслеживать ход мысли.

### Инструменты

| Инструмент                | Описание                                 |
| ------------------------- | ---------------------------------------- |
| `create_thinking_session` | Начать новую сессию рассуждения          |
| `add_thought`             | Добавить шаг рассуждения                 |
| `revise_thought`          | Пересмотреть предыдущий шаг              |
| `branch_thought`          | Создать альтернативную ветку рассуждения |
| `get_thinking_summary`    | Получить резюме всех шагов               |

### Когда использовать

- **Архитектурные решения** — взвешивание альтернатив
- **Отладка сложных багов** — пошаговый анализ
- **Планирование фич** — разбиение на подзадачи
- **Code review** — структурированный анализ

### Пример

```typescript
// Начать анализ архитектуры
create_thinking_session({
  topic: 'Выбор стратегии кеширования для API',
})

// Добавить шаги рассуждения
add_thought({
  thought: 'Текущая проблема: API отвечает медленно при высокой нагрузке',
  thought_type: 'observation',
})

add_thought({
  thought: 'Вариант 1: Redis кеш — быстро, но требует инфраструктуры',
  thought_type: 'hypothesis',
})

add_thought({
  thought: 'Вариант 2: In-memory кеш — просто, но не масштабируется',
  thought_type: 'hypothesis',
})

// Получить резюме
get_thinking_summary()
```

---

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

**Правило использования `index`:** Индекс эфемерный — живёт только в текущей сессии. Не нужно индексировать всю документацию заранее. Используй `index` точечно: перед работой с конкретным файлом/библиотекой, чтобы потом искать по нему через `search`. Например: проиндексировал `libs/forms/README.md` → работаешь с формами → ищешь нужное через `search(queries: [...])` без перечитывания файла.

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

### История

Изначально был форк upstream с переходом на PostgreSQL (из-за SQLite deadlock на Windows при конкурентных MCP-соединениях). Upstream выпустил v0.3.4 с фиксами, а также опубликовал готовый Docker-образ на GHCR — поэтому вернулись на оригинальный образ + SQLite (2026-06-18).

### После переустановки сервера / пересоздания volume

При `docker compose down -v` или переустановке хоста SQLite volume уничтожается: все проекты, агенты, сообщения и резервации теряются.

**Что нужно сделать:**

1. Каждый агент при следующем старте сессии вызывает `macro_start_session` — проект и агент создаются заново автоматически.
2. `human_key: "C:/web/letar"` остаётся стабильным идентификатором — именно по нему проект находится/создаётся.
3. **Slug проекта может измениться** (например `c-web-letar` → `c-web-letar`) — это нормально, routing идёт по `project_id`, не по slug. Не нужно исправлять старые конфиги.
4. Все исторические треды (темы, сообщения, inbox прошлых агентов) безвозвратно утеряны — воспринимай как чистый лист.

**Симптом что volume пересоздан:** `macro_start_session` возвращает 403 Forbidden → пробуй ещё раз после перезапуска контейнера (`docker compose up -d`).

### Основные инструменты

| Инструмент               | Описание                                               |
| ------------------------ | ------------------------------------------------------ |
| `macro_start_session`    | Регистрация агента при старте сессии                   |
| `send_message`           | Отправить сообщение другому агенту                     |
| `fetch_inbox`            | Получить входящие сообщения                            |
| `list_agents`            | Список всех активных агентов                           |
| `file_reservation_paths` | Зарезервировать файлы для эксклюзивного редактирования |

### Воркфлоу

1. Запустить контейнер (`docker compose up -d`)
2. При старте сессии вызвать `macro_start_session` с `human_key: "C:/web/letar"`, `program: "claude-code"` и описанием задачи
3. Зарезервировать файлы через `file_reservation_paths`
4. Периодически проверять `fetch_inbox` для входящих
5. Отправлять сообщения через `send_message` для координации

---

## PostgreSQL MCP (server-postgres)

Прямые SQL запросы к локальным базам данных. Read-only по умолчанию — безопасно для исследования данных.

### Доступные БД

| MCP сервер                 | БД             | Порт |
| -------------------------- | -------------- | ---- |
| `postgres-driving-school`  | driving_school | 5432 |
| `postgres-kami`            | kami           | 5432 |
| `postgres-premium-rosstil` | lena_premium   | 5432 |
| `postgres-grandslamcup`    | grandslamcup   | 5453 |

Остальные БД (imot, mandala, archetest, time, animatrona-tracker, dashboard, form-develop) можно добавить в `.mcp.json` по аналогии.

### Пример

```typescript
// Посмотреть количество пользователей
mcp__postgres_driving_school__query({
  sql: 'SELECT count(*) FROM "User"',
})

// Посмотреть структуру таблицы
mcp__postgres_kami__query({
  sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Product'",
})
```

---

## Prisma MCP

Работа с Prisma schema — генерация запросов, анализ моделей, помощь с миграциями.

### Пример

```typescript
// Получить информацию о schema
mcp__prisma__getDatabaseModels()
```

---

## Конфигурация

Все MCP серверы настроены в `.mcp.json`:

```json
{
  "mcpServers": {
    "nx-mcp": { "command": "bunx", "args": ["nx", "mcp"] },
    "chakra-ui": { "command": "bunx", "args": ["@chakra-ui/react-mcp"] },
    "sequential-thinking": {
      "command": "bunx",
      "args": ["@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

После изменения `.mcp.json` требуется перезапуск Claude Code.

## Deploy MCP (@letar/deploy-mcp)

Структурированный слой над REST API `dashboard-agent` для управления деплоем — деплой
через типизированные инструменты вместо сырого SSH + парсинга stdout. Тонкие HTTP-обёртки
поверх уже существующего API агента, через SSH-туннель. Полная документация:
[libs/deploy-mcp/README.md](/libs/deploy-mcp/README.md).

**Локально:** `libs/deploy-mcp/` | В первую очередь для **BlackCove** (deploy agent).

### Tools

| Инструмент      | Описание                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `list_servers`  | Серверы + маппинг «приложение → сервер» (из `@letar/infra-config`)                                                      |
| `agent_health`  | Health-check (`GET /health`) — «сервер недоступен» vs «токен неверный»                                                  |
| `git_status`    | Ветка, незапушенные/входящие коммиты — проверять перед деплоем                                                          |
| `deploy_status` | Статус деплоя + инкрементальные логи по курсору `sinceLine`; включает `phases[]`/`stalled`                              |
| `deploy_wait`   | Long-poll вместо ручного поллинга — отпускает раньше `waitSeconds` (≤120с) при смене фазы/терминале (PLAN-INFRA.md §38) |
| `deploy_cancel` | Отмена текущего деплоя (SIGTERM)                                                                                        |
| `deploy_app`    | Запуск деплоя (`target`: `production`\|`staging`; staging → s3) + e2e-gate                                              |
| `run_e2e`       | Playwright e2e на s3 против staging-контейнера (Фаза 2)                                                                 |
| `e2e_status`    | Статус e2e-прогона + персистентный `lastStatus` (что читает gate)                                                       |

### Соединение и секреты

- **SSH-туннель** `ssh -L <localPort>:localhost:3100 -N deploy@<host>` (s2 → 13100, s3 → 13101),
  поднимается лениво. Порт агента 3100 не обязан быть открыт в интернет.
- **Bearer-токен** читается из `apps/dashboard-agent/.env.docker` (или расшифровывается из
  `.env.docker.enc` через `sops`) — не хранится в `.mcp.json`. s3 — отдельный `AGENT_TOKEN_S3`.
- **Диагностика:** начинай с `agent_health` — различает недоступность сервера и неверный токен.

### Ограничения

- Модель доверия процедурная (см. [deploy-coordination](/.claude/rules/deploy-coordination.md)) —
  деплоит только BlackCove по конвенции, технического ограничения по вызывающему нет.
- Полный список инструментов, воркфлоу и e2e-gate — [libs/deploy-mcp/README.md](/libs/deploy-mcp/README.md).
