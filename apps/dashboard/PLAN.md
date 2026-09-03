# План развития Dashboard

> **Версия:** 1.26.0
> **Последнее обновление:** 2026-09-03

---

## Текущие возможности

- Мониторинг системы (CPU, RAM, диск)
- Управление Docker контейнерами
- Деплой приложений
- Управление базами данных и бэкапами
- Система алертов с Telegram
- Audit logging
- Управление Cron-задачами
- Optimistic UI для Docker контейнеров
- Optimistic UI для Settings
- Optimistic UI для уведомлений (NotificationsPopover)
- Optimistic UI для создания бэкапов
- Управление Nginx Proxy Manager (proxy hosts, сертификаты, access lists)
- Cron: редактирование расписания из UI с визуальным конструктором
- DiskUsage: мгновенное обновление размеров при очистке Docker cache
- Deploy: оптимистичный Git Pull с мгновенным обновлением статуса
- Cron: алерты при неудачном выполнении с Telegram уведомлениями
- Метрики приложений: response time, error rate, uptime
- PostgreSQL + ZenStack инфраструктура (Фаза 1)
- Миграция данных на PostgreSQL (Фаза 2)
- Автозапуск cron планировщика при старте приложения
- Мульти-серверная архитектура (s1 + s2 + dashboard-agent)
- Аналитика Umami (сводная статистика, управление сайтами, автозапись env)
- Централизованный реестр приложений (поле domain в DeployedApp, AddSiteDialog из БД)
- Запись env на SiteCard с мульти-серверной маршрутизацией (s1 agent + s2 nsenter)
- Контроль зависимостей (§25 PLAN-INFRA.md, Этап 1 MVP) — `scripts/deps-scan.ts` +
  `/deps` + алерт `DEPS_VULNERABLE`, детали — `PLAN-INFRA.md` §25, `CHANGELOG.md` 1.24.0
- Dev-session bypass для preview-верификации без OIDC (`/api/auth/dev-session`,
  `@letar/auth/server` `createDevSessionRoute` — тот же паттерн, что в `domwellbes`/
  `grandslamcup`). `ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` только в `.env.local`,
  **никогда в `.env.docker`** (см. `.claude/rules/env-files.md`)
- Алерт `AUTH_ACCOUNT_ISSUER_NULL` (PLAN.md корня §71 п.3.2) — новый тип в `AlertType`,
  создаётся `dashboard-agent` ежедневной cron-проверкой `Account.issuer IS NULL` по 14
  приложениям с моделью Account (better-auth 1.7 регрессия, не путать со статическим гейтом
  схемы `check-better-auth-schema.mjs` — этот ловит уже вставленные NULL-строки, тот — только
  отсутствие поля)
- Алерт `AUTH_LOGIN_CANARY_FAILED` (PLAN.md корня §71 п.3.3) — новый тип в `AlertType`,
  создаётся `dashboard-agent` синтетической канареечной проверкой входа каждые 30 минут:
  POST `/api/auth/sign-in/email` канареечными учётными данными на 9 приложений с реальным
  credential-входом, алерт при ответе, отличном от HTTP 200 (две неудачи подряд) — ловит любую
  поломку входа, не только NULL issuer
- `Alert.notified` — nullable tri-state (`null`/`true`/`false`) различает «не пыталось
  отправляться», «ушло» и «попытка провалилась»; heartbeat (`src/jobs/heartbeat.ts`) теперь
  реагирует и на недоставленные алерты за 24ч, не только на их полное отсутствие
  (PLAN-INFRA-3.md §52)
- Собственные cron-задачи (`dashboard-heartbeat`, `s2-pageview-count`, `s2-ssl-check`) переехали
  с HTTP-опроса `dashboard-agent` на `@letar/jobs` (pg-boss внутри приложения) — по образцу пилота
  `studio` (PLAN-INFRA-4.md §75). Планировщик стартует из `instrumentation.ts`, задачи в
  `src/jobs/`, статус — `/api/jobs/status`, админка — `/jobs` (`JobsTable` из `@letar/admin-ui`,
  ручной запуск, вкл/выкл без редеплоя, модель `JobOverride` переживает деплой). Старые
  `/api/cron/{heartbeat,pageview-count,ssl-check}` удалены; соответствующие записи сняты и с
  `dashboard-agent` (`DEFAULT_CRON_JOBS`) в том же окне — иначе агент ловит 404, а не тихо
  дублирует (см. PLAN-INFRA-4.md §75, находка 03.09.2026)
- `src/jobs/scheduler.ts` схлопнут с ~75 строк до 8 ре-экспортов — globalThis-кеш планировщика и
  загрузка `JobOverride` вынесены в общую фабрику `createAppJobsModule` (`@letar/jobs`), тот же
  код, что был дословно скопирован в `studio`. Публичные имена функций не менялись
  (2026-09-03, см. `PLAN_COMPLETED.md`).

---

## Примечания по деплою

### Конфигурация Cron

- `cron-jobs.example.json` — шаблон в репозитории
- `cron-jobs.json` — локальный файл (в .gitignore)
- При первом деплое создаётся автоматически из шаблона
- Изменения расписания через UI сохраняются локально
- ⚠️ С 2026-09-03 это описывает механизм `dashboard-agent` (задачи **других** приложений,
  UI в `/cron`), не собственные задачи `dashboard`. Свои три задачи мигрировали на
  `@letar/jobs` — см. `/jobs`, PLAN-INFRA-4.md §75.

---

## Идеи на будущее

(пока пусто)

## В процессе

(пока пусто)

---

## Архив

Все ранее реализованные функции (v1.1.0 — v1.23.0) перенесены в
[`PLAN_COMPLETED.md`](./PLAN_COMPLETED.md) 2026-08-09.
