# Блокнот Ками

Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта

## Версия и стек

| Параметр    | Значение                                     |
| ----------- | -------------------------------------------- |
| **Версия**  | см. [CHANGELOG.md](CHANGELOG.md)             |
| **Порт**    | 3127                                         |
| **Next.js** | 16                                           |
| **React**   | 19                                           |
| **UI**      | Chakra UI v3                                 |
| **Формы**   | @letar/forms + Zod                           |
| **БД**      | PostgreSQL + Prisma + ZenStack               |
| **Вход**    | Better Auth через Ключницу (только владелец) |

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, быстрый старт         |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Быстрый старт

```bash
nx dev notebook              # Разработка
nx run notebook:format       # Форматирование (не голая `nx format` — она запускает Prettier)
nx lint notebook             # oxlint → ESLint
nx typecheck:tsgo notebook   # Проверка типов
nx test notebook             # Тесты
```

## Прогресс

| Этап | Содержание                                   | Статус      |
| ---- | -------------------------------------------- | ----------- |
| 1    | Каркас, схема БД, вход владельца, рубрики    | Готов       |
| 2    | Редактор Markdown, история версий, откат     | Планируется |
| 3    | Офлайн: IndexedDB, очередь отправки          | Планируется |
| 4    | Публикация в рубрики, экран одобрения        | Планируется |
| 5    | Импорт из старого блокнота, поиск, установка | Планируется |

Схемы и решения — [страница плана](https://claude.ai/artifact/LUsWWH9iycSE4MrkBVrdCZ).
Подробные задачи — [PLAN.md](PLAN.md).

## Локальный запуск

Нужны `apps/notebook/.env.local` (`DATABASE_URL`, `SHADOW_DATABASE_URL`, `BETTER_AUTH_SECRET`,
`OIDC_*`, `OWNER_EMAIL`) и локальный PostgreSQL (контейнер `notebook-postgres-dev`, порт 5470).
Миграции — `nx db:migrate notebook -- --name <описание>`.

---

**Последнее обновление:** 2026-10-06
