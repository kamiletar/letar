# Dashboard Agent — План развития

## Текущая версия: 0.15.27

Легковесный агент мониторинга для удалённых серверов.

---

## В работе 🚧

| Задача                                                                  | Статус                            | Приоритет |
| ----------------------------------------------------------------------- | --------------------------------- | --------- |
| Отправка метрик в Dashboard                                             | ⏳ TODO                           | P1        |
| Алерты при превышении порогов                                           | ✅ Готово                         | P2        |
| WebSocket для real-time метрик                                          | ⏳ TODO                           | P3        |
| Автоматическая чистка Docker (dangling-образы + builder-кэш)            | ✅ Готово (2026-08-14, `0.15.10`) | P1        |
| Плановая остановка простаивающих staging-контейнеров (s3, 24ч idle)     | ✅ Готово (2026-08-28, `0.15.18`) | P1        |
| Плановая чистка `.next/cache` в host-чекауте (s2+s3, 2 дня idle)        | ✅ Готово (2026-08-28, `0.15.19`) | P1        |
| Ежедневная проверка `Account.issuer = NULL` (better-auth 1.7 регрессия) | ✅ Готово (2026-08-28, `0.15.20`) | P1        |
| Синтетическая канареечная проверка входа (30 мин, 9 приложений)         | ✅ Готово (2026-08-28, `0.15.27`) | P1        |

**Синтетическая канареечная проверка входа (2026-08-28, PLAN.md корня §71 п.3.3):** дополняет
`account-issuer-null-check` (ловит один конкретный класс регрессии) — эта проверка ловит ЛЮБУЮ
поломку входа тем же способом, каким её обнаружил бы реальный пользователь. Новая cron-задача
`login-canary-check` (каждые 30 минут, `lib/login-canary.ts`) шлёт POST `/api/auth/sign-in/email`
канареечными учётными данными на 9 приложений с реальным credential-входом (не все 14 из
issuer-фикса — часть входит только через OIDC Ключницы, `mode: 'hub-client'`, часть только через
другой OAuth): aboi, domwellbes, mandala, animatrona-tracker, dashboard, auth-hub, driving-school,
svoichuzhie, dsperevod. Алерт `AUTH_LOGIN_CANARY_FAILED` при HTTP-ответе, отличном от 200, — тот
же паттерн порога/повтора через удвоение, что у `email-canary.ts` (порог 2 подряд-неудачи).
Учётные данные канареечных аккаунтов — реестр `LOGIN_CANARY_<APP>_EMAIL`/`_PASSWORD` в
`apps/dashboard/.env.docker.enc` (все 9 приложений уже были смонтированы в
`docker-compose.production.yml` для `database.ts` — новых mount'ов не потребовалось).
Провижининг самих аккаунтов — одноразовый `POST /api/admin/login-canary-setup`
(`lib/login-canary-setup.ts`): регистрирует через собственный `/api/auth/sign-up/email`
приложения (пароль хешируется его алгоритмом, включая bcrypt driving-school), затем снимает
`emailVerified` напрямую в БД. Живая проверка логики (7 тестов `login-canary.spec.ts`): смоделирован
провал sign-in (HTTP 401/500 и сетевая ошибка) — алерт срабатывает на 2-й подряд неудаче,
повторяется на 4-й (удвоение), молчит на 3-й, сбрасывается после чистого прогона. ⚠️
**Открытый вопрос:** реальные канареечные аккаунты в 9 production-БД ещё не созданы — это
отдельный ручной шаг после деплоя (сгенерировать пароли, вызвать `/api/admin/login-canary-setup`
на каждое приложение, положить credentials в `.env.docker.enc` через sops), не выполнялся из
этой сессии — создание учётных записей в 9 живых production-БД требует явной координации,
не автономного действия агента.

**Проверка `Account.issuer = NULL` (2026-08-28):** дополняет статический гейт схемы
(`scripts/check-better-auth-schema.mjs`, PLAN.md корня §71 п.3.1) — тот ловит только «поля нет
в schema.zmodel», не ловит «поле есть, но кто-то один раз вставил NULL». Новая cron-задача
`account-issuer-null-check` (04:00 s2, `lib/account-issuer-check.ts`) подключается напрямую к
БД каждого из 14 приложений с моделью Account (те же данные, что и `database.ts` для бэкапов —
`domwellbes` пришлось туда же добавить, раньше отсутствовал в `APP_CONFIG`) и шлёт
`AUTH_ACCOUNT_ISSUER_NULL` в dashboard при первой же найденной строке, с тем же паттерном
повтора через удвоение, что у `backup-freshness.ts` (§62).

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

**Обобщение ApiResponse-обвязки роутов (2026-08-28, `0.15.22`):** после выноса `defineCronRoute`
(см. `0.15.21` ниже) тот же `try/catch → ApiResponse<T>` найден ещё в ~30 GET/POST-хендлерах
10 файлов `routes/`. Обобщён только «чистый» вариант (единственный вызов, без ранних return'ов,
success/error из факта исключения) — `apiHandler<T>` в `lib/api-handler.ts`, применён к 27
хендлерам. Хендлеры с валидацией до вызова (early-return `{success:false}` без throw) и с
success/error, вычисляемым из полей результата, оставлены как есть — обобщение туда потеряло бы
читаемость ради спорной экономии строк; `deploy.ts` не тронут вообще (там try/catch — меньшая
часть логики хендлера). Детали — `CHANGELOG.md` 0.15.22.

**Общий `errorResponse<T>()` для early-return/catch литерала (2026-08-28, `0.15.23`):**
компаньон `apiHandler<T>()` выше — обобщён оставшийся литерал
`{success:false, error, timestamp: new Date().toISOString()}` из ранних return'ов валидации
и catch-блоков, не подошедших под `apiHandler` целиком. 56 мест в тех же 10 файлах `routes/`
(`deploy.ts` 20, `cron.ts` 10, `e2e.ts` 9, `env.ts` 6, `docker.ts` 5, `database.ts` 2,
`traefik.ts`/`nginx.ts`/`git.ts`/`acme-dns.ts` по 1) заменены на `errorResponse(error)` из
`lib/api-handler.ts`. Control flow хендлеров не менялся — только сам литерал. Детали —
`CHANGELOG.md` 0.15.23.

**Декомпозиция `routes/deploy.ts` (2026-08-28, `0.15.24`):** после двух сессий выше файл
оставался 927 строк — в нём смешаны заботы, которые не про сами HTTP-роуты: Redis-персистентность
истории деплоев, ring-buffer + long-poll `EventEmitter`, жизненный цикл `nsenter`-процесса.
Вынесены в `lib/deploy-history.ts`, `lib/deploy-history-redis.ts`, `lib/deploy-process.ts` —
`routes/deploy.ts` (659 строк) теперь только регистрация роутов и вызовы этих модулей. Логика
не менялась. Детали — `CHANGELOG.md` 0.15.24.

⚠️ **Исправление (2026-08-28, `0.15.26`):** запись выше про `errorResponse<T>()` (`0.15.23`)
указывала «`deploy.ts` (20)» как уже сделанное — по факту файл не был тронут, 20 литералов
`{success:false, error, timestamp}` оставались руками собранными. Применено сейчас, отдельным
проходом. Детали — `CHANGELOG.md` 0.15.26.

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

**Последнее обновление:** 2026-08-22
