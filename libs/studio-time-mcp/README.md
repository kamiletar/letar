# @letar/studio-time-mcp

MCP-сервер: Claude Code агент сам пишет время работы над проектами клиентов студии, вместо
ручного трекера (§5а Фаза 11, `apps/studio/PLAN.md`).

Тонкий HTTP-слой над `/api/mcp/time/*` в studio — вся бизнес-логика (резолв ставки, отсечка
бездействия, идемпотентность) остаётся там, см. `apps/studio/src/lib/time-mcp.ts`.

## Инструменты

| Инструмент                                                        | Действие                                                                                                        | Эндпоинт studio             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `time_start({ app, description, kind?, idempotencyKey? })`        | Останавливает предыдущий активный таймер (если был) и стартует новый — резолв проекта по `repoSlug`             | `POST /api/mcp/time/start`  |
| `time_switch({ app, description, kind?, idempotencyKey? })`       | То же самое, что `time_start` — обязательный механизм смены контекста (§11.5): сессия ≠ проект                  | `POST /api/mcp/time/switch` |
| `time_stop()`                                                     | Останавливает текущий активный таймер                                                                           | `POST /api/mcp/time/stop`   |
| `time_pause()`                                                    | Останавливает таймер и помечает запись небиллируемой (`INTERNAL`) — выключатель для «копаюсь без цели» (§11.16) | `POST /api/mcp/time/pause`  |
| `time_note({ description })`                                      | Уточняет описание активной записи без остановки                                                                 | `POST /api/mcp/time/note`   |
| `time_status()`                                                   | Что идёт сейчас: проект, описание, с какого времени                                                             | `GET /api/mcp/time/status`  |
| `time_log({ app, minutes, description, kind?, idempotencyKey? })` | Запись задним числом, не трогает активный таймер                                                                | `POST /api/mcp/time/log`    |

Записи от MCP всегда `source: MCP`, `status: DRAFT` — владелец утверждает их в `/owner/time`
перед выставлением клиенту.

### Идемпотентность

`time_start`/`time_switch`/`time_log` принимают `idempotencyKey`; если не передан — генерируется
автоматически (`crypto.randomUUID()`) на стороне MCP, но тогда повтор вызова из-за ретрая создаст
новую запись. Передавай свой ключ явно, если нужна гарантия «повтор не создаст дубль».

### `lastSeenAt` — не тулы

Тулы обновляют `lastSeenAt` заодно (создают/трогают запись), но полагаться на это нельзя — основной
источник heartbeat — `.claude/hooks/time-heartbeat.js` (`PostToolUse`, вне контекста модели), не
тул. Без heartbeat зависшая сессия закроется кроном `close-stale-timers` только по своему же
`lastSeenAt`, то есть по времени последнего вызова любого тула time_*, а не по факту работы.

## Соединение и безопасность

- **Обычный HTTP fetch**, без SSH-туннеля — в отличие от `deploy-mcp`, studio API либо локальный
  dev-сервер (`http://localhost:3024` по умолчанию), либо публичный прод-домен.
- **Заголовок `X-Time-Mcp-Secret`** — `TIME_MCP_SECRET` читается из `process.env`, а если не
  задан — из `apps/studio/.env.local` (типичный случай: локальная dev-сессия). Отдельный секрет
  от `CRON_SECRET` studio: разный периметр доверия (cron — только с dashboard-agent на одном
  сервере, MCP — потенциально с любой машины разработчика).
- Для не-локального таргета (прод/staging) — переопредели `STUDIO_URL` и `TIME_MCP_SECRET` через
  `env` в `.mcp.json` (по образцу `letar-consultant`), не через `apps/studio/.env.local`.

## Диагностика

- `time_status()` — первый шаг, если непонятно, что происходит с таймером.
- «TIME_MCP_SECRET не найден» → либо `apps/studio/.env.local` не содержит переменную (dev), либо
  для не-локального `STUDIO_URL` секрет нужно задать явно через env процесса.
- «studio вернул не-JSON» / сетевая ошибка → studio dev-сервер не запущен (`nx dev studio`) или
  `STUDIO_URL` указывает не туда.
- 404 на `time_start`/`time_switch`/`time_log` — проект с таким `repoSlug` не заведён в
  `/owner/projects` studio.

## Запуск

Регистрируется в корневом `.mcp.json` как `studio-time-mcp`
(`bunx tsx libs/studio-time-mcp/src/cli.ts`), запускается из корня репозитория.
Env-override `STUDIO_TIME_MCP_REPO_ROOT` — если cwd не корень репо.

## Команды

```bash
nx test studio-time-mcp
nx lint studio-time-mcp
nx typecheck:tsgo studio-time-mcp
nx serve studio-time-mcp   # ручной запуск сервера по stdio
```

## Ограничения

- **Модель доверия процедурная**, как у `deploy-mcp`: `.mcp.json` общий для всех сессий, тулы
  вызываемы из любой сессии, работающей в этом репозитории.
- **Эвристика смены контекста в Stop-хуке (`.claude/hooks/time-stop-check.js`) best-effort** —
  сравнивает число вызовов `time_switch`/`time_start` с числом затронутых `apps/<x>/` за сессию;
  возможны ложные срабатывания (например чтение чужого приложения для справки без реальной работы
  над ним).
- **`time_pause` не отменяет уже созданную запись** — только помечает её небиллируемой; если нужно
  вообще не создавать запись, просто не вызывай `time_start`.
