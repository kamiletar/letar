---
name: deployment-assistant
description: |
  Помощник по деплою приложений. Используй при:
  - Деплое через deploy-affected.sh
  - Настройке Docker и docker-compose
  - Конфигурации Nginx Proxy Manager
  - Диагностике проблем с контейнерами
  - Работе с .env.docker переменными
  - Миграциях БД на production
  - Настройке бекапов (cron, uploads, pg_dump)
---

# Deployment Assistant

Помощник по деплою приложений в монорепозитории.

## Когда использовать

- Деплой через `deploy-affected.sh`
- Настройка Docker и docker-compose
- Конфигурация Nginx Proxy Manager
- Диагностика проблем с контейнерами
- Работа с `.env.docker` переменными
- Миграции базы данных на production

## Workflow

1. **Подготовка**
   - Проверь `.env.docker` для целевого приложения
   - Убедись что `Dockerfile.production` существует
   - Проверь `docker-compose.production.yml`

2. **Деплой**

   ```bash
   # Все затронутые приложения
   ./deploy-affected.sh

   # Конкретное приложение
   ./deploy-affected.sh --app <app-name>

   # Без git pull
   ./deploy-affected.sh --skip-git

   # Принудительная пересборка
   ./deploy-affected.sh --app <app> --skip-cache

   # Чистая установка
   ./deploy-affected.sh --app <app> --clean
   ```

3. **Проверка**
   - Логи: `docker compose -f docker-compose.production.yml logs -f app`
   - Статус: `docker ps`
   - Сети: `docker network ls`

## ⚠️ Подводные камни, порты, бекапы — см. deployment.md

Этот раздел раньше дублировал (найдено при аудите `.claude/` 2026-08-10, замер —
`PLAN-INFRA.md §72`) ~260 строк текста, дословно совпадающих с
[`.claude/docs/deployment.md`](/.claude/docs/deployment.md): подводные камни (`DATABASE_URL`,
`DB_PASSWORD`, `output: 'standalone'`, Turbopack strict mode), таблица портов/серверов,
переменная `DOMAIN`, чек-лист добавления нового приложения в Dashboard, реестр бекапов и
uploads-маунтов. Два источника одной правды расходились независимо друг от друга — правь
`deployment.md`, он канонический (обновляется чаще, на него ссылаются другие доки).

Читай `deployment.md` целиком перед первым деплоем нового приложения или при диагностике
проблем с БД/бекапами — там же чек-лист «добавление нового приложения в Dashboard» и «бекапы при
деплое нового приложения».

## Reference

### Основные

- `reference/docker-patterns.md` — Docker и docker-compose паттерны
- `reference/nginx-config.md` — Настройка Nginx Proxy Manager
- `reference/troubleshooting.md` — Решение типичных проблем

### Продвинутые

- `reference/ci-cd.md` — GitHub Actions, автодеплой, кэширование
- `reference/db-migrations-prod.md` — Миграции БД на production
- `reference/health-checks.md` — Liveness/readiness проверки
- `reference/rollback.md` — Процедуры отката
- `reference/monitoring.md` — Логи, метрики, алерты

## Ключевые файлы

- `deploy-affected.sh` — Главный скрипт деплоя
- `apps/<app>/Dockerfile.production` — Multi-stage сборка
- `apps/<app>/docker-compose.production.yml` — Сервисы
- `apps/<app>/.env.docker` — Переменные окружения
- `.last-deploy/` — Коммиты последних деплоев
