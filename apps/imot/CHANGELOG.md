# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

## [0.34.0] - 2026-01-17

### Security

- **CRITICAL:** Исправлено использование raw Prisma вместо enhanced client в `client-profile.actions.ts` — теперь все операции проходят через ZenStack access control
- **CRITICAL:** Ограничена политика User — SPECIALIST теперь может читать только своих клиентов через `specialistClients` relation
- **HIGH:** Исправлена политика Practice — клиент теперь может только читать и обновлять (заметки), но НЕ удалять практики
- **HIGH:** Разблокирована модель Verification для корректной работы Better Auth email верификации
- **MEDIUM:** API route `calendar/session` переведён на enhanced client с автоматической проверкой прав
- **MEDIUM:** Политики Account/Session обновлены для корректной работы Better Auth adapter

### Changed

- Все Server Actions и API routes теперь используют `getEnhancedPrisma()` из `@/lib/db` вместо raw Prisma

## [0.33.0] - 2026-01-01

### Added

- Миграция на Better Auth
- Расширенная система ролей (CLIENT, SPECIALIST, ADMIN)
- Базовая структура платформы

> **Примечание:** История версий до 0.33.0 не документирована. Начиная с этой версии ведётся полный CHANGELOG.

## [0.1.0] - 2025-12-24

### Added

- Первый релиз платформы IMOT
