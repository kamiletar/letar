# Фаза 19: Качество обучения и аналитика

> **Статус:** ⏳ Планируется
> **Версия:** v0.211.0 → v0.215.0
> **Unit-тесты:** ~35
> **E2E тесты:** ~30

---

## 📋 Описание фазы

Система оценки качества занятий с фидбеком от учеников и аналитикой эффективности инструкторов.

**Ключевые функции:**

- Модель `LessonFeedback` для оценок занятий
- FeedbackDialog после завершения занятия
- Аналитика инструкторов (рейтинг, эффективность)
- Leaderboard инструкторов
- Периодические опросы NPS
- KPI панель для менеджера

---

## 🗄️ Модель данных

### LessonFeedback

```typescript
interface LessonFeedback {
  id: string
  lessonId: string

  // Оценки (1-5)
  overallRating: number // Общая оценка
  instructorRating: number // Оценка инструктора
  vehicleRating?: number // Оценка авто (опционально)

  // Качественные аспекты
  wasOnTime?: boolean // Пришёл вовремя
  wasPatient?: boolean // Был терпелив
  explainedWell?: boolean // Хорошо объяснял
  feltSafe?: boolean // Чувствовал себя безопасно

  // Текстовый отзыв
  comment?: string
  isPublic: boolean // Показывать в профиле

  createdAt: Date
}
```

### InstructorStats (агрегированная)

```typescript
interface InstructorStats {
  instructorId: string
  period: 'week' | 'month' | 'quarter' | 'year' | 'all'

  // Занятия
  lessonsCount: number
  lessonsCompleted: number
  lessonsCancelled: number

  // Рейтинги
  avgOverallRating: number
  avgInstructorRating: number
  avgVehicleRating: number
  feedbackCount: number

  // Качество
  onTimePercent: number
  patientPercent: number
  explainedWellPercent: number
  feltSafePercent: number

  // Результаты
  studentsTotal: number
  studentsCompleted: number
  passRateFirst: number // % сдачи с 1 раза
  passRateOverall: number // % сдачи всего

  // Активность
  avgLessonsPerWeek: number
  utilizationPercent: number // Загрузка расписания
}
```

### StudentSurvey (NPS)

```typescript
interface StudentSurvey {
  id: string
  studentId: string
  schoolId: string

  type: 'NPS' | 'CSAT' | 'CUSTOM'
  trigger: 'course_completed' | 'milestone' | 'periodic'

  responses: SurveyResponse[]

  submittedAt: Date
}

interface SurveyResponse {
  questionId: string
  questionType: 'scale' | 'text' | 'choice'
  value: string | number
}
```

---

## 🧩 Компоненты

### 1. FeedbackDialog (`feedback-dialog.tsx`)

Диалог оценки после занятия:

```tsx
<FeedbackDialog lesson={completedLesson} onSubmit={submitFeedback}>
  <FeedbackDialog.Header>Как прошло занятие с {instructor.name}?</FeedbackDialog.Header>

  <FeedbackDialog.Body>
    <Field label="Общая оценка">
      <RatingStars value={rating} onChange={setRating} />
    </Field>

    <Field label="Инструктор">
      <RatingStars value={instructorRating} onChange={setInstructorRating} />
    </Field>

    <CheckboxGroup label="Что понравилось?">
      <Checkbox value="onTime">Пришёл вовремя</Checkbox>
      <Checkbox value="patient">Был терпелив</Checkbox>
      <Checkbox value="explained">Хорошо объяснял</Checkbox>
      <Checkbox value="safe">Я чувствовал себя безопасно</Checkbox>
    </CheckboxGroup>

    <Field label="Комментарий (опционально)">
      <Textarea placeholder="Что можно улучшить?" />
    </Field>
  </FeedbackDialog.Body>
</FeedbackDialog>
```

### 2. InstructorLeaderboard (`instructor-leaderboard.tsx`)

Таблица лидеров среди инструкторов:

- Рейтинг
- Количество занятий
- % сдачи экзамена с 1 раза
- Загрузка расписания
- Медаль для топ-3

### 3. InstructorAnalyticsCard (`instructor-analytics-card.tsx`)

Карточка аналитики инструктора:

- Все метрики InstructorStats
- Графики трендов
- Сравнение со средним по школе

### 4. RatingStars (`rating-stars.tsx`)

Компонент звёздного рейтинга:

- Интерактивный (для формы)
- Read-only (для отображения)
- Half-stars для точного рейтинга

### 5. StudentSurvey (`student-survey.tsx`)

Компонент опроса:

- NPS шкала (0-10)
- Текстовые вопросы
- Multiple choice
- Сохранение прогресса

---

## 🧪 Unit-тесты

### Файл: `lib/feedback/feedback.spec.ts`

| ID     | Группа  | Сценарий                                 | Статус |
| ------ | ------- | ---------------------------------------- | ------ |
| FB-U01 | Create  | Создание feedback после занятия          | ⏳     |
| FB-U02 | Create  | Валидация rating (1-5)                   | ⏳     |
| FB-U03 | Create  | Валидация instructorRating (1-5)         | ⏳     |
| FB-U04 | Create  | Опциональный vehicleRating               | ⏳     |
| FB-U05 | Create  | Опциональный comment                     | ⏳     |
| FB-U06 | Create  | Checkbox аспекты качества                | ⏳     |
| FB-U07 | Unique  | Один feedback на занятие                 | ⏳     |
| FB-U08 | Query   | Получение feedback по занятию            | ⏳     |
| FB-U09 | Query   | Получение всех feedback инструктора      | ⏳     |
| FB-U10 | Query   | Фильтрация по периоду                    | ⏳     |
| FB-U11 | Privacy | isPublic false — не показывать в профиле | ⏳     |
| FB-U12 | Privacy | isPublic true — показывать в профиле     | ⏳     |
| FB-U13 | Access  | Ученик может создать feedback            | ⏳     |
| FB-U14 | Access  | Инструктор не может создать              | ⏳     |
| FB-U15 | Access  | Ученик видит свои feedback               | ⏳     |

**Итого Feedback:** 15 тестов

### Файл: `lib/analytics/instructor-analytics.spec.ts`

| ID     | Сценарий                                   | Статус |
| ------ | ------------------------------------------ | ------ |
| IA-U01 | calculateAvgRating корректно               | ⏳     |
| IA-U02 | calculatePassRate с результатами экзаменов | ⏳     |
| IA-U03 | calculateUtilization на основе расписания  | ⏳     |
| IA-U04 | getQualityPercentages по checkbox          | ⏳     |
| IA-U05 | aggregateStats по периодам                 | ⏳     |
| IA-U06 | compareWithSchoolAverage                   | ⏳     |
| IA-U07 | getTrend за N периодов                     | ⏳     |
| IA-U08 | getLeaderboard сортировка по рейтингу      | ⏳     |
| IA-U09 | getLeaderboard топ-N инструкторов          | ⏳     |
| IA-U10 | getRank позиция инструктора                | ⏳     |

**Итого Analytics:** 10 тестов

### Файл: `lib/surveys/surveys.spec.ts`

| ID     | Сценарий                                     | Статус |
| ------ | -------------------------------------------- | ------ |
| SV-U01 | Создание NPS опроса                          | ⏳     |
| SV-U02 | Сохранение scale ответа                      | ⏳     |
| SV-U03 | Сохранение text ответа                       | ⏳     |
| SV-U04 | Расчёт NPS score                             | ⏳     |
| SV-U05 | Группировка по promoters/passives/detractors | ⏳     |
| SV-U06 | Триггер по завершению курса                  | ⏳     |
| SV-U07 | Периодический триггер                        | ⏳     |
| SV-U08 | Не показывать завершённый опрос              | ⏳     |
| SV-U09 | Получение pending опросов                    | ⏳     |
| SV-U10 | Агрегация по школе                           | ⏳     |

**Итого Surveys:** 10 тестов

---

## 🧪 E2E тесты

### Файл: `27-quality.spec.ts`

#### Оценка занятия

| №   | Тест                                       | Описание                    |
| --- | ------------------------------------------ | --------------------------- |
| 1   | `should show feedback dialog after lesson` | Диалог после занятия        |
| 2   | `should require overall rating`            | Обязательная общая оценка   |
| 3   | `should submit rating with stars`          | Отправка звёздного рейтинга |
| 4   | `should submit instructor rating`          | Оценка инструктора          |
| 5   | `should submit optional vehicle rating`    | Опциональная оценка авто    |
| 6   | `should select quality checkboxes`         | Выбор чекбоксов качества    |
| 7   | `should submit optional comment`           | Опциональный комментарий    |
| 8   | `should toggle public visibility`          | Публичность отзыва          |
| 9   | `should show success message`              | Сообщение успеха            |
| 10  | `should skip feedback dialog`              | Пропуск диалога             |

#### Аналитика инструкторов

| №   | Тест                                       | Описание               |
| --- | ------------------------------------------ | ---------------------- |
| 11  | `should display instructor analytics page` | Страница аналитики     |
| 12  | `should show instructor leaderboard`       | Таблица лидеров        |
| 13  | `should highlight top 3 instructors`       | Подсветка топ-3        |
| 14  | `should display avg rating`                | Средний рейтинг        |
| 15  | `should display pass rate`                 | % сдачи экзамена       |
| 16  | `should display lessons count`             | Количество занятий     |
| 17  | `should display utilization`               | Загрузка расписания    |
| 18  | `should filter by period`                  | Фильтр по периоду      |
| 19  | `should compare with school average`       | Сравнение со средним   |
| 20  | `should show rating trend chart`           | График тренда рейтинга |

#### NPS опросы

| №   | Тест                                             | Описание                     |
| --- | ------------------------------------------------ | ---------------------------- |
| 21  | `should show NPS survey after course completion` | Опрос после курса            |
| 22  | `should submit NPS score`                        | Отправка NPS оценки          |
| 23  | `should submit improvement suggestions`          | Предложения улучшений        |
| 24  | `should dismiss survey`                          | Отклонение опроса            |
| 25  | `should display NPS results to owner`            | Результаты NPS для владельца |
| 26  | `should show promoters/detractors breakdown`     | Разбивка NPS                 |
| 27  | `should filter NPS by date range`                | Фильтр NPS по дате           |

#### Профиль инструктора

| №   | Тест                                       | Описание                   |
| --- | ------------------------------------------ | -------------------------- |
| 28  | `should display public reviews in profile` | Публичные отзывы в профиле |
| 29  | `should show quality badges in profile`    | Badges качества            |
| 30  | `should display rating in instructor card` | Рейтинг в карточке         |

**Итого E2E:** 30 тестов

---

## 📂 Файловая структура

```
apps/driving-school/src/
├── app/
│   ├── (school-admin)/school/[id]/instructors/analytics/
│   │   ├── page.tsx                      # Аналитика инструкторов
│   │   └── _components/
│   │       ├── instructor-leaderboard.tsx
│   │       ├── instructor-analytics-card.tsx
│   │       └── quality-trend-chart.tsx
│   ├── (student)/my-lessons/[id]/
│   │   └── _components/
│   │       └── feedback-dialog.tsx       # Диалог оценки
│   └── (owner)/owner/nps/
│       ├── page.tsx                      # Результаты NPS
│       └── _components/
│           └── nps-dashboard.tsx
├── _components/
│   ├── rating-stars.tsx
│   └── student-survey.tsx
├── _actions/
│   └── quality/
│       ├── feedback.action.ts
│       ├── analytics.action.ts
│       └── surveys.action.ts
└── lib/
    ├── feedback/
    │   ├── feedback.ts
    │   └── feedback.spec.ts
    ├── analytics/
    │   ├── instructor-analytics.ts
    │   └── instructor-analytics.spec.ts
    └── surveys/
        ├── surveys.ts
        └── surveys.spec.ts
```

---

## 📊 KPI инструкторов

| Метрика         | Формула                               | Цель   |
| --------------- | ------------------------------------- | ------ |
| Avg Rating      | sum(ratings) / count                  | > 4.5  |
| Pass Rate       | passed / attempts \* 100              | > 75%  |
| First Pass Rate | passed_first / attempts \* 100        | > 60%  |
| Utilization     | booked_slots / available_slots \* 100 | 70-90% |
| On-Time %       | on_time_count / feedbacks \* 100      | > 95%  |
| Completion Rate | completed / started \* 100            | > 90%  |

---

## 🎯 Критерии приёмки

- [ ] Модель LessonFeedback создана в schema.zmodel
- [ ] FeedbackDialog появляется после завершения занятия
- [ ] RatingStars работает интерактивно
- [ ] Leaderboard отображает топ инструкторов
- [ ] Все метрики рассчитываются корректно
- [ ] NPS опрос появляется после курса
- [ ] NPS score рассчитывается (promoters - detractors)
- [ ] Публичные отзывы отображаются в профиле инструктора
- [ ] Все 35 unit-тестов проходят
- [ ] Все 30 E2E тестов проходят

---

**Последнее обновление:** 2026-01-19
