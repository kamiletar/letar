# Dashboard Agent — План развития

## Текущая версия: 0.16.3

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
| Синтетическая канареечная проверка входа (30 мин, 9 приложений)         | ✅ Готово (2026-08-31, `0.15.30`) | P1        |
| Per-app канарейка доставки email domwellbes (реальный SMTP приложения)  | ✅ Готово (2026-09-06, `0.16.1`)  | P2        |
| Гонка старта: rehydrate из Redis до готовности клиента                  | ✅ Готово (2026-09-06, `0.16.3`)  | P1        |
| Плановая чистка `.nx/cache` в host-чекауте (s2+s3, 2 дня idle)          | ✅ Готово (2026-09-06, `0.16.2`)  | P1        |

**Плановая чистка `.nx/cache` (2026-09-06, `0.16.2`):** найдена при разборе инцидента «диск s2
100%». Ручной `docker image prune -a -f` снял острую фазу, но `docker system df` после него
показывал images+build cache+volumes всего ~32GB — а `df -h /` держал 95%. `du -h --max-depth=1 /`
указал на `/home/deploy/letar/.nx/cache`: 64GB, больше, чем весь Docker вместе взятый, и для
него не было вообще никакой чистки (ни `docker-prune`, ни `next-cache-cleanup` его не касаются —
это отдельный каталог, память результатов задач Nx). Новая cron-задача
`nx-cache-cleanup-s2`/`-s3` (`lib/nx-cache-cleanup.ts`, `40 4 * * *`) удаляет записи
`.nx/cache/<hash>` старше `NX_CACHE_CLEANUP_DAYS` (2 дня по умолчанию, тот же порог, что у
`.next/cache`). Экстренно почищено вручную на s2 в момент инцидента: диск 95% → 77%. Разбор —
`.claude/docs/docker-prune-cold-layer-network-flake.md` (раздел «Дополнение 2026-09-06»).
Задеплоено на прод (deploy-agent-dev, коммит `c8e18e3c`), задачи подтверждённо запланированы
(`[Cron] Запланирована: Nx Cache Cleanup (s2) - 40 4 * * *`).

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
**Per-app канарейка доставки email domwellbes (2026-09-06, `0.16.1`):** обнаружено при разборе
жалобы пользователя на логин 05.09.2026, что ящик `canary-domwellbes@letar.best` (email
логин-канарейки domwellbes) не существовал — провижининг 28.08.2026 бился `501 5.1.1 User does
not exist` (фикс инфраструктуры — `.claude/docs/maddy-creds-create-missing-imap-acct.md`, у
Maddy `creds create` и `imap-acct create` — два независимых шага). Раз ящик уже заведён и
проверен round-trip'ом вручную — оформлено в постоянную cron-задачу
`domwellbes-email-canary-check` (`15 * * * *`, `lib/domwellbes-email-canary.ts`): в отличие от
общей `email-canary-check` (технический ящик `canary@letar.best`), эта шлёт через РЕАЛЬНЫЙ
SMTP-аккаунт приложения (`getAppSmtpConfig('domwellbes')` — новая функция в `app-secrets.ts`,
читает уже смонтированный `/secrets/domwellbes.env`) — так проверяется именно то, что может
сломаться у самого приложения (SMTP-реквизиты, DKIM домена `domwellbes.ru`), а не общая
инфраструктура Maddy. IMAP-проверка переиспользует `waitForCanaryMessage` (экспортирован из
`email-canary.ts`). Секрет — `DOMWELLBES_EMAIL_CANARY_IMAP_PASSWORD` в
`apps/dashboard-agent/.env.docker.enc` (пароль служебного ящика, не SMTP domwellbes — тот уже
доступен агенту через смонтированный `/secrets/domwellbes.env`).

Провижининг самих аккаунтов — одноразовый `POST /api/admin/login-canary-setup`
(`lib/login-canary-setup.ts`): регистрирует через собственный `/api/auth/sign-up/email`
приложения (пароль хешируется его алгоритмом, включая bcrypt driving-school), затем снимает
`emailVerified` напрямую в БД. Живая проверка логики (7 тестов `login-canary.spec.ts`): смоделирован
провал sign-in (HTTP 401/500 и сетевая ошибка) — алерт срабатывает на 2-й подряд неудаче,
повторяется на 4-й (удвоение), молчит на 3-й, сбрасывается после чистого прогона. ⚠️
**✅ Закрыто (2026-08-31, `0.15.30`):** реальные канареечные аккаунты созданы во всех 9
production-БД через `/api/admin/login-canary-setup`, пароли сгенерированы и добавлены в
`apps/dashboard/.env.docker.enc` через sops (реестр `LOGIN_CANARY_<APP>_EMAIL`/`_PASSWORD`),
`dashboard` и `dashboard-agent` передеплоены. Живая проверка сквозной цепочки (не только unit-
тестов): `emailVerified` временно сброшен на канареечном аккаунте `dsperevod`, два подряд
ручных вызова `/api/cron/login-canary-check` дали `403 EMAIL_NOT_VERIFIED` → `consecutiveFailures:
2` → `alerted: true`, алерт `AUTH_LOGIN_CANARY_FAILED` подтверждённо дошёл до Telegram (не только
до `postDashboardAlert` — визуально проверено получателем). Флаг возвращён, состояние сброшено
чистым прогоном.

**Фикс провижининга (2026-08-28, `0.15.28`):** первый прогон `/api/admin/login-canary-setup` по
всем 9 приложениям вскрыл три бага. (1) `auth-hub`/`animatrona-tracker` не имели порта/хоста в
`server-config.ts` — добавлены (rollout-профиль, внутренний порт фиксирован на `3010`). (2) 6 из
оставшихся 7 падали на CSRF-проверке better-auth — сервер не слал заголовок `Origin`, часть
приложений отвечала чистым `403 MISSING_OR_NULL_ORIGIN`, mandala (без явного `trustedOrigins` в
конфиге) — необработанным исключением, HTTP 500 с пустым телом. Фикс — `getAppOrigin()` в
`app-secrets.ts` читает `BETTER_AUTH_URL` из уже смонтированного `/secrets/<app>.env` и оба
вызова (`login-canary.ts` sign-in, `login-canary-setup.ts` sign-up) шлют его как `Origin`; без
хардкода доменов — 3 из 9 приложений приватные submodule, их домен нельзя писать литералом в
публичный код (`public-repo-hygiene.md`). (3) `driving-school` падает отдельно и НЕ этим фиксом
не лечится: `BetterAuthError: Model rateLimit does not exist in the database` — в
`schema.zmodel` нет модели `rateLimit`, а `createAuth()` в проде без `secondaryStorage`
требует rate-limit именно в БД (подтверждено GlitchTip, issue `DRIVING-SCHOOL-2`). Заведена
отдельная задача — реальный прод-баг, не входит в scope этой сессии (уже закрыт: driving-school
задеплоен с миграцией `20260828182655_add_rate_limit_model`).

**Фикс регистра имени таблицы (2026-08-28, `0.15.29`):** после деплоя `0.15.28` прогон по всем
9 приложениям дал `signUpOk: true` везде, но `emailVerifiedSet: false` с
`relation "user" does not exist` — `markEmailVerified()` обращался к `"user"` (нижний регистр),
реальное имя таблицы (ZenStack/Prisma без `@@map`) — `"User"`. Исправлено. Заодно найден ещё один
самостоятельный прод-баг — **mandala** передаёт ZenStack ORM-клиент (kysely) напрямую в
`prismaAdapter()` better-auth вместо нативного `PrismaClient` (задокументированная в
`apps/dashboard/src/lib/prisma.ts` несовместимость) — email/password вход там, вероятно, сломан
для реальных пользователей, не только для канарейки. Заведена отдельная задача, не в scope
этой сессии.

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

**Гонка старта: восстановление из Redis до готовности клиента (2026-09-06, `0.16.3`):**
воспроизведено на s2 при деплое `c8e18e3c3` — обе функции восстановления состояния писали в лог
`Stream isn't writeable and enableOfflineQueue options is false` и продолжали с пустым состоянием.
Причина не в Redis и не в `enableOfflineQueue`, а в **окне между созданием клиента и его
готовностью**: `createRedisClient` работает с `lazyConnect: true` и вызывает `connect()` не
дожидаясь результата, поэтому `getRedis()` отдаёт клиент со статусом `connecting`, а команда,
отправленная в этот момент, отклоняется немедленно. Обе функции восстановления вызываются на
старте процесса — то есть ровно в этом окне.

⚠️ **Форма отказа была тихой и необратимой.** `try/catch` ошибку ловил и логировал, поэтому агент
выглядел здоровым; повторной попытки не было, а первый же новый персист затирал индекс в Redis —
история за прошлые деплои и логи cron терялись безвозвратно. Заметно это стало по вторичному
симптому: dashboard-agent деплоит сам себя, и после self-deploy `deploy_status` через deploy-mcp
отвечал `Deploy <id> not found in history`, затем `No deploys yet` — статус собственного деплоя
приходилось добивать через SSH (`docker ps`, `docker logs`).

Фикс — `getRedisWhenReady()` в `lib/redis.ts`: ждёт событие `ready` (досрочный выход по `end`),
ограничен `REDIS_READY_TIMEOUT_MS = 3000`. Офлайн-очередь ioredis **не возвращена** — предыдущий
фикс (2026-08-08, `lib/with-timeout.ts`) менял бесконечное зависание на быстрый отказ, и это
по-прежнему верный размен; недостающей была не очередь, а порядок: не отправлять команду до
готовности. Заодно `rehydrateExecutionLogsFromRedis()` в `index.ts` получила границу по времени,
которой у неё не было вовсе — вызов стоит внутри `try/catch` с `process.exit(1)`.

Проверено вживую, а не только юнит-тестами: при недоступном Redis старт занимает 3.0с и не
блокируется дальше, предупреждение печатается один раз; на живом Redis в одном процессе старый
путь воспроизводит ровно прод-ошибку, новый за 13мс восстанавливает историю (включая пометку
`interrupted` у записи, застигнутой в `running`) и логи cron.

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

- [ ] ⚠️ Открытый вопрос: распространить per-app канарейку доставки email (2026-09-06, по
      образцу `domwellbes-email-canary-check`) на другие приложения с собственным SMTP? У
      dashboard-agent уже смонтированы `/secrets/<app>.env` для 15 приложений — добавить проверку
      для любого из них дёшево (`getAppSmtpConfig` уже написан, `waitForCanaryMessage`
      переиспользуем), но каждая новая проверка — новый служебный ящик на Maddy (`creds create` +
      `imap-acct create`) и новый секрет в `.env.docker.enc`. Не решалось владельцем — заведено
      под конкретный домовельбесовский инцидент, не как общая инициатива. Кандидаты, у которых
      есть свой SMTP (не через общий `noreply@letar.best`): dsperevod (уже свой
      `email-health-check`, другой транспорт — Яндекс, не Maddy), driving-school, aboi, svoichuzhie.

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

**Последнее обновление:** 2026-09-04
