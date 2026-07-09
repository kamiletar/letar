# Dashboard Agent — План развития

## Текущая версия: 0.4.0

Легковесный агент мониторинга для удалённых серверов.

---

## Реализовано ✅

- [x] Fastify HTTP сервер
- [x] Сбор системных метрик (systeminformation)
- [x] Мониторинг Docker контейнеров (dockerode)
- [x] Мониторинг PostgreSQL баз
- [x] REST API для метрик
- [x] CORS для Dashboard

---

## В работе 🚧

### Deploy MCP + staging (корневой PLAN.md §18, сессия №49 2026-07-09)

Часть работ §18, относящаяся к dashboard-agent:

- [x] `routes/deploy.ts`: deployId (randomUUID) + ring-buffer истории (20 деплоев) + cap логов (2000 строк) + курсор `sinceLine` + `GET /api/deploy/history` + `staging` в body + spawn аргументами без `bash -c` — **сделано, не закоммичено**
- [x] `lib/server-config.ts`: s1 убран (сервер выведен 2026-06-20), тип `'s2' | 's3'`, fallback s2 — **сделано, не закоммичено**
- [x] `lib/cron.ts`: удалены две мёртвые задачи `server: 's1'` — **сделано, не закоммичено**
- [ ] Серверный guard: s3 принимает только `staging: true`, s2 — только production (сессия B)
- [ ] Переход на `@letar/infra-config` вместо локального server-config (сессия B)
- [ ] `docker-compose.s3.yml`: SERVER_NAME s3, без прод-секретов `/secrets/*.env`, отдельный AGENT_TOKEN (сессия B)
- [ ] Консолидация `docker-compose.production.yml` vs `docker-compose.s2.yml` — оба указывают SERVER_NAME s2; выяснить у BlackCove, какой живой (сессия B)
- [ ] Роут `routes/e2e.ts`: `POST /api/e2e/run` (nx e2e с E2E_BASE_URL против staging), `GET /api/e2e/status`, запись `.last-e2e-status/<app>.json` (сессия D)

⚠️ На s2 крутится старая версия deploy API (без deployId) — передеплой dashboard-agent через BlackCove нужен до перевода BlackCove на deploy-mcp.

| Задача                         | Статус  | Приоритет |
| ------------------------------ | ------- | --------- |
| Отправка метрик в Dashboard    | ⏳ TODO | P1        |
| Алерты при превышении порогов  | ⏳ TODO | P2        |
| WebSocket для real-time метрик | ⏳ TODO | P3        |

---

## Backlog 📋

### Улучшения сбора метрик

- [ ] Мониторинг сетевого трафика
- [ ] Мониторинг логов контейнеров
- [ ] История метрик (локальный буфер)
- [ ] Агрегация за интервалы

### Безопасность

- [ ] API токен авторизация
- [ ] Rate limiting
- [ ] Whitelist IP адресов

### Интеграции

- [ ] Prometheus exporter
- [ ] Telegraf совместимость
- [ ] Grafana datasource

---

## Команды разработки

```bash
# Разработка (watch mode)
nx dev dashboard-agent

# Сборка
nx build dashboard-agent

# Запуск
nx start dashboard-agent

# Проверки
nx lint dashboard-agent
nx typecheck dashboard-agent
```

---

**Последнее обновление:** 2026-02-02
