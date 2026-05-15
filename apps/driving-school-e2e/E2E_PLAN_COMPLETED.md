# E2E Test Plan - Completed & History

> **Архив:** История версий, исправления и выполненные фазы
>
> **Актуальный план:** [E2E_PLAN.md](./E2E_PLAN.md)

---

## История версий

| Дата       | Версия | Изменения                                                                                                               |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-01-19 | 2.19   | Фаза 3 расширения покрытия: +50 тестов (отзывы, расписание, статистика, join flows, mobile, offline). 1016 тестов       |
| 2026-01-19 | 2.18   | Рефакторинг E2E (5 фаз): хелперы, унификация ID, разбиение файлов, улучшение локаторов. 966 тестов в 80 файлах          |
| 2026-01-17 | 2.17   | +104 теста: расширены 10 файлов (+38), 6 новых файлов для динамических маршрутов (+45), CRUD покрытие (+12). 975 тестов |
| 2026-01-17 | 2.16   | settings/page.tsx: добавлен Heading, 30-api-keys: исправлен селектор. 466 passed, 4 flaky                               |
| 2026-01-17 | 2.15   | api-logs.action.ts: schoolId → organizationId, 13-reviews: улучшен тест пустого состояния. 472+ passed                  |
| 2026-01-17 | 2.14   | Селекторы data-testid, Playwright config: workers 4→2, исправлены 5 spec файлов. 469 passed                             |
| 2026-01-17 | 2.13   | +56 тестов: Phase 7 Mobile UX (24), Phase 8 Import Excel (21) + API Keys (11). 454/26/20                                |
| 2026-01-17 | 2.12   | ✅ Верификация: 297 passed, 5 flaky (owner panel), 24 skipped, 0 failed                                                 |
| 2026-01-17 | 2.11   | +14 тестов (запись на занятие, отсутствие инструктора, профиль КПП/город, перенос занятия). 304+                        |
| 2026-01-17 | 2.10   | Финальные skip-логи (2 файла), test.skip() с причиной. Все условные expects документированы                             |
| 2026-01-17 | 2.9    | Условные expects: skip-сообщения в 4 файлах (13 случаев). Удалён test.helpers.ts                                        |
| 2026-01-17 | 2.8    | `.catch(() => {})` документация, условные expects в 3 файлах (~31 случай), test.skip cleanup                            |
| 2026-01-17 | 2.7    | `waitForTimeout()` документация (8 usages), `force: true` документация (9 usages), условные expects                     |
| 2026-01-17 | 2.6    | Исправлены 23 `expect(true)`, документированы 6 `waitForTimeout`, создан test.helpers.ts                                |
| 2026-01-17 | 2.5    | Исправлены 31 `.catch(() => {})`, убраны 3 skip теста неавторизованных                                                  |
| 2026-01-17 | 2.4    | ExamSession создание, селекторы форм, retry для flaky. 280+/~26/≤3                                                      |
| 2026-01-17 | 2.3    | ZenStack getStudentInstructors() баг, globalTimeout 600s, Owner pages skip                                              |
| 2026-01-17 | 2.2    | kill-e2e-port.js хук для Windows, Support tickets Chakra Select, ZenStack nested include                                |
| 2026-01-17 | 2.1    | Удалён networkidle из 14 файлов (43 вхождения) — SSE блокировал тесты                                                   |
| 2026-01-16 | 2.0    | ZenStack v3.2.1 include баг, MailHog IDN домены, EMAIL_FROM fallback                                                    |
| 2026-01-16 | 1.9    | Owner tests: обработка "Ошибка загрузки данных"                                                                         |
| 2026-01-16 | 1.8    | Owner page: Client Components для иконок, instructor profile: обновлены селекторы                                       |
| 2026-01-16 | 1.7    | ZenStack v3.2.1 баг с auth().roles — создан кастомный тип Auth с булевыми флагами                                       |
| 2026-01-15 | 1.4    | Race condition fix: логин перенесён в globalSetup. 182 passed                                                           |
| 2026-01-15 | 1.3    | Исправлен тест 404. 154 passed, 136 failed (race condition)                                                             |
| 2026-01-04 | 1.1    | Добавлен globalSetup для параллельного запуска auth.setup.ts                                                            |
| 2026-01-04 | 1.0    | Создан план из BY_KAMI_HANDS_TESTING_PLAN.md                                                                            |

---

## Выполненные исправления (детально)

### v2.19 — Фаза 3 расширения покрытия

- **+50 тестов:** Расширено покрытие с 966 до 1016 тестов в 80 файлах
- **Итерация 11:** `09d-school-reviews.school-admin.spec.ts` (+8) — фильтрация, сортировка, ответы, модерация
- **Итерация 12:** `04b-schedule-slots.instructor.spec.ts` (+6) — повторяющиеся слоты, конфликты, копирование
- **Итерация 13:** `04c-schedule-absences.instructor.spec.ts` (+5) — причины, редактирование, уведомления
- **Итерация 14:** `09c-school-stats.school-admin.spec.ts` (+6) — экспорт CSV/PDF, сравнение периодов
- **Итерация 15:** `64-join-flows-extended.spec.ts` (+6) — полные flows регистрации и восстановления
- **Итерация 16:** `26a-d-mobile-*.spec.ts` (+12) — hamburger меню, gestures, bottom sheet, responsive
- **Итерация 17:** `52-offline-mode.spec.ts` (+7) — синхронизация, конфликты, кэширование, очередь

### v2.18 — Рефакторинг E2E (5 фаз)

- **Фаза 1:** Создание E2E хелперов (page, auth, locators, form) — `5498807d`
- **Фаза 2:** Применение хелперов к файлам 02, 05, 10, 17 — `5ea00727`
- **Фаза 3:** Унификация ID тестов (E2E-\* формат, 966 тестов) — `777e341c`
- **Фаза 4:** Разбиение крупных файлов (72→80 файлов, ~24000 строк) — `683c4018`
- **Фаза 5:** Замена .chakra-_ на Locators._ (49→0 хрупких селекторов) — `99d2883e`

### v2.17 — Итерация 5 (+104 теста)

- **Часть 1:** Расширены 10 файлов с низким покрытием (+38 тестов)
  - `13-reviews.student.spec.ts`, `21-student-balance.instructor.spec.ts`, `20-lesson-types.instructor.spec.ts`
  - `22-school-progress.school-admin.spec.ts`, `24-driver-license.*.spec.ts`, `00-errors.spec.ts`
  - `23-car-search.student.spec.ts`, `39-onboarding.spec.ts`, `40-instructor-onboarding.instructor.spec.ts`
- **Часть 2:** 6 новых файлов для динамических маршрутов (+45 тестов)
  - `60-dynamic-chats.spec.ts` — `/chats/[id]/` (8 тестов)
  - `61-dynamic-support.spec.ts` — `/support/[id]/` (8 тестов)
  - `62-dynamic-instructors.spec.ts` — `/instructors/[id]/` (8 тестов)
  - `63-dynamic-schools.spec.ts` — `/schools/[id]/` (7 тестов)
  - `64-join-flows-extended.spec.ts` — `/join-*/[token]/` (6 тестов)
  - `65-school-create.school-admin.spec.ts` — `/school/create/` (8 тестов)
- **Часть 3:** Расширено CRUD покрытие (+12 тестов)

### v2.16 — Итерация 16

- **settings/page.tsx:** добавлен `<Heading>Настройки школы</Heading>` для видимости в тестах
- **30-api-keys.school-admin.spec.ts:** исправлен селектор P8-4.5 — ограничен поиск input диалогом
- **4 flaky теста** (не связаны с текущими исправлениями):
  - `01-auth.spec.ts:369` — онбординг инструктора (длительная регистрация)
  - `14-search.spec.ts:172` — каталог школ (зависит от данных)
  - `12-exams.instructor.spec.ts:61` — результаты экзамена
  - `26-mobile-ux.spec.ts:324` — карточки занятий (таймаут)

### v2.15 — Итерация 15

- **api-logs.action.ts:** исправлен баг `schoolId` → `organizationId` в модели ApiLog
- **13-reviews.instructor.spec.ts:** улучшен тест пустого состояния — обработка NO_PROFILE

### v2.14 — Итерация 14

- **Селекторы data-testid:** Добавлены в BottomNav, Import Wizard
- **Playwright config:** workers 4→2, Chrome memory flags
- **Исправлены 5 spec файлов:** селекторы, обработка edge cases

### v2.13 — Итерация 13

- **Mobile UX (24 теста):** `26-mobile-ux.spec.ts`
- **Import Excel (21 тест):** `27-import-excel.school-admin.spec.ts`
- **API Keys (11 тестов):** `30-api-keys.school-admin.spec.ts`

### v2.11 — Итерация 11

- **Запись на занятие (5 тестов):** страница расписания, слоты, запись, статус PENDING
- **Ограничения при бронировании (2 теста):** пересекающееся время, заблокированный слот
- **Отсутствие инструктора (3 теста):** VACATION, блокировка слотов, разблокировка
- **Горизонт планирования (1 тест):** изменение с 30 на 60 дней
- **Профиль инструктора (2 теста):** тип КПП, город работы
- **Перенос занятия (1 тест)**

### v2.0 — ZenStack v3.2.1 баги

- **ZenStack include баг:** reviews и balance actions используют `prisma` напрямую
- **MailHog IDN домены:** punycode конвертация для кириллических доменов
- **EMAIL_FROM fallback:** поддержка env переменной в `@letar/email`

### v1.7 — ZenStack auth().roles баг

**Проблема:** Нельзя использовать `ROLE in auth().roles` или `has(auth().roles, ROLE)` из-за ошибки "ошибочный литерал массива: OWNER".

**Решение:** Создан кастомный тип `Auth` с булевыми флагами (`isOwner`, `isModerator`, `isFreelanceInstructor`) вместо массива `roles`. В `lib/db.ts` добавлена функция `rolesToAuthInfo()` для конвертации. Политики доступа теперь используют `auth().isOwner` вместо `has(auth().roles, OWNER)`.

---

## Выполненные фазы

### Фаза 0: Инфраструктура ✅

**Файлы:** `src/global-setup.ts`, `src/fixtures/auth.setup.ts`, `src/01-auth.spec.ts`

| #   | Задача                                   | Статус |
| --- | ---------------------------------------- | ------ |
| 0.1 | Обновить селекторы в `registerUser()`    | ✅     |
| 0.2 | Обновить `loginUser()` — placeholder'ы   | ✅     |
| 0.3 | Убрать `test.skip` с теста регистрации   | ✅     |
| 0.4 | globalSetup: создание пользователей в БД | ✅     |
| 0.5 | Параллельный запуск auth.setup.ts        | ✅     |

**Архитектура:**

```
globalSetup.ts (1 раз перед всеми тестами)
├── Создать пользователей в БД напрямую (bcrypt hash)
├── Активировать email (emailVerified = new Date())
└── Создать профили (InstructorProfile, Organization, роли)

auth.setup.ts (4 теста ПАРАЛЛЕЛЬНО)
├── authenticate as instructor — только логин + save storage
├── authenticate as student — только логин + save storage
├── authenticate as school-admin — только логин + save storage
└── authenticate as owner — только логин + save storage
```

**Ключевые файлы:**

- `src/global-setup.ts` — создание пользователей в БД
- `src/helpers/db.helpers.ts` — функции `createTestUser`, `ensureInstructorProfile`, `ensureSchoolAdmin`, `ensureOwnerRole`
- `src/fixtures/auth.setup.ts` — только UI логин и сохранение storage state
- `src/helpers/mailhog.helpers.ts` — хелперы для работы с MailHog

### Фаза 1: Страницы ошибок (6 тестов) ✅

**Файл:** `src/00-errors.spec.ts`

| #     | Тест                                        | Статус |
| ----- | ------------------------------------------- | ------ |
| 1.0.1 | Открыть несуществующую страницу → 404       | ✅     |
| 1.0.2 | Дизайн 404: заголовок "Страница не найдена" | ✅     |
| 1.0.3 | Дизайн 404: описание ошибки                 | ✅     |
| 1.0.4 | Дизайн 404: кнопка "На главную"             | ✅     |
| 1.0.5 | Дизайн 404: кнопка работает                 | ✅     |
| 1.0.6 | Адаптивность 404 на мобильном               | ✅     |

### Фаза 2: Регистрация и Auth (21 тест) ✅

**Файл:** `src/01-auth.spec.ts`

| #      | Тест                                      | Статус |
| ------ | ----------------------------------------- | ------ |
| 1.1.1  | Открыть главную страницу (/)              | ✅     |
| 1.1.2  | Перейти на /sign-up                       | ✅     |
| 1.1.3  | Регистрация (email + пароль + чекбоксы)   | ✅     |
| 1.1.3a | Регистрация с существующим email → ошибка | ✅     |
| 1.1.3b | Подтверждение email PIN-кодом             | ✅     |
| 1.1.4  | Онбординг ученика: роль, имя, город       | ✅     |
| 1.1.5  | Выход из аккаунта                         | ✅     |
| 1.1.6  | Онбординг инструктора (полный цикл)       | ✅     |
| 1.1.7  | Регистрация нового пользователя           | ✅     |
| 1.1.8  | Онбординг администратора школы            | ✅     |
| 1.1.9  | Форма входа отображается                  | ✅     |
| 1.1.11 | Вход с неверным паролем → ошибка          | ✅     |
| 1.1.16 | Выход из аккаунта (инструктор)            | ✅     |
| 1.1.17 | Вход с пустыми полями отклоняется         | ✅     |
| 1.1.18 | Вход с правильными данными                | ✅     |
| 1.1.21 | Восстановление пароля                     | ✅     |

**Дополнительные тесты:**

- ✅ Валидация слабого пароля
- ✅ Валидация обязательной оферты
- ✅ Навигация вход↔регистрация
- ✅ Редирект неавторизованного
- ✅ Forgot password — ссылка из входа
- ✅ Forgot password — валидация email
- ✅ Forgot password — ссылка на вход

---

## Документация инфраструктуры

### MailHog

- SMTP: `localhost:1025`
- Web UI: `localhost:8025`
- API: `http://localhost:8025/api/v2/messages`

**Запуск:** `docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog`

### База данных

- Переменные окружения загружаются из `apps/driving-school/.env.local` через `@next/env`
- `DATABASE_URL` берётся из `.env.local` основного приложения
- Используется `@prisma/client` из `apps/driving-school/src/generated/prisma/`
- ⚠️ **Важно:** Используй `require()` вместо `await import()` в db.helpers для избежания ESM timeout в playwright globalSetup

### Освобождение порта

**Хук `.claude/hooks/kill-e2e-port.js` АВТОМАТИЧЕСКИ убивает порт перед запуском E2E тестов.**

```bash
# Ручное освобождение порта
npx kill-port 3003

# Проверка занятости порта
netstat -ano | findstr "LISTENING" | findstr ":3003"
```

**Требования к хуку (Windows):**

- Использует `spawnSync` с `shell: true` для корректной работы `.cmd` файлов
- Порт из `PORT_MAP` (hardcoded) — shell injection невозможен
