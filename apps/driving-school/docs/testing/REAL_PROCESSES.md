# Реальные бизнес-процессы автошколы — E2E спецификация

> **Статус:** ⏳ Планируется
> **Версия:** v0.220.0
> **E2E тесты:** ~95 (5 journey-файлов)
> **Цель:** Тесты эмулируют реальные процессы, а не изолированный функционал

---

## 📋 Проблема

После регистрации автошколы админ видит панель с 10 вкладками и не понимает, с чего начать. Некоторые разделы бесполезны без данных в других. Текущие E2E тесты (1358 шт.) проверяют функционал каждого раздела в изоляции, но **не покрывают последовательность реальных действий**.

---

## 🗺️ Карта зависимостей разделов

### Граф зависимостей

```
                    ┌──────────────┐
                    │  Настройки   │ ← Шаг 1: Заполнить реквизиты школы
                    │  (settings)  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
      ┌───────────┐ ┌───────────┐ ┌──────────────┐
      │  Курсы    │ │ Филиалы   │ │  Участники   │
      │ (courses) │ │(locations)│ │  (members)   │
      └─────┬─────┘ └───────────┘ └──────────────┘
            │            Шаг 2: Параллельно
            │
     ┌──────┴──────────────┐
     │                     │
     v                     v
┌─────────────┐    ┌──────────────┐
│Темы занятий │    │ Уч. группы   │ ← Шаг 3: Нужны курсы + темы
│(theory-top) │    │(study-groups)│
└──────┬──────┘    └──────┬───────┘
       │                  │
       └────────┬─────────┘
                v
       ┌────────────────┐
       │   Расписание   │ ← Шаг 4: Нужны группы + темы
       │(theory-lessons)│
       └────────┬───────┘
                │
                v
       ┌────────────────┐
       │    Ученики     │ ← Шаг 5: Нужны курсы (+ группы)
       │  (progress)    │
       └────────┬───────┘
                │
                v
       ┌────────────────┐
       │  Статистика    │ ← Шаг 6: Появляются данные
       │   (stats)      │
       └────────────────┘
```

### Матрица зависимостей

| Раздел           | Нет данных → Что показать           | Зависит от                     | Блокирует           |
| ---------------- | ----------------------------------- | ------------------------------ | ------------------- |
| **Настройки**    | Форма настроек (всегда доступна)    | —                              | —                   |
| **Курсы**        | Empty state: «Создайте первый курс» | Настройки (название школы)     | Ученики, Уч. группы |
| **Филиалы**      | Empty state: «Добавьте филиал»      | —                              | —                   |
| **Участники**    | Только владелец                     | —                              | —                   |
| **Темы занятий** | Empty state: «Создайте темы»        | —                              | Расписание          |
| **Уч. группы**   | Empty state: «Создайте группу»      | Курсы (категории)              | Расписание          |
| **Расписание**   | Empty state: «Нужны группы и темы»  | Уч. группы + Темы              | —                   |
| **Ученики**      | Empty state: «Запишите ученика»     | Курсы (для зачисления на курс) | Статистика          |
| **Статистика**   | Нули по всем KPI                    | Всё остальное                  | —                   |
| **Отзывы**       | Empty state: «Нет отзывов»          | Публичная страница             | —                   |

### Рекомендуемый порядок заполнения (UX-подсказка)

Предложение: показывать stepper/checklist на странице статистики для новой школы:

```
✅ 1. Заполните настройки школы (название, реквизиты, лого)
⬜ 2. Создайте курсы обучения (категории B, C и т.д.)
⬜ 3. Добавьте филиалы (адреса классов)
⬜ 4. Пригласите сотрудников (инструкторы, менеджеры)
⬜ 5. Создайте темы теоретических занятий
⬜ 6. Сформируйте учебные группы
⬜ 7. Составьте расписание теории
⬜ 8. Запишите первых учеников
```

### Disabled-состояния вкладок (UX-улучшение)

| Вкладка        | Условие disabled                                                | Тултип                                                |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Учебные группы | `courses.count === 0`                                           | «Сначала создайте хотя бы один курс»                  |
| Расписание     | `studyGroups.count === 0 \|\| theoryTopics.count === 0`         | «Сначала создайте учебную группу и темы занятий»      |
| Ученики        | Всегда доступен, но при `courses.count === 0` показывает баннер | «Создайте курс, чтобы зачислять учеников на обучение» |
| Статистика     | Всегда доступен                                                 | —                                                     |

---

## 🎯 Бизнес-процессы (Journeys)

### Journey 1: Запуск школы с нуля

**Актор:** Администратор школы (owner)
**Результат:** Школа готова к приёму учеников

```
Регистрация → Онбординг → Создание школы
    → Настройки (реквизиты, лого)
    → Создание курса (категория B, МКПП, цена)
    → Добавление филиала (адрес класса)
    → Приглашение инструктора (email + роль)
    → Создание тем теории (20 тем ПДД)
    → Создание учебной группы (название, расписание)
    → Создание расписания теории (группа + тема + дата)
    → ✅ Школа готова к работе
```

**Шаги (подробно):**

| #   | Действие                                                             | Раздел         | Проверка                                  |
| --- | -------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| 1   | Регистрация с ролью SCHOOL_ADMIN                                     | Onboarding     | Organization создана, Member с role=owner |
| 2   | Перенаправление на `/dashboard`                                      | Dashboard      | Видна карточка школы                      |
| 3   | Переход в настройки школы                                            | Settings       | Форма с предзаполненным названием         |
| 4   | Заполнение: описание, телефон, email, город                          | Settings       | Данные сохранены                          |
| 5   | Переход в «Курсы»                                                    | Courses        | Empty state                               |
| 6   | Создание курса: «Категория B, МКПП, 56 часов, 35000₽»                | Courses        | Курс в списке                             |
| 7   | Переход в «Филиалы»                                                  | Locations      | Empty state                               |
| 8   | Добавление филиала: название, адрес, город, телефон                  | Locations      | Филиал создан                             |
| 9   | Переход в «Участники»                                                | Members        | Только owner                              |
| 10  | Приглашение инструктора: email, роль=instructor                      | Members        | Invitation status=pending                 |
| 11  | Переход в «Темы занятий»                                             | Theory Topics  | Empty state                               |
| 12  | Создание 3 тем: «ПДД: Общие положения», «Дорожные знаки», «Разметка» | Theory Topics  | Темы в списке                             |
| 13  | Переход в «Учебные группы»                                           | Study Groups   | Empty state                               |
| 14  | Создание группы: «Группа Б-2026-01», категория B, расписание         | Study Groups   | Группа создана                            |
| 15  | Переход в «Расписание»                                               | Theory Lessons | Empty state (или список)                  |
| 16  | Создание занятия: группа + тема + дата/время                         | Theory Lessons | Занятие в расписании                      |
| 17  | Переход в «Статистика»                                               | Stats          | Школа заполнена, KPI = 0 (нет учеников)   |

---

### Journey 2: Инструктор присоединяется к школе

**Актор:** Инструктор (приглашённый по email)
**Результат:** Инструктор готов вести занятия

```
Получает ссылку-приглашение → Регистрация → Настройка профиля
    → Добавление автомобиля
    → Настройка расписания (рабочие часы)
    → Генерация слотов
    → Создание типа занятия + цена
    → ✅ Инструктор готов к записи учеников
```

**Шаги (подробно):**

| #   | Действие                                                    | Раздел             | Проверка                            |
| --- | ----------------------------------------------------------- | ------------------ | ----------------------------------- |
| 1   | Переход по ссылке `/join-school/[token]`                    | Join               | Форма с email из приглашения        |
| 2   | Заполнение: имя, телефон, пароль                            | Join               | User + Account + Member созданы     |
| 3   | Вход в систему                                              | Auth               | Авторизация успешна                 |
| 4   | Переход в профиль инструктора                               | Instructor Profile | Форма профиля                       |
| 5   | Заполнение: опыт, категории, биография                      | Instructor Profile | InstructorProfile создан            |
| 6   | Добавление автомобиля: марка, модель, МКПП, категории       | Vehicles           | InstructorVehicle создан            |
| 7   | Переход в настройки расписания                              | Schedule Settings  | Форма настроек                      |
| 8   | Установка рабочих часов: Пн-Пт 09:00-18:00                  | Schedule Settings  | ScheduleSettings сохранены          |
| 9   | Генерация слотов                                            | Schedule Settings  | TimeSlot записи созданы (AVAILABLE) |
| 10  | Создание типа занятия: «Вождение по городу, 90 мин, кат. B» | Lesson Types       | LessonType создан                   |
| 11  | Добавление цены: «500₽/занятие, скидка 10% от 10 уроков»    | Lesson Pricing     | PricingOption создана               |
| 12  | Проверка расписания: видны свободные слоты                  | Schedule           | Слоты отображаются                  |

---

### Journey 3: Зачисление ученика через школу

**Акторы:** Админ школы + Ученик
**Результат:** Ученик записан на курс, добавлен в группу

```
Админ: Регистрирует ученика вручную (или ученик подаёт заявку)
    → Админ: Зачисляет на курс (выбор курса, начальный платёж)
    → Админ: Добавляет в учебную группу
    → Ученик: Видит свой прогресс и расписание
    → ✅ Ученик в процессе обучения
```

**Шаги (подробно):**

| #   | Действие                                       | Актор  | Раздел      | Проверка                              |
| --- | ---------------------------------------------- | ------ | ----------- | ------------------------------------- |
| 1   | Переход в «Ученики»                            | Админ  | Progress    | Список учеников                       |
| 2   | Нажатие «Записать ученика»                     | Админ  | Progress    | Форма заявки                          |
| 3   | Заполнение данных: email, имя, телефон         | Админ  | Progress    | SchoolEnrollment создан               |
| 4   | Одобрение заявки                               | Админ  | Progress    | StudentProgress создан, status=ACTIVE |
| 5   | Зачисление на курс «Категория B, МКПП»         | Админ  | Progress    | CourseEnrollment создан               |
| 6   | Указание начального платежа (10000₽ из 35000₽) | Админ  | Progress    | CoursePayment создан                  |
| 7   | Добавление в группу «Б-2026-01»                | Админ  | Progress    | StudyGroupMember создан               |
| 8   | Вход ученика в систему                         | Ученик | Dashboard   | Видит прогресс                        |
| 9   | Переход в «Мой прогресс»                       | Ученик | My Progress | Видит курс, группу, расписание        |
| 10  | Просмотр расписания теории                     | Ученик | My Schedule | Занятия группы видны                  |

---

### Journey 4: Запись на практическое занятие

**Акторы:** Ученик + Инструктор
**Результат:** Урок проведён и отмечен

```
Ученик: Выбирает инструктора → Подаёт заявку
    → Инструктор: Одобряет заявку (StudentInstructorConnection)
    → Ученик: Бронирует слот (Lesson PENDING)
    → Инструктор: Подтверждает урок (CONFIRMED)
    → Инструктор: Отмечает проведение (COMPLETED)
    → ✅ Урок засчитан, прогресс обновлён
```

**Шаги (подробно):**

| #   | Действие                              | Актор      | Раздел              | Проверка                           |
| --- | ------------------------------------- | ---------- | ------------------- | ---------------------------------- |
| 1   | Переход в каталог инструкторов        | Ученик     | Search              | Список инструкторов                |
| 2   | Просмотр профиля инструктора          | Ученик     | Instructor Profile  | Расписание, авто, цены             |
| 3   | Подача заявки на обучение             | Ученик     | Enrollment          | EnrollmentRequest создан (PENDING) |
| 4   | Просмотр входящих заявок              | Инструктор | Enrollment Requests | Заявка ученика видна               |
| 5   | Одобрение заявки                      | Инструктор | Enrollment Requests | Connection создан (ACTIVE)         |
| 6   | Просмотр свободных слотов инструктора | Ученик     | Booking             | TimeSlot записи видны              |
| 7   | Бронирование слота                    | Ученик     | Booking             | Lesson создан (PENDING)            |
| 8   | Подтверждение урока                   | Инструктор | Lessons             | Lesson status=CONFIRMED            |
| 9   | Отметка о проведении                  | Инструктор | Lessons             | Lesson status=COMPLETED            |
| 10  | Проверка прогресса                    | Ученик     | My Lessons          | completedLessons +1                |

---

### Journey 5: Полный цикл обучения ученика в школе

**Акторы:** Админ + Ученик + Инструктор
**Результат:** Ученик завершил обучение, получил допуск к экзамену ГИБДД

```
Зачисление → Теория (посещение занятий)
    → Документы (медсправка, фото)
    → Практика (назначение инструктора, уроки)
    → Внутренний экзамен
    → Экзамен ГИБДД
    → ✅ Обучение завершено
```

**Шаги (подробно):**

| #   | Действие                            | Актор        | Проверка                               |
| --- | ----------------------------------- | ------------ | -------------------------------------- |
| 1   | Ученик зачислен, в группе, на курсе | Админ        | StudentProgress.status=ACTIVE          |
| 2   | Посещение теоретического занятия    | Инструктор   | TheoryAttendance отмечена (present)    |
| 3   | Загрузка медсправки                 | Ученик/Админ | StudentDocument создан (type=MEDICAL)  |
| 4   | Загрузка фото 3x4                   | Ученик/Админ | StudentDocument создан (type=PHOTO)    |
| 5   | Назначение инструктора практики     | Админ        | CategoryProgress.instructorId заполнен |
| 6   | Проведение практического урока      | Инструктор   | Lesson COMPLETED, lessonsCompleted +1  |
| 7   | Проведение ещё N уроков             | Инструктор   | practiceStatus=IN_PROGRESS             |
| 8   | Все уроки по курсу проведены        | Инструктор   | practiceStatus=COMPLETED               |
| 9   | Внутренний экзамен (теория)         | Инструктор   | ExamAttempt created                    |
| 10  | Внутренний экзамен (практика)       | Инструктор   | ExamAttempt result=PASS                |
| 11  | Регистрация на экзамен ГИБДД        | Админ        | ExamRegistration created               |
| 12  | Результат ГИБДД: сдал               | Админ        | StudentProgress обновлён               |
| 13  | Завершение обучения                 | Админ        | status=GRADUATED                       |

---

## 🧪 E2E тест-кейсы

### Файл: `78-journey-school-setup.school-admin.spec.ts` (20 тестов)

**Journey 1: Запуск школы с нуля**

| ID        | Тест                                                        | Описание                                                              | Статус |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| E2E-JS-1  | `should redirect to dashboard after school creation`        | Онбординг → школа создана → дашборд                                   | `[ ]`  |
| E2E-JS-2  | `should navigate to school settings from dashboard`         | Дашборд → настройки школы                                             | `[ ]`  |
| E2E-JS-3  | `should fill school settings (description, phone, email)`   | Настройки: описание, телефон, email                                   | `[ ]`  |
| E2E-JS-4  | `should navigate to courses and see empty state`            | Курсы: пустое состояние                                               | `[ ]`  |
| E2E-JS-5  | `should create first training course`                       | Создание курса кат. B                                                 | `[ ]`  |
| E2E-JS-6  | `should navigate to locations and create branch`            | Создание филиала с адресом                                            | `[ ]`  |
| E2E-JS-7  | `should navigate to members and invite instructor`          | Приглашение инструктора                                               | `[ ]`  |
| E2E-JS-8  | `should navigate to theory topics and create topics`        | Создание 3 тем теории                                                 | `[ ]`  |
| E2E-JS-9  | `should navigate to study groups and create group`          | Создание учебной группы                                               | `[ ]`  |
| E2E-JS-10 | `should navigate to schedule and create theory lesson`      | Создание занятия в расписании                                         | `[ ]`  |
| E2E-JS-11 | `should verify stats page shows zero KPIs`                  | Статистика: все KPI = 0                                               | `[ ]`  |
| E2E-JS-12 | `should show setup progress checklist for new school`       | Чеклист настройки на дашборде                                         | `[ ]`  |
| E2E-JS-13 | `should enable study-groups tab after course created`       | Вкладка групп доступна после курса                                    | `[ ]`  |
| E2E-JS-14 | `should enable schedule tab after group and topics created` | Вкладка расписания доступна                                           | `[ ]`  |
| E2E-JS-15 | `should show banner in students when no courses exist`      | Баннер «создайте курс» в разделе учеников                             | `[ ]`  |
| E2E-JS-16 | `should complete full school setup in sequence`             | Полный проход: настройки → курс → филиал → темы → группа → расписание | `[ ]`  |
| E2E-JS-17 | `should persist all created data after page reload`         | Перезагрузка: все данные на месте                                     | `[ ]`  |
| E2E-JS-18 | `should navigate between all sections via header nav`       | Навигация по всем вкладкам                                            | `[ ]`  |
| E2E-JS-19 | `should show correct counts in navigation badges`           | Счётчики в навигации                                                  | `[ ]`  |
| E2E-JS-20 | `should handle concurrent section editing`                  | Редактирование из двух вкладок                                        | `[ ]`  |

---

### Файл: `79-journey-instructor-join.spec.ts` (18 тестов)

**Journey 2: Инструктор присоединяется к школе**

| ID        | Тест                                                      | Описание                                                | Статус |
| --------- | --------------------------------------------------------- | ------------------------------------------------------- | ------ |
| E2E-IJ-1  | `should open join page with valid invitation token`       | Страница приглашения загружается                        | `[ ]`  |
| E2E-IJ-2  | `should show school name and role in invitation`          | Название школы и роль видны                             | `[ ]`  |
| E2E-IJ-3  | `should register via invitation form`                     | Регистрация: имя, телефон, пароль                       | `[ ]`  |
| E2E-IJ-4  | `should auto-login after invitation acceptance`           | Автоматический вход после регистрации                   | `[ ]`  |
| E2E-IJ-5  | `should see instructor dashboard after join`              | Дашборд инструктора                                     | `[ ]`  |
| E2E-IJ-6  | `should navigate to instructor profile setup`             | Переход к настройке профиля                             | `[ ]`  |
| E2E-IJ-7  | `should fill instructor profile (experience, categories)` | Профиль: опыт, категории                                | `[ ]`  |
| E2E-IJ-8  | `should add vehicle to profile`                           | Добавление автомобиля                                   | `[ ]`  |
| E2E-IJ-9  | `should navigate to schedule settings`                    | Переход к настройкам расписания                         | `[ ]`  |
| E2E-IJ-10 | `should configure working hours`                          | Рабочие часы: Пн-Пт 09:00-18:00                         | `[ ]`  |
| E2E-IJ-11 | `should generate time slots`                              | Генерация слотов                                        | `[ ]`  |
| E2E-IJ-12 | `should verify generated slots in schedule view`          | Слоты видны в расписании                                | `[ ]`  |
| E2E-IJ-13 | `should create lesson type`                               | Тип занятия: вождение, 90 мин                           | `[ ]`  |
| E2E-IJ-14 | `should add pricing option for lesson type`               | Цена: 500₽/занятие                                      | `[ ]`  |
| E2E-IJ-15 | `should see school info in instructor panel`              | Школа видна в панели инструктора                        | `[ ]`  |
| E2E-IJ-16 | `should complete full instructor setup journey`           | Полный проход: профиль → авто → расписание → тип → цена | `[ ]`  |
| E2E-IJ-17 | `should reject expired invitation token`                  | Истёкший токен → ошибка                                 | `[ ]`  |
| E2E-IJ-18 | `should reject already accepted invitation`               | Повторное использование → ошибка                        | `[ ]`  |

---

### Файл: `80-journey-student-enrollment.spec.ts` (20 тестов)

**Journey 3: Зачисление ученика через школу**

| ID        | Тест                                             | Описание                                                   | Статус |
| --------- | ------------------------------------------------ | ---------------------------------------------------------- | ------ |
| E2E-SE-1  | `should navigate to students section`            | Раздел «Ученики»                                           | `[ ]`  |
| E2E-SE-2  | `should open enrollment form`                    | Форма записи ученика                                       | `[ ]`  |
| E2E-SE-3  | `should fill student data (email, name, phone)`  | Данные ученика                                             | `[ ]`  |
| E2E-SE-4  | `should create enrollment request via school`    | SchoolEnrollment создан                                    | `[ ]`  |
| E2E-SE-5  | `should approve enrollment request`              | StudentProgress создан (ACTIVE)                            | `[ ]`  |
| E2E-SE-6  | `should enroll student to training course`       | CourseEnrollment создан                                    | `[ ]`  |
| E2E-SE-7  | `should record initial payment`                  | CoursePayment создан                                       | `[ ]`  |
| E2E-SE-8  | `should add student to study group`              | StudyGroupMember создан                                    | `[ ]`  |
| E2E-SE-9  | `should verify student appears in progress list` | Ученик в списке                                            | `[ ]`  |
| E2E-SE-10 | `should verify student sees own progress`        | Ученик видит свой прогресс                                 | `[ ]`  |
| E2E-SE-11 | `should verify student sees theory schedule`     | Ученик видит расписание группы                             | `[ ]`  |
| E2E-SE-12 | `should upload student medical certificate`      | Загрузка медсправки                                        | `[ ]`  |
| E2E-SE-13 | `should upload student photo`                    | Загрузка фото 3x4                                          | `[ ]`  |
| E2E-SE-14 | `should show document expiry warning`            | Предупреждение об истечении срока                          | `[ ]`  |
| E2E-SE-15 | `should assign practice instructor to student`   | Назначение инструктора                                     | `[ ]`  |
| E2E-SE-16 | `should show payment history for student`        | История платежей                                           | `[ ]`  |
| E2E-SE-17 | `should calculate remaining debt correctly`      | Расчёт долга                                               | `[ ]`  |
| E2E-SE-18 | `should complete full enrollment journey`        | Полный проход: запись → курс → платёж → группа → документы | `[ ]`  |
| E2E-SE-19 | `should handle enrollment when no courses exist` | Запись без курсов → предупреждение                         | `[ ]`  |
| E2E-SE-20 | `should handle duplicate enrollment attempt`     | Повторная запись → ошибка                                  | `[ ]`  |

---

### Файл: `81-journey-practice-lesson.spec.ts` (18 тестов)

**Journey 4: Запись на практическое занятие**

| ID        | Тест                                                | Описание                                                               | Статус |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| E2E-PL-1  | `should find instructor in catalog`                 | Поиск инструктора                                                      | `[ ]`  |
| E2E-PL-2  | `should view instructor profile with schedule`      | Профиль с расписанием                                                  | `[ ]`  |
| E2E-PL-3  | `should submit enrollment request to instructor`    | Заявка на обучение                                                     | `[ ]`  |
| E2E-PL-4  | `should see pending request in instructor panel`    | Инструктор видит заявку                                                | `[ ]`  |
| E2E-PL-5  | `should approve enrollment request`                 | Одобрение заявки                                                       | `[ ]`  |
| E2E-PL-6  | `should see connection in student instructors list` | Связь в списке «Мои инструкторы»                                       | `[ ]`  |
| E2E-PL-7  | `should view available time slots`                  | Свободные слоты видны                                                  | `[ ]`  |
| E2E-PL-8  | `should book a lesson slot`                         | Бронирование слота                                                     | `[ ]`  |
| E2E-PL-9  | `should see pending lesson in student schedule`     | Урок в расписании ученика (PENDING)                                    | `[ ]`  |
| E2E-PL-10 | `should see pending lesson in instructor schedule`  | Урок в расписании инструктора                                          | `[ ]`  |
| E2E-PL-11 | `should confirm lesson by instructor`               | Подтверждение урока (CONFIRMED)                                        | `[ ]`  |
| E2E-PL-12 | `should complete lesson with notes`                 | Завершение урока (COMPLETED)                                           | `[ ]`  |
| E2E-PL-13 | `should update completed lessons counter`           | Счётчик уроков +1                                                      | `[ ]`  |
| E2E-PL-14 | `should cancel lesson and free time slot`           | Отмена → слот снова AVAILABLE                                          | `[ ]`  |
| E2E-PL-15 | `should mark student no-show`                       | Неявка ученика                                                         | `[ ]`  |
| E2E-PL-16 | `should deduct from prepaid balance`                | Списание с предоплаты                                                  | `[ ]`  |
| E2E-PL-17 | `should complete full practice lesson journey`      | Полный проход: заявка → одобрение → бронь → подтверждение → проведение | `[ ]`  |
| E2E-PL-18 | `should handle booking when no slots available`     | Бронирование без слотов → сообщение                                    | `[ ]`  |

---

### Файл: `82-journey-full-training-cycle.spec.ts` (19 тестов)

**Journey 5: Полный цикл обучения**

| ID        | Тест                                              | Описание                                                                    | Статус |
| --------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| E2E-FT-1  | `should have student enrolled and in study group` | Ученик зачислен, в группе                                                   | `[ ]`  |
| E2E-FT-2  | `should mark theory attendance`                   | Отметка посещения теории                                                    | `[ ]`  |
| E2E-FT-3  | `should show theory progress in student card`     | Прогресс теории на карточке                                                 | `[ ]`  |
| E2E-FT-4  | `should upload medical certificate`               | Загрузка медсправки                                                         | `[ ]`  |
| E2E-FT-5  | `should upload student photo`                     | Загрузка фото                                                               | `[ ]`  |
| E2E-FT-6  | `should show all documents as uploaded`           | Все документы загружены                                                     | `[ ]`  |
| E2E-FT-7  | `should assign practice instructor`               | Назначение инструктора                                                      | `[ ]`  |
| E2E-FT-8  | `should complete first practice lesson`           | Первый урок практики                                                        | `[ ]`  |
| E2E-FT-9  | `should track practice lessons progress`          | Прогресс практики (N/56 уроков)                                             | `[ ]`  |
| E2E-FT-10 | `should complete all required practice lessons`   | Все уроки проведены                                                         | `[ ]`  |
| E2E-FT-11 | `should register for internal theory exam`        | Регистрация на внутренний теор. экзамен                                     | `[ ]`  |
| E2E-FT-12 | `should record internal theory exam result`       | Результат внутреннего теор. экзамена                                        | `[ ]`  |
| E2E-FT-13 | `should register for internal practice exam`      | Регистрация на внутренний практ. экзамен                                    | `[ ]`  |
| E2E-FT-14 | `should record internal practice exam result`     | Результат внутреннего практ. экзамена                                       | `[ ]`  |
| E2E-FT-15 | `should register for GIBDD exam`                  | Регистрация на экзамен ГИБДД                                                | `[ ]`  |
| E2E-FT-16 | `should record GIBDD exam passed`                 | Экзамен ГИБДД: сдал                                                         | `[ ]`  |
| E2E-FT-17 | `should mark student as graduated`                | Статус: GRADUATED                                                           | `[ ]`  |
| E2E-FT-18 | `should verify final statistics updated`          | Статистика обновлена                                                        | `[ ]`  |
| E2E-FT-19 | `should complete full training cycle end-to-end`  | Полный цикл: зачисление → теория → документы → практика → экзамены → выпуск | `[ ]`  |

---

## 📊 Итого

| Файл                                           | Journey                   | Тестов |
| ---------------------------------------------- | ------------------------- | ------ |
| `78-journey-school-setup.school-admin.spec.ts` | Запуск школы с нуля       | 20     |
| `79-journey-instructor-join.spec.ts`           | Инструктор присоединяется | 18     |
| `80-journey-student-enrollment.spec.ts`        | Зачисление ученика        | 20     |
| `81-journey-practice-lesson.spec.ts`           | Практическое занятие      | 18     |
| `82-journey-full-training-cycle.spec.ts`       | Полный цикл обучения      | 19     |
| **Итого**                                      | **5 journeys**            | **95** |

### Shard

Все файлы: `e2e:journeys` (новый shard, файлы 78-82)

```bash
nx e2e:journeys driving-school-e2e
```

---

## 🔗 Связь с существующими тестами

Существующие тесты покрывают **функционал каждого раздела в изоляции**:

| Journey      | Существующие тесты (функциональные)                                                               | Новые тесты (journey)          |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| Запуск школы | 65-school-create, 19-settings, 48-courses, 47-locations, 08-study-groups, 09a-topics, 09b-lessons | 78-journey-school-setup        |
| Инструктор   | 41-join-flows, 64-join-extended, 03-profile, 04a-settings, 20-lesson-types, 50-pricing            | 79-journey-instructor-join     |
| Зачисление   | 22-school-progress, 25-student-progress, 27-import-excel                                          | 80-journey-student-enrollment  |
| Практика     | 29a-enrollment, 05-lessons.instructor, 06-lessons.student, 07-connections                         | 81-journey-practice-lesson     |
| Полный цикл  | 55-theory-attendance, 12-exams, 24a-driver-license                                                | 82-journey-full-training-cycle |

**Ключевое отличие:** Существующие тесты проверяют «кнопка работает?». Новые тесты проверяют «процесс работает от начала до конца?».

---

## 🎯 Критерии приёмки

- [ ] Все 95 тестов проходят
- [ ] Каждый journey запускается независимо (свой setup)
- [ ] Journey-тесты выполняются последовательно (НЕ parallel) — они зависят от порядка
- [ ] Тесты используют реальные данные (не моки)
- [ ] При падении теста ясно, на каком шаге процесс сломался
- [ ] Новый shard `e2e:journeys` работает в CI

---

## ⚙️ Технические требования

### Setup

Каждый journey-файл:

1. Использует `test` из `./fixtures/base-test` (SSE блокировка)
2. Запускает `test.describe.configure({ mode: 'serial' })` — тесты в файле выполняются последовательно
3. Создаёт тестовые данные в `beforeAll` через API/actions (не через UI для скорости)
4. Очищает данные в `afterAll`

### Авторизация

- Journey 1, 3: `storageState: 'playwright/.auth/school-admin.json'`
- Journey 2: Отдельный flow регистрации (нет storageState)
- Journey 4: Переключение между `student.json` и `instructor.json`
- Journey 5: Переключение между `school-admin.json`, `instructor.json`, `student.json`

### Структура теста

```typescript
import { expect, test } from './fixtures/base-test'

test.describe('Journey: School Setup', () => {
  test.describe.configure({ mode: 'serial' })

  // Общий контекст между тестами
  let schoolId: string
  let courseId: string

  test('E2E-JS-1 — should redirect to dashboard after school creation', async ({ page }) => {
    // ...
    schoolId = extractSchoolId(page.url())
  })

  test('E2E-JS-5 — should create first training course', async ({ page }) => {
    // Использует schoolId из предыдущего теста
    await page.goto(`/school/courses/${schoolId}`)
    // ...
  })
})
```

---

**Последнее обновление:** 2026-02-04
