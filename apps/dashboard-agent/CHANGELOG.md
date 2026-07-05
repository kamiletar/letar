# Changelog

Все значимые изменения в Dashboard Agent документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Planned

- Отправка метрик в Dashboard
- WebSocket для real-time

## [0.5.2] — 2026-07-05

### Feat: алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` теперь при провале задачи (не-2xx ответ или exception) вызывает `POST /api/alerts` в dashboard (`CRON_FAILED`, `X-Cron-Secret`) — раньше провал только логировался локально in-memory, никакого сигнала наружу не было. Добавлена задача `dsperevod-email-health-check` (`0 */6 * * *`, s2) — проверка SMTP-транспорта dsperevod через `transporter.verify()`. Зарегистрирован `dsperevod` в `APP_PORTS`/`APP_HOSTS` (порт 3019, хост `dsperevod-app`).

## [0.5.0] - 2026-04-04

### Added

- Бэкапы 6 недостающих production БД

## [0.4.0] - 2026-01-XX

### Added

- Мониторинг cron задач
- Улучшенный сбор метрик PostgreSQL

### Changed

- Обновлён Fastify до v5
- Оптимизирован сбор метрик Docker

## [0.3.0] - 2026-01-XX

### Added

- Мониторинг PostgreSQL баз данных
- Endpoint `/databases`

## [0.2.0] - 2026-01-XX

### Added

- Мониторинг Docker контейнеров
- Endpoint `/containers`
- CORS поддержка

## [0.1.0] - 2026-01-XX

### Added

- Fastify HTTP сервер
- Сбор системных метрик (CPU, RAM, Disk)
- REST API (`/health`, `/metrics`)
- Базовая структура проекта
