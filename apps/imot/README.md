# IMOT

Платформа психотерапии "Интегративная Матрица Осознанной Трансформации".

> **Текущая версия:** 0.34.0
> **Технологический стек:** Next.js 16, React 19, Chakra UI v3, PostgreSQL, Prisma, ZenStack

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

---

## 🚀 Быстрый старт

### Разработка

```bash
# Запуск dev-сервера
nx dev imot  # порт 3001

# База данных
nx zenstack:generate imot  # Генерация Prisma + Zod схем
nx db:push imot            # Синхронизация БД (dev)
nx db:migrate imot         # Создание миграции (prod)
nx db:studio imot          # Prisma Studio

# Тестирование
nx lint imot               # Линтинг
nx typecheck:tsgo imot     # Проверка типов (tsgo - быстрее!) ⚡
nx typecheck imot          # Проверка типов (tsc - обычная скорость)
nx format imot             # Форматирование
nx test imot               # Unit-тесты
nx e2e imot-e2e            # E2E тесты (Playwright)
```

### Деплой

```bash
# Деплой приложения
./deploy-affected.sh --app imot

# Dry run (показать что будет задеплоено)
./deploy-affected.sh --dry-run

# Принудительная пересборка
./deploy-affected.sh --app imot --skip-cache
```

---

## 📝 Методология разработки

Проект следует принципам:

- **TDD (Test-Driven Development)** — сначала тест, потом код
- **Планирование в PLAN.md** — вся функциональность документируется
- **Автоматические коммиты** — после успешного завершения задачи
- **Семантическое версионирование** — patch/minor/major по характеру изменений
- **Линтинг и типизация** — обязательная проверка перед коммитом

---

## 🔗 Полезные ссылки

- **Монорепо:** [CLAUDE.md](../../CLAUDE.md) — инструкции для Claude Code
- **Окружение:** [.claude/docs/environment.md](../../.claude/docs/environment.md)
- **Формы:** [.claude/docs/forms.md](../../.claude/docs/forms.md)
- **UI компоненты:** [.claude/docs/ui-components.md](../../.claude/docs/ui-components.md)
- **Аутентификация:** [.claude/docs/auth.md](../../.claude/docs/auth.md)

---

**Последнее обновление:** 2026-01-01
