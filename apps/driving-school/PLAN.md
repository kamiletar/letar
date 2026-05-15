# Техническое задание: Платформа для автошкол

> **📖 Начни с главного README:** [README.md](./README.md) — обзор проекта, быстрый старт, навигация по документации
>
> **Версия:** 0.230.0 | **Обновлено:** 2026-03-03 | **Рефакторинг:** ✅ ZenStack v3.3.0, ✅ DRY v0.229.0, ✅ Тесты v0.230.0
>
> **Связанные документы:**
>
> - [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) — выполненные задачи (13 фаз, 78 фич)
> - [CHANGELOG.md](./CHANGELOG.md) — история изменений
> - [PLAN_TESTING.md](./PLAN_TESTING.md) — план тестирования
> - [LEAK_SEARCH.md](./LEAK_SEARCH.md) — поиск memory leak методом исключения
> - [docs/](./docs/) — техническая документация

---

## Содержание

| Раздел                    | Файл                                           | Описание                                   |
| ------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Роли пользователей        | [docs/ROLES.md](./docs/ROLES.md)               | Платформенные и школьные роли, права       |
| Функциональные требования | [docs/FEATURES.md](./docs/FEATURES.md)         | 21 модуль функциональности                 |
| Безопасность и лимиты     | [docs/SECURITY.md](./docs/SECURITY.md)         | Защита, rate limiting, лимиты системы      |
| Зависимости между фичами  | [docs/DEPENDENCIES.md](./docs/DEPENDENCIES.md) | Диаграмма зависимостей, критический путь   |
| Глоссарий                 | [docs/GLOSSARY.md](./docs/GLOSSARY.md)         | Термины, статусы, категории                |
| Перспективы развития      | [docs/ROADMAP.md](./docs/ROADMAP.md)           | API, календари, интеграции                 |
| База данных               | [docs/DATABASE.md](./docs/DATABASE.md)         | Модели, enum'ы, связи                      |
| API                       | [docs/API.md](./docs/API.md)                   | REST API, Server Actions                   |
| PWA и оффлайн             | [docs/OFFLINE.md](./docs/OFFLINE.md)           | Service Worker, синхронизация              |
| Гайд по стилю             | [docs/STYLEGUIDE.md](./docs/STYLEGUIDE.md)     | UI/UX принципы, copywriting, accessibility |

---

## Прогресс реализации

| Фаза | Название                     | Фичи     | Статус                        |
| ---- | ---------------------------- | -------- | ----------------------------- |
| 1    | MVP                          | 6/6 ✅   | Завершена (v0.1.0-v0.9.0)     |
| 2    | Финансы и PWA                | 6/6 ✅   | Завершена (v0.10.0-v0.15.0)   |
| 3    | Интеграции                   | 3/3 ✅   | Завершена (v0.16.0-v0.18.0)   |
| 4    | Улучшения                    | 11/11 ✅ | Завершена (v0.19.0-v0.29.0)   |
| 5    | Коммуникации и админка       | 6/6 ✅   | Завершена (v0.30.0-v0.38.0)   |
| 6    | UX и рефакторинг             | 7/7 ✅   | Завершена (v0.39.0-v0.74.0)   |
| 7    | Мобильный UX                 | 10/10 ✅ | Завершена (v0.75.0-v0.75.7)   |
| 8    | Интеграции для школ          | 7/7 ✅   | Завершена (v0.76.0-v0.82.0)   |
| 9    | Модернизация форм и UX       | ✅       | Завершена (v0.83.0-v0.94.0)   |
| 10   | Улучшение онбординга         | 4/4 ✅   | Завершена (v0.149.0-v0.151.0) |
| 11   | Поиск и запись к инструктору | 3/3 ✅   | Завершена (v0.153.0)          |
| 12   | UI-библиотека форм           | 24/24 ✅ | Завершена (v0.148.0)          |
| 12.1 | Унификация оффлайн-форм      | 4/4 ✅   | Завершена (v0.154.0)          |
| 13   | Прогресс ученика             | 7/7 ✅   | Завершена (v0.179.0)          |

**Общий прогресс:** 78/78 фич (100%) ✅

> **Детальное описание всех выполненных фич:** [PLAN_COMPLETED.md](./PLAN_COMPLETED.md)

---

## Текущее состояние

### 🔵 E2E тесты

> **→ План:** [`apps/driving-school-e2e/E2E_PLAN.md`](../driving-school-e2e/E2E_PLAN.md)
>
> **→ Архив:** [`apps/driving-school-e2e/E2E_PLAN_COMPLETED.md`](../driving-school-e2e/E2E_PLAN_COMPLETED.md)

| Метрика        | Значение                        |
| -------------- | ------------------------------- |
| Unit тесты     | 1742 passed                     |
| E2E тесты      | **1358 тестов** (97.9% passing) |
| E2E journeys   | 95 passed                       |
| Файлов         | 100                             |
| Шарды          | 7/7 зелёные                     |
| Последний прог | 2026-03-02                      |

### 🟢 Все фичи реализованы

- Все функции из фаз 1-13 реализованы
- Технический долг закрыт
- Рефакторинг завершён (v0.163.0)
- E2E тесты стабилизированы (v0.222.0) — исправлены 25+ flaky/failing тестов
- Безопасность усилена (v0.223.0) — DOMPurify, auth в actions, access policies
- N+1 запросы устранены (v0.223.1) — 5 файлов оптимизировано, URL централизованы
- Технический долг P2 (v0.224.0) — дубликаты, deprecated, batch import, isStudent() баг
- Производительность P3 (v0.225.0) — groupBy для школ, React cache, calendar sync

---

## Следующие шаги

Возможные направления развития описаны в [docs/ROADMAP.md](./docs/ROADMAP.md):

### Недавно реализовано (v0.193.0 - v0.198.0)

- ✅ **Webhooks** — уведомления о событиях на URL школы (v0.193.0)
- ✅ **Синхронизация календарей** — Google, Яндекс — двусторонняя синхронизация (v0.194-195.0)
- ✅ **Alert System** — панель критичных уведомлений (v0.197.0)
- ✅ **Bulk Actions** — массовые действия в таблицах (v0.197.0)
- ✅ **Real-time SSE** — обновления dashboard в реальном времени (v0.197.0)
- ✅ **Сплитскрин-режим** — чат с контекстной панелью (v0.198.0)

### Планируется

- Write API (расширение REST API)
- Виджет записи для сайтов
- Интеграция с 1C

### Недавно реализовано (v0.220.0)

- ✅ **Оптимизация производительности** — N+1 → batch queries, groupBy, compound индекс на TimeSlot
- ✅ **Обход ZenStack v3.2.x бага** — nested include с access policies генерирует невалидный SQL

### ✅ Расписание теории — место из филиалов, автогенерация, привязка класса к группе (v0.221.0)

**Контекст:** В форме теоретического занятия место проведения — свободный текст. Нужен Select из филиалов с типом CLASSROOM. Дата/время задаётся вручную — нужна подсказка следующей даты + массовая генерация. Учебный класс логичнее привязать к группе.

**Шаги:**

1. ✅ **Схема БД:** `classroomId` и `theoryHours` в StudyGroup
2. ✅ **Action: получить классы школы** — `getSchoolClassroomsAction(schoolId)`
3. ✅ **Форма учебной группы:** Select "Учебный класс" + поле "Часы теории"
4. ✅ **Форма занятия:** место = Select классов + авто-подстановка из группы
5. ✅ **Авто-подстановка даты при выборе группы** — `getNextLessonSlot()`
6. ✅ **Массовая генерация расписания** — `GenerateScheduleDialog` + preview + batch create
7. ✅ **Исправить URL редиректов** — `?schoolId=` → path param

**Изменённые файлы (14 файлов, 3 новых):**

- `theory-lessons/_actions/theory-lesson.types.ts` — `SchoolClassroom` интерфейс
- `theory-lessons/_actions/theory-lesson-queries.action.ts` — `getSchoolClassroomsAction`
- `theory-lessons/_actions/theory-lesson.action.ts` — реэкспорт
- `theory-lessons/_actions/theory-lesson-generate.action.ts` — **новый**: preview + generate + generateAllSlots
- `theory-lessons/_components/theory-lesson-form.tsx` — Select классов, авто-fill, URL fix
- `theory-lessons/_components/generate-schedule-dialog.tsx` — **новый**: диалог генерации
- `theory-lessons/[schoolId]/_components/theory-lessons-client-page.tsx` — кнопка "Сгенерировать"
- `study-groups/_schemas/study-group.schema.ts` — classroomId, theoryHours
- `study-groups/_actions/study-group.action.ts` — classroomId, theoryHours в CRUD + queries
- `study-groups/_actions/study-group.types.ts` — обновлён `StudyGroupSummary`
- `study-groups/_components/study-group-form.tsx` — Select "Учебный класс" + "Часы теории"
- `lib/lesson-schedule/next-slot.ts` — **новый**: `getNextLessonSlot()`
- `lib/lesson-schedule/index.ts` — реэкспорт

### Технический долг

- [x] **TypeScript ignoreBuildErrors: false** — `ignoreBuildErrors: false` в next.config.js (v0.227.0):
  - Type assertion в db.ts (обход бага ZenStack union overloads от $use)
  - Удалены project references из tsconfig.json (не нужны с composite: false)
  - Исправлены ошибки: SURVEY_SENT в email-service, onChange в theory-lesson-form, путь импорта templates-list, verificationToken→verification, calendar include fix
- [x] **TypeScript strict: true** — `strict: true` в tsconfig.json (v0.228.0):
  - Убрана неверная аннотация `typeof prisma` для `tx` в `$transaction`
  - strict: true включает noImplicitAny, strictNullChecks, strictFunctionTypes и др.

---

## Метрики успеха

### Технические

| Метрика             | Цель MVP | Цель v1.0 |
| ------------------- | -------- | --------- |
| Время загрузки (3G) | < 3 сек  | < 2 сек   |
| Uptime              | > 99%    | > 99.5%   |
| API Response (p95)  | < 500ms  | < 200ms   |
| Error Rate          | < 1%     | < 0.1%    |

### Бизнес

| Метрика                      | Цель    |
| ---------------------------- | ------- |
| Регистрация → первое занятие | < 5 мин |
| Отмены занятий               | < 10%   |
| Неявки                       | < 5%    |
| Конверсия приглашений        | > 70%   |

---

## Документация проекта

| Файл                                     | Описание                          |
| ---------------------------------------- | --------------------------------- |
| [README.md](./README.md)                 | Главная страница, быстрый старт   |
| [docs/](./docs/)                         | Техническая документация          |
| [PLAN_COMPLETED.md](./PLAN_COMPLETED.md) | Выполненные задачи по фазам       |
| [PLAN_TESTING.md](./PLAN_TESTING.md)     | План тестирования                 |
| [CHANGELOG.md](./CHANGELOG.md)           | История изменений                 |
| [DEPLOY.md](./DEPLOY.md)                 | Инструкции по деплою              |
| [KILLER.md](./KILLER.md)                 | Killer-features и рыночные данные |
| [schema.zmodel](./schema.zmodel)         | Схема базы данных (ZenStack)      |
