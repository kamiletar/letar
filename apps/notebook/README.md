# Блокнот Ками

Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта

## Версия и стек

| Параметр    | Значение           |
| ----------- | ------------------ |
| **Версия**  | 0.1.0              |
| **Порт**    | 3127               |
| **Next.js** | 16                 |
| **React**   | 19                 |
| **UI**      | Chakra UI v3       |
| **Формы**   | @letar/forms + Zod |

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

## Что дальше

Каркас минимален — нет БД, форм, аутентификации. Смотри `PLAN.md` для текущих задач и
`.claude/commands/create/new-app.md` за оставшимися шагами (регистрация в Dashboard, бэкапы,
docker-compose, e2e-gate — не автоматизированы генератором намеренно).

---

**Последнее обновление:** 2026-10-05
