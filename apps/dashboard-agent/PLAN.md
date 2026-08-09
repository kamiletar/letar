# Dashboard Agent — План развития

## Текущая версия: 0.15.4

Легковесный агент мониторинга для удалённых серверов.

---

## В работе 🚧

| Задача                         | Статус    | Приоритет |
| ------------------------------ | --------- | --------- |
| Отправка метрик в Dashboard    | ⏳ TODO   | P1        |
| Алерты при превышении порогов  | ✅ Готово | P2        |
| WebSocket для real-time метрик | ⏳ TODO   | P3        |

**Уточнение по «Отправка метрик в Dashboard» (аудит 2026-07-30):** архитектурно это уже
частично закрыто — `dashboard` не хранит копий метрик, а тянет их с агента на лету через
`RemoteServerClient` (`apps/dashboard/src/lib/server-client/remote.ts` → `GET /api/system/*`
и т.д.), с кэшем 2-15 сек на стороне агента. Пункт остаётся TODO именно в узком смысле
«pull → push»: агент сам инициирует отправку (нужно, например, если dashboard временно
недоступен и должен получить пропущенное) — этого нет и полноценной пользы от этого без
конкретного сценария использования не выявлено. Не путать с «Алерты при превышении
порогов» ниже — та часть push-модели (агент сам уведомляет о проблеме) уже реализована.

Детали закрытых задач (Deploy MCP + staging, email-канарейка, health-check, структурированный
прогресс деплоя и т.д.) — `PLAN_COMPLETED.md`.

---

## Backlog 📋

### Интеграции

- [x] **Prometheus exporter (dashboard-agent-dev, 2026-07-30, `0.9.12 → 0.9.13`)** —
      `GET /metrics` (`lib/metrics-exporter.ts` + `routes/metrics.ts`), текстовый формат
      Prometheus exposition: CPU/память/диск(per-mount)/сеть(per-iface)/контейнеры(per-name,
      `dashboard_agent_container_up`). Тонкая обёртка над уже существующими `system.ts`/
      `docker.ts` — не дублирует сбор метрик. Авторизация — тот же Bearer `AGENT_TOKEN`
      (Prometheus поддерживает bearer token в scrape-конфиге, исключение из
      `authMiddleware` не понадобилось).
- [x] **Grafana datasource — закрыто через Prometheus exporter выше** — Grafana умеет читать
      Prometheus exposition format напрямую через встроенный Prometheus datasource, отдельный
      Grafana-специфичный эндпоинт не нужен.
- [ ] Telegraf совместимость — Telegraf тоже умеет скрейпить Prometheus exposition format
      через `inputs.prometheus` (тот же `/metrics`), отдельная реализация под него не
      выявила необходимости — закрыть, если появится конкретный сценарий с иным форматом.

Детали остальных закрытых пунктов бэклога (typecheck-фикс, self-deploy, реестр приложений,
хвосты imot/premium-rosstil, надёжность deploy-истории, cron-логи, метрики, безопасность) —
`PLAN_COMPLETED.md`.

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

**Последнее обновление:** 2026-08-09
