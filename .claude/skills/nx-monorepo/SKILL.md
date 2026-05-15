---
name: nx-monorepo
description: |
  Управление Nx монорепо. Используй при:
  - Запуске задач (build, test, lint, dev)
  - Настройке кэширования и CI
  - Работе с affected командами
  - Добавлении проектов/библиотек
  - Настройке зависимостей между проектами
  - Troubleshooting Nx
---

# Nx Monorepo

Руководство по управлению Nx монорепо.

## Quick Reference

```bash
# Основные команды
nx dev <project>           # Запуск dev сервера
nx build <project>         # Сборка проекта
nx lint <project>          # Линтинг (oxlint + ESLint)
nx test <project>          # Тесты
nx typecheck:tsgo <project> # Проверка типов (9-38x быстрее!)
nx format <project>        # Форматирование (dprint)

# Форматирование
nx format:write            # Отформатировать все файлы
nx format:check            # Проверить форматирование

# Множественные задачи
nx run-many -t build       # Собрать все проекты
nx affected -t test        # Тестировать только изменённые

# Утилиты
nx graph                   # Визуализация зависимостей
nx reset                   # Очистить кэш и daemon
nx sync                    # Синхронизация tsconfig references
nx show project <name>     # Информация о проекте
```

---

## Версия Nx

- **Nx:** 22.3.3
- **Пакетный менеджер:** Bun

---

## Проекты в Workspace

| Проект           | Тип | Порт | Описание                 |
| ---------------- | --- | ---- | ------------------------ |
| premium-rosstil  | app | 3000 | Fashion интернет-магазин |
| imot             | app | 3001 | Платформа психотерапии   |
| dashboard        | app | 3002 | Мониторинг сервера       |
| driving-school   | app | 3003 | Автошкола                |
| mandala          | app | 3004 | Галерея мандал           |
| kami             | app | 3005 | Управление контентом     |
| form-develop-app | app | 3006 | Песочница форм           |

**Библиотеки:**

- `@letar/forms` — UI библиотека форм
- `@letar/chakra-provider` — Провайдер Chakra UI
- `@letar/ui` — Shared UI компоненты
- `@letar/format-utils` — Утилиты форматирования
- `@letar/validation-utils` — Zod схемы валидации

---

## Ключевые концепции

| Концепция          | Описание                           |
| ------------------ | ---------------------------------- |
| **Target**         | Задача проекта (build, test, lint) |
| **Executor**       | Исполнитель задачи                 |
| **dependsOn**      | Зависимости между задачами         |
| **affected**       | Только изменённые проекты          |
| **inputs/outputs** | Контроль кэширования               |
| **tags**           | Метки для module boundaries        |

---

## Перед коммитом

```bash
nx format <project>         # Форматирование
nx lint <project>           # Линтинг (oxlint + ESLint)
nx typecheck:tsgo <project> # Проверка типов
```

---

## См. также

- [reference/commands.md](reference/commands.md) — Все команды
- [reference/configuration.md](reference/configuration.md) — nx.json, project.json
- [reference/caching.md](reference/caching.md) — Кэширование
- [reference/affected.md](reference/affected.md) — Affected команды
- [reference/plugins.md](reference/plugins.md) — Плагины
- [reference/project-structure.md](reference/project-structure.md) — Теги, boundaries
- [reference/troubleshooting.md](reference/troubleshooting.md) — Проблемы
