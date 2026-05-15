# Техническая документация

Подробная техническая документация разбита по темам для удобства навигации.

---

## 📖 Начни с главного README

**→ [../README.md](../README.md)** — главная страница проекта с обзором, быстрым стартом и навигацией по всей документации

---

## 📚 Бизнес-документация

| Файл                                     | Описание                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| **[ROLES.md](./ROLES.md)**               | 👥 Роли пользователей (платформенные и школьные), права |
| **[FEATURES.md](./FEATURES.md)**         | ✨ Функциональные требования (21 модуль)                |
| **[GLOSSARY.md](./GLOSSARY.md)**         | 📖 Глоссарий терминов, статусы, категории прав          |
| **[DEPENDENCIES.md](./DEPENDENCIES.md)** | 🔗 Зависимости между фичами, критический путь MVP       |
| **[ROADMAP.md](./ROADMAP.md)**           | 🗺️ Перспективы развития, интеграции, календари          |

---

## 🔧 Техническая документация

| Файл                             | Описание                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| **[DATABASE.md](./DATABASE.md)** | 🗄️ Схема БД, модели ZenStack, enum'ы, индексы, связи между таблицами       |
| **[API.md](./API.md)**           | 🌐 REST API endpoints, Server Actions, Public API v1, авторизация, примеры |
| **[SECURITY.md](./SECURITY.md)** | 🔒 Безопасность, Rate Limiting, аудит действий, защита данных, мониторинг  |
| **[OFFLINE.md](./OFFLINE.md)**   | 📱 PWA, Service Worker, синхронизация данных, оффлайн-режим, установка     |

---

## 🧪 Тестирование

Детальные планы тестирования по фазам:

| Файл                                                                                   | Фаза | Описание                                              |
| -------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------- |
| **[testing/PHASE1_MVP.md](./testing/PHASE1_MVP.md)**                                   | 1    | Аутентификация, профили, связи, расписание, занятия   |
| **[testing/PHASE2_FINANCE_PWA.md](./testing/PHASE2_FINANCE_PWA.md)**                   | 2    | Баланс, штрафы, перенос, отсутствие, уведомления, PWA |
| **[testing/PHASE3_INTEGRATIONS.md](./testing/PHASE3_INTEGRATIONS.md)**                 | 3    | Передача учеников, автошколы, Telegram                |
| **[testing/PHASE4_IMPROVEMENTS.md](./testing/PHASE4_IMPROVEMENTS.md)**                 | 4    | Статистика, категории, типы занятий, теория, экзамены |
| **[testing/PHASE5_COMMUNICATIONS.md](./testing/PHASE5_COMMUNICATIONS.md)**             | 5    | Рейтинги, поиск, поддержка, чаты, панель владельца    |
| **[testing/PHASE6_UX_REFACTORING.md](./testing/PHASE6_UX_REFACTORING.md)**             | 6    | UX улучшения, рефакторинг кода, accessibility         |
| **[testing/PHASE7_MOBILE_UX.md](./testing/PHASE7_MOBILE_UX.md)**                       | 7    | Мобильная адаптация, touch-оптимизация                |
| **[testing/PHASE8_INTEGRATIONS_SCHOOLS.md](./testing/PHASE8_INTEGRATIONS_SCHOOLS.md)** | 8    | Импорт/экспорт данных, Public API v1                  |

**→ Полный план тестирования:** [../PLAN_TESTING.md](../PLAN_TESTING.md)

---

## 📋 Планирование и история

| Файл                                             | Описание                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| **[../PLAN.md](../PLAN.md)**                     | 📋 Техническое задание, roadmap, приоритеты (1-8 фазы)  |
| **[../PLAN_COMPLETED.md](../PLAN_COMPLETED.md)** | ✅ Выполненные задачи, исправленные баги, закрытый долг |
| **[../PLAN_TESTING.md](../PLAN_TESTING.md)**     | 🧪 План тестирования, статистика покрытия               |
| **[../CHANGELOG.md](../CHANGELOG.md)**           | 📝 История изменений (Keep a Changelog)                 |

---

## 🚀 Деплой и продукт

| Файл                             | Описание                                                  |
| -------------------------------- | --------------------------------------------------------- |
| **[../DEPLOY.md](../DEPLOY.md)** | 🚀 Инструкции по деплою, env-переменные, Nginx, WebSocket |
| **[../KILLER.md](../KILLER.md)** | 💡 Killer-features, парсинг рынка автошкол, бизнес-идеи   |

---

## 🔗 Полезные ссылки

- **Монорепо:** [../../CLAUDE.md](../../CLAUDE.md) — инструкции для Claude Code
- **Формы:** [../../.claude/docs/forms.md](../../.claude/docs/forms.md) — @letar/forms (TanStack Form), Zod v4
- **UI:** [../../.claude/docs/ui-components.md](../../.claude/docs/ui-components.md) — Chakra UI v3
- **Auth:** [../../.claude/docs/auth.md](../../.claude/docs/auth.md) — Auth.js v5, OAuth
- **DrivingSchoolForm:** [../src/driving-school-form/README.md](../src/driving-school-form/README.md) — app-specific расширение форм

---

**Структура документации обновлена:** 2025-12-21
