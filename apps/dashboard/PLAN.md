# План развития Dashboard

> **Версия:** 1.24.1
> **Последнее обновление:** 2026-08-11

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

---

## Примечания по деплою

### Конфигурация Cron

- `cron-jobs.example.json` — шаблон в репозитории
- `cron-jobs.json` — локальный файл (в .gitignore)
- При первом деплое создаётся автоматически из шаблона
- Изменения расписания через UI сохраняются локально

---

## Идеи на будущее

(пока пусто)

## В процессе

- [ ] **GlitchTip** — код подключён (2026-08-11, `nx g @letar/generators:glitchtip-integrate
      dashboard`, детали в `PLAN_COMPLETED.md`), но GlitchTip-проект `dashboard` ещё не создан в
      `errors.s3.letar.best`. Дальше: создать проект → вписать DSN в `.env.docker` →
      `sops --encrypt` → deploy-request BlackCove.

---

## Архив

Все ранее реализованные функции (v1.1.0 — v1.23.0) перенесены в
[`PLAN_COMPLETED.md`](./PLAN_COMPLETED.md) 2026-08-09.
