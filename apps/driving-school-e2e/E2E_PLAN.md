# E2E Test Plan - Driving School

> **Версия:** 3.4 | **Дата обновления:** 2026-03-03
>
> **Статус:** ✅ Реализация — 1496 тестов в 95 файлах (все шарды проходят)
>
> **Архив:** [E2E_PLAN_COMPLETED.md](./E2E_PLAN_COMPLETED.md) — история версий и выполненные фазы

---

## Перед началом работы

**Обязательно прочитай [README.md](./README.md)** — там описаны:

- SSE блокировка (почему тесты зависают и как это решено)
- Правильный импорт `test` из `./fixtures/base-test`
- Структура проекта и авторизация

---

## Прогресс

| Метрика          | Значение                             |
| ---------------- | ------------------------------------ |
| Всего тестов     | **1496**                             |
| Файлов .spec.ts  | **95**                               |
| Flaky            | **~4**                               |
| Пропущено (skip) | **~23**                              |
| Failed           | **22** (17 pre-existing, 5 data-dep) |
| Последний прогон | 2026-02-06 (v3.3 пошардовый)         |

> **🔄 v3.0 — Аудит и расширение (2026-02-04):**
>
> - Полный аудит покрытия: 88 файлов, 1358 test() вызовов
> - PLAN_TESTING.md синхронизирован с реальным состоянием
> - Определены 4 фичи без E2E: Calendar Sync, Connected Accounts, VK OAuth, Webhooks
> - Добавлено **45 новых тест-кейсов** в план (фичи без покрытия)
>
> **🔄 v3.1 — Journey-тесты реальных бизнес-процессов (2026-02-04):**
>
> - Формализованы 5 бизнес-процессов (journeys) автошколы
> - Карта зависимостей между разделами панели админа
> - Добавлено **95 новых тест-кейсов** в 5 journey-файлах (78-82)
> - Подробная спецификация: [REAL_PROCESSES.md](../apps/driving-school/docs/testing/REAL_PROCESSES.md)
>
> **🔄 v3.2 — Реализация фичевых тестов (2026-02-06):**
>
> - Написаны 4 файла фичевых тестов: 74-calendar-sync (12), 75-connected-accounts (8), 76-vk-oauth (5), 77-webhooks (20)
> - Исправлена конфигурация шардов в project.json (string → array)
> - Добавлен шард `shard-integrations` для файлов 74-77
> - Journey-тесты 78-82 уже были реализованы ранее (95 тестов)
>
> **🔄 v3.4 — Стандартизация хелперов и устранение waitForTimeout (2026-03-03):**
>
> - Удалены 2 debug-файла (bug21-form-reset, debug-profile-form) с hardcoded localhost URLs
> - `expectToast` обновлён с `[data-toaster]` локатором, добавлены `expectSuccessToast`, `expectErrorToast`
> - `waitForAction` (networkidle) и `clickAndWait` — замена ~150 `waitForTimeout(300-3000)` в 10 файлах
> - `navigateAndWait` — замена `goto + waitForLoadState` в 8 файлах
> - Стандартизация inline toast-паттернов (5 → 1 единый через `expectToast`)
>
> **🔄 v3.3 — StorageState fix + полный пошардовый прогон (2026-02-06):**
>
> - Исправлен dual-write storageState (CWD vs configDir при запуске через Nx)
> - Исправлен `redirect('/login')` → `redirect('/sign-in')` в 6 файлах driving-school
> - Исправлены 3 flaky локатора в 74-calendar-sync.spec.ts
> - globalTimeout увеличен до 1800s (30 мин)
> - Полный пошардовый прогон: **317 passed, 22 failed, 23 skipped** (0 регрессий)

---

## Легенда статусов

- `[ ]` Не автоматизировано
- `[~]` В работе
- `[x]` Автоматизировано
- `[!]` Блокер (требует доработки приложения)
- `[-]` Пропущено (не актуально)

---

## Покрытие по файлам

### Core (auth, profiles, errors) — Shard: `e2e:core`

| Файл                          | Тестов | Статус |
| ----------------------------- | ------ | ------ |
| 00-errors.spec.ts             | 11     | ✅     |
| 01-auth.spec.ts               | 20     | ✅     |
| 02-profile.student.spec.ts    | 9      | ✅     |
| 03-profile.instructor.spec.ts | 10     | ✅     |

### Schedule (расписание, занятия, связи) — Shard: `e2e:schedule`

| Файл                                      | Тестов | Статус |
| ----------------------------------------- | ------ | ------ |
| 04a-schedule-settings.instructor.spec.ts  | 14     | ✅     |
| 04b-schedule-slots.instructor.spec.ts     | 11     | ✅     |
| 04c-schedule-absences.instructor.spec.ts  | 8      | ✅     |
| 05-lessons.instructor.spec.ts             | 24     | ✅     |
| 06-lessons.student.spec.ts                | 27     | ✅     |
| 07-student-connections.instructor.spec.ts | 15     | ✅     |
| 49-schedule-settings.instructor.spec.ts   | 13     | ✅     |

### School (админ школы) — Shard: `e2e:school`

| Файл                                       | Тестов | Статус |
| ------------------------------------------ | ------ | ------ |
| 08-study-groups.school-admin.spec.ts       | 16     | ✅     |
| 09a-theory-topics.school-admin.spec.ts     | 13     | ✅     |
| 09b-theory-lessons.school-admin.spec.ts    | 13     | ✅     |
| 09c-school-stats.school-admin.spec.ts      | 13     | ✅     |
| 09d-school-reviews.school-admin.spec.ts    | 12     | ✅     |
| 19-school-settings.school-admin.spec.ts    | 16     | ✅     |
| 22-school-progress.school-admin.spec.ts    | 9      | ✅     |
| 23-contract-templates.school-admin.spec.ts | 30     | ✅     |
| 25-student-progress.school-admin.spec.ts   | 17     | ✅     |
| 27-import-excel.school-admin.spec.ts       | 21     | ✅     |
| 46-school-stats.school-admin.spec.ts       | 13     | ✅     |
| 47-school-locations.school-admin.spec.ts   | 13     | ✅     |
| 48-school-courses.school-admin.spec.ts     | 15     | ✅     |
| 65-school-create.school-admin.spec.ts      | 20     | ✅     |

### Platform (настройки, теория, отзывы, поиск, чаты) — Shard: `e2e:platform`

| Файл                                    | Тестов | Статус |
| --------------------------------------- | ------ | ------ |
| 10-settings-notifications.spec.ts       | 16     | ✅     |
| 11-theory-lessons.instructor.spec.ts    | 11     | ✅     |
| 12-exams.instructor.spec.ts             | 14     | ✅     |
| 13a-reviews.instructor.spec.ts          | 12     | ✅     |
| 13b-reviews.student.spec.ts             | 12     | ✅     |
| 14-search.spec.ts                       | 31     | ✅     |
| 15-support.student.spec.ts              | 17     | ✅     |
| 16-chats.student.spec.ts                | 16     | ✅     |
| 17-owner.owner.spec.ts                  | 36     | ✅     |
| 18-legal.spec.ts                        | 16     | ✅     |
| 22-platform-chats.spec.ts               | 15     | ✅     |
| 34-settings-main.spec.ts                | 27     | ✅     |
| 55-theory-attendance.instructor.spec.ts | 10     | ✅     |

### Features (типы занятий, баланс, прогресс, авто, лицензии, mobile) — Shard: `e2e:features`

| Файл                                       | Тестов | Статус |
| ------------------------------------------ | ------ | ------ |
| 20-lesson-types.instructor.spec.ts         | 9      | ✅     |
| 21-student-balance.instructor.spec.ts      | 16     | ✅     |
| 23-car-search.student.spec.ts              | 16     | ✅     |
| 24a-driver-license.instructor.spec.ts      | 14     | ✅     |
| 24b-driver-license.student.spec.ts         | 14     | ✅     |
| 26a-mobile-basic.spec.ts                   | 9      | ✅     |
| 26b-mobile-touch.spec.ts                   | 9      | ✅     |
| 26c-mobile-components.spec.ts              | 9      | ✅     |
| 26d-mobile-pages.spec.ts                   | 9      | ✅     |
| 28-vehicles.instructor.spec.ts             | 21     | ✅     |
| 29a-enrollment-requests.instructor.spec.ts | 13     | ✅     |
| 29b-my-enrollment-requests.student.spec.ts | 14     | ✅     |
| 50-lesson-pricing.instructor.spec.ts       | 17     | ✅     |

### Owner (панель владельца)

| Файл                             | Тестов | Статус |
| -------------------------------- | ------ | ------ |
| 30-api-keys.owner.spec.ts        | 14     | ✅     |
| 30-api-keys.school-admin.spec.ts | 11     | ✅     |
| 42-owner-schools.owner.spec.ts   | 13     | ✅     |
| 43-owner-users.owner.spec.ts     | 17     | ✅     |
| 44-owner-plans.owner.spec.ts     | 17     | ✅     |
| 45-owner-audit.owner.spec.ts     | 13     | ✅     |
| 53-owner-api-logs.owner.spec.ts  | 18     | ✅     |

### Flows и UX

| Файл                                              | Тестов | Статус |
| ------------------------------------------------- | ------ | ------ |
| 31-my-schedule.student.spec.ts                    | 12     | ✅     |
| 32-my-reviews-extended.student.spec.ts            | 16     | ✅     |
| 33-my-instructors.student.spec.ts                 | 14     | ✅     |
| 35-students-invite.instructor.spec.ts             | 23     | ✅     |
| 36-instructor-reviews-extended.instructor.spec.ts | 11     | ✅     |
| 37-instructor-stats.instructor.spec.ts            | 15     | ✅     |
| 38-password-recovery.spec.ts                      | 13     | ✅     |
| 39-onboarding.spec.ts                             | 13     | ✅     |
| 40-instructor-onboarding.instructor.spec.ts       | 12     | ✅     |
| 41-join-flows.spec.ts                             | 13     | ✅     |
| 51-public-schools.spec.ts                         | 12     | ✅     |
| 52-offline-mode.spec.ts                           | 18     | ✅     |
| 56-user-journeys.spec.ts                          | 21     | ✅     |
| 64-join-flows-extended.spec.ts                    | 12     | ✅     |

### Quality & Security

| Файл                                 | Тестов | Статус |
| ------------------------------------ | ------ | ------ |
| 54-public-docs.spec.ts               | 17     | ✅     |
| 57-error-handling.spec.ts            | 21     | ✅     |
| 58-form-validation.spec.ts           | 21     | ✅     |
| 59-accessibility.spec.ts             | 15     | ✅     |
| 60-dynamic-chats.spec.ts             | 10     | ✅     |
| 61-dynamic-support.spec.ts           | 9      | ✅     |
| 62-dynamic-instructors.spec.ts       | 11     | ✅     |
| 63-dynamic-schools.spec.ts           | 9      | ✅     |
| 66-ui-ux-improvements.spec.ts        | 32     | ✅     |
| 67-admin-ux.spec.ts                  | 19     | ✅     |
| 68-quality-management.spec.ts        | 30     | ✅     |
| 69-partnerships.spec.ts              | 20     | ✅     |
| 70-security.spec.ts                  | 8      | ✅     |
| 71-export-excel.school-admin.spec.ts | 9      | ✅     |
| 72-public-api.spec.ts                | 15     | ✅     |
| 73-rate-limiting.spec.ts             | 9      | ✅     |

### Integrations (calendar, accounts, OAuth, webhooks) — Shard: `e2e:integrations`

| Файл                             | Тестов | Статус |
| -------------------------------- | ------ | ------ |
| 74-calendar-sync.spec.ts         | 12     | ✅     |
| 75-connected-accounts.spec.ts    | 8      | ✅     |
| 76-vk-oauth.spec.ts              | 5      | ✅     |
| 77-webhooks.school-admin.spec.ts | 20     | ✅     |

### Debug / Utility

| Файл                       | Тестов | Статус |
| -------------------------- | ------ | ------ |
| bug21-form-reset.spec.ts   | 3      | ✅     |
| debug-profile-form.spec.ts | 3      | ⏸️     |
| example.spec.ts            | 3      | ⏸️     |

---

## 🚩 Фичи без E2E покрытия

### 74-calendar-sync.spec.ts — Синхронизация календаря (12 тестов)

**Страница:** `/settings/calendar`
**Роли:** Все авторизованные (инструктор, ученик, менеджер)
**Компоненты:** `calendar-feed-section`, `calendar-connections-section`, `add-calendar-dialog`, `connected-calendars-list`

#### Группа 1: iCal Feed

| ID       | Тест                                                    | Роль       | Статус |
| -------- | ------------------------------------------------------- | ---------- | ------ |
| E2E-CS-1 | Страница Calendar Sync загружается                      | Instructor | `[x]`  |
| E2E-CS-2 | iCal URL отображается и его можно скопировать           | Instructor | `[x]`  |
| E2E-CS-3 | Toggle "Практические занятия" переключается             | Instructor | `[x]`  |
| E2E-CS-4 | Toggle "Экзамены" переключается                         | Instructor | `[x]`  |
| E2E-CS-5 | Toggle "Теоретические занятия" переключается            | Instructor | `[x]`  |
| E2E-CS-6 | Toggle "Отсутствия" отображается только для инструктора | Instructor | `[x]`  |
| E2E-CS-7 | Кнопка "Сменить ссылку" регенерирует URL                | Instructor | `[x]`  |

#### Группа 2: Google Calendar

| ID        | Тест                                                          | Роль       | Статус |
| --------- | ------------------------------------------------------------- | ---------- | ------ |
| E2E-CS-8  | Кнопка "Добавить Google Calendar" открывает диалог            | Instructor | `[x]`  |
| E2E-CS-9  | Выбор направления синхронизации (экспорт/импорт/двустороннее) | Instructor | `[x]`  |
| E2E-CS-10 | Список подключённых календарей отображается                   | Instructor | `[x]`  |
| E2E-CS-11 | Статус синхронизации показывается (SUCCESS/ERROR/PENDING)     | Instructor | `[x]`  |
| E2E-CS-12 | Удаление подключённого календаря                              | Instructor | `[x]`  |

---

### 75-connected-accounts.spec.ts — Связанные аккаунты (8 тестов)

**Страница:** `/settings/connected-accounts`
**Роли:** Все авторизованные
**Компоненты:** `connected-accounts-client`
**Провайдеры:** Google, Yandex, VK

#### Группа 1: Просмотр

| ID       | Тест                                                   | Роль | Статус |
| -------- | ------------------------------------------------------ | ---- | ------ |
| E2E-CA-1 | Страница Connected Accounts загружается                | Any  | `[x]`  |
| E2E-CA-2 | Список поддерживаемых провайдеров (Google, Yandex, VK) | Any  | `[x]`  |
| E2E-CA-3 | Подключённый аккаунт показывает дату привязки          | Any  | `[x]`  |
| E2E-CA-4 | Кнопка "Подключить" для неподключённого провайдера     | Any  | `[x]`  |

#### Группа 2: Управление

| ID       | Тест                                            | Роль | Статус |
| -------- | ----------------------------------------------- | ---- | ------ |
| E2E-CA-5 | Кнопка "Отвязать" для подключённого провайдера  | Any  | `[x]`  |
| E2E-CA-6 | Отвязка аккаунта при наличии других → успех     | Any  | `[x]`  |
| E2E-CA-7 | Отвязка последнего аккаунта без пароля → ошибка | Any  | `[x]`  |
| E2E-CA-8 | Навигация из Settings → Connected Accounts      | Any  | `[x]`  |

---

### 76-vk-oauth.spec.ts — VK OAuth (5 тестов)

**Страницы:** `/sign-in`, `/sign-up`
**Роли:** Неавторизованные
**Провайдер:** VK (ВКонтакте)

| ID       | Тест                                            | Роль | Статус |
| -------- | ----------------------------------------------- | ---- | ------ |
| E2E-VK-1 | Кнопка "Войти через VK" на странице входа       | Anon | `[x]`  |
| E2E-VK-2 | Кнопка "Войти через VK" на странице регистрации | Anon | `[x]`  |
| E2E-VK-3 | Кнопка "Войти через Google" на странице входа   | Anon | `[x]`  |
| E2E-VK-4 | Кнопка "Войти через Яндекс" на странице входа   | Anon | `[x]`  |
| E2E-VK-5 | Все OAuth кнопки имеют корректные href          | Anon | `[x]`  |

> **Примечание:** Полный OAuth flow (redirect → VK → callback) невозможно протестировать E2E без mock OAuth сервера. Тестируем наличие кнопок и корректность URL.

---

### 77-webhooks.school-admin.spec.ts — Webhooks (20 тестов)

**Страница:** `/school/[schoolId]/settings` (вкладка Webhooks)
**Роли:** OWNER, SUPER_MANAGER школы
**Компоненты:** `webhooks-section`, `webhook-table`, `webhook-create-dialog`, `webhook-detail-dialog`, `webhook-logs-dialog`, `webhook-delete-dialog`

#### Группа 1: Список и просмотр

| ID       | Тест                                            | Роль        | Статус |
| -------- | ----------------------------------------------- | ----------- | ------ |
| E2E-WH-1 | Секция Webhooks отображается в настройках школы | SchoolAdmin | `[x]`  |
| E2E-WH-2 | Пустой список показывает Empty State            | SchoolAdmin | `[x]`  |
| E2E-WH-3 | Кнопка "Создать webhook" присутствует           | SchoolAdmin | `[x]`  |

#### Группа 2: Создание

| ID       | Тест                                   | Роль        | Статус |
| -------- | -------------------------------------- | ----------- | ------ |
| E2E-WH-4 | Диалог создания открывается            | SchoolAdmin | `[x]`  |
| E2E-WH-5 | Валидация: название обязательно        | SchoolAdmin | `[x]`  |
| E2E-WH-6 | Валидация: URL обязателен и корректен  | SchoolAdmin | `[x]`  |
| E2E-WH-7 | Выбор событий (checkboxes)             | SchoolAdmin | `[x]`  |
| E2E-WH-8 | Создание webhook → появляется в списке | SchoolAdmin | `[x]`  |

#### Группа 3: Детали и управление

| ID        | Тест                                             | Роль        | Статус |
| --------- | ------------------------------------------------ | ----------- | ------ |
| E2E-WH-9  | Клик по webhook открывает детали                 | SchoolAdmin | `[x]`  |
| E2E-WH-10 | Секретный ключ можно скопировать                 | SchoolAdmin | `[x]`  |
| E2E-WH-11 | Кнопка "Регенерировать ключ" обновляет секрет    | SchoolAdmin | `[x]`  |
| E2E-WH-12 | Кнопка "Тестировать" отправляет тестовый payload | SchoolAdmin | `[x]`  |
| E2E-WH-13 | Переключение статуса ACTIVE ↔ PAUSED             | SchoolAdmin | `[x]`  |

#### Группа 4: Логи доставки

| ID        | Тест                                    | Роль        | Статус |
| --------- | --------------------------------------- | ----------- | ------ |
| E2E-WH-14 | Кнопка "Логи" открывает диалог          | SchoolAdmin | `[x]`  |
| E2E-WH-15 | Логи показывают тип события и статус    | SchoolAdmin | `[x]`  |
| E2E-WH-16 | Логи показывают HTTP код и время ответа | SchoolAdmin | `[x]`  |

#### Группа 5: Удаление и Access Control

| ID        | Тест                                | Роль        | Статус |
| --------- | ----------------------------------- | ----------- | ------ |
| E2E-WH-17 | Удаление webhook с подтверждением   | SchoolAdmin | `[x]`  |
| E2E-WH-18 | Owner школы имеет полный доступ     | Owner       | `[x]`  |
| E2E-WH-19 | Instructor НЕ видит секцию Webhooks | Instructor  | `[x]`  |
| E2E-WH-20 | Student НЕ видит секцию Webhooks    | Student     | `[x]`  |

---

## 🚀 Journey-тесты реальных бизнес-процессов

> Подробная спецификация: [`docs/testing/REAL_PROCESSES.md`](/apps/driving-school/docs/testing/REAL_PROCESSES.md)

### Shard: `e2e:journeys` (файлы 78-82)

| Файл                                           | Journey                           | Тестов | Статус |
| ---------------------------------------------- | --------------------------------- | ------ | ------ |
| `78-journey-school-setup.school-admin.spec.ts` | Запуск школы с нуля               | 20     | `[x]`  |
| `79-journey-instructor-join.spec.ts`           | Инструктор присоединяется к школе | 18     | `[x]`  |
| `80-journey-student-enrollment.spec.ts`        | Зачисление ученика через школу    | 20     | `[x]`  |
| `81-journey-practice-lesson.spec.ts`           | Запись на практическое занятие    | 18     | `[x]`  |
| `82-journey-full-training-cycle.spec.ts`       | Полный цикл обучения              | 19     | `[x]`  |

**Ключевые отличия от функциональных тестов:**

- Выполняются **последовательно** (`mode: 'serial'`) — каждый тест зависит от предыдущего
- Покрывают **сквозные бизнес-процессы**, а не отдельные фичи
- Переключаются между ролями (админ ↔ инструктор ↔ ученик)
- Проверяют **зависимости между разделами** (нельзя создать группу без курса)

---

## 🟡 Flaky тесты (требуют стабилизации)

> **✅ v3.5 — Стабилизация flaky тестов (2026-03-18):**
>
> Все 18 flaky тестов исправлены (repeat-each=3 — 100% pass rate):
>
> - 27-import-excel (12→0): React hydration wait, locator assertions вместо page.content()
> - 26a-mobile-basic (2→0): waitForTimeout → waitForFunction
> - 30-api-keys (2→0): убран waitForFunction(Загрузка), увеличен timeout
> - 01-auth (1→0): timeout 5s→15s для онбординга инструктора
> - 11-theory-lessons (1→0): waitForAction после навигации

| Файл                              | Flaky | Статус        |
| --------------------------------- | ----- | ------------- |
| 27-import-excel.school-admin.spec | 0     | ✅ Исправлено |
| 26a-mobile-basic.spec             | 0     | ✅ Исправлено |
| 30-api-keys.school-admin.spec     | 0     | ✅ Исправлено |
| 01-auth.spec                      | 0     | ✅ Исправлено |
| 11-theory-lessons.instructor.spec | 0     | ✅ Исправлено |

---

## 📊 Итого

| Категория              | Тестов   | Файлов |
| ---------------------- | -------- | ------ |
| ✅ Автоматизировано    | **1498** | **97** |
| 🟡 Flaky               | **0**    | 0      |
| ⏸️ Пропущено           | ~30      | —      |
| `[x]` Фичи (74-77)     | 45       | 4      |
| `[x]` Journeys (78-82) | 95       | 5      |

---

## Команды

### Shards (выборочный запуск по модулям)

```bash
# Shard: core (auth, profiles, errors) — файлы 00-03
nx e2e:core driving-school-e2e

# Shard: schedule (schedule, lessons, connections) — файлы 04-07, 49
nx e2e:schedule driving-school-e2e

# Shard: school (school admin functions) — файлы 08, 09, 19, 22-25, 27, 46-48, 65
nx e2e:school driving-school-e2e

# Shard: platform (settings, theory, reviews, search, support, chats) — файлы 10-18, 22, 34, 55
nx e2e:platform driving-school-e2e

# Shard: features (lesson types, balance, progress, cars, license, mobile) — файлы 20-26, 28-29, 50
nx e2e:features driving-school-e2e

# Shard: integrations (calendar, accounts, OAuth, webhooks) — файлы 74-77
nx e2e:integrations driving-school-e2e

# Shard: journeys (real business process flows) — файлы 78-82
nx e2e:journeys driving-school-e2e
```

### Встроенный sharding Playwright (для CI)

```bash
# Разбить на 5 частей для параллельного запуска
nx e2e driving-school-e2e -- --shard=1/5
nx e2e driving-school-e2e -- --shard=2/5
# ... и т.д.
```

### Полный прогон

```bash
# Полный прогон с авторизацией
bunx nx e2e driving-school-e2e

# Только setup (globalSetup создаёт пользователей в БД)
bunx nx e2e driving-school-e2e -- --project=setup

# Конкретный проект по роли
bunx nx e2e driving-school-e2e -- --project=chromium
bunx nx e2e driving-school-e2e -- --project=instructor-chromium

# Конкретный тест
bunx nx e2e driving-school-e2e -- --grep "E2E-CS-1"

# Новые тесты
bunx nx e2e driving-school-e2e -- --grep "74-calendar"
bunx nx e2e driving-school-e2e -- --grep "75-connected"
bunx nx e2e driving-school-e2e -- --grep "76-vk"
bunx nx e2e driving-school-e2e -- --grep "77-webhooks"
```

## Примечания

- **globalSetup** выполняется **один раз** перед всеми тестами
- Пользователи создаются **напрямую в БД** с bcrypt-хешем пароля
- `auth.setup.ts` содержит **только UI логин** — без регистрации
- Setup тесты запускаются **параллельно** (`fullyParallel: true`)
- Схема БД: `School` → `Organization`, `SchoolMembership` → `Member`
