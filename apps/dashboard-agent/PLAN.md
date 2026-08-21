# Dashboard Agent — План развития

## Текущая версия: 0.15.13

Легковесный агент мониторинга для удалённых серверов.

---

## В работе 🚧

| Задача                                                       | Статус                            | Приоритет |
| ------------------------------------------------------------ | --------------------------------- | --------- |
| Отправка метрик в Dashboard                                  | ⏳ TODO                           | P1        |
| Алерты при превышении порогов                                | ✅ Готово                         | P2        |
| WebSocket для real-time метрик                               | ⏳ TODO                           | P3        |
| Автоматическая чистка Docker (dangling-образы + builder-кэш) | ✅ Готово (2026-08-14, `0.15.10`) | P1        |

**Автоматическая чистка Docker (2026-08-14):** диск s2 дошёл до 91% — причина в
`deploy-affected.sh`, чей ретеншн SHA-тегов только снимает тег, не удаляя слои под ним; они
копились как dangling-образы неограниченно. Закрыто новой ежедневной cron-задачей
`docker-prune` (`lib/docker-prune.ts`) — безопасный `pruneImages`/`pruneBuilder` без `-a`,
не трогает тегированные rollback-образы. Заодно исправлен баг дедупа `DISK_HIGH` в
`health-check.ts` — алерты группировались по точке монтирования, а не по устройству, из-за
чего один переполненный диск давал до двух десятков одинаковых уведомлений (bind-mount'ы
Docker в контейнер агента). Детали — `CHANGELOG.md` 0.15.9/0.15.10.

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
