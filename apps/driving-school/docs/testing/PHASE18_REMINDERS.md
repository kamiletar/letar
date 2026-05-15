# Фаза 18: Автоматические напоминания

> **Статус:** ⏳ Планируется
> **Версия:** v0.206.0 → v0.210.0
> **Unit-тесты:** ~40
> **E2E тесты:** ~25

---

## 📋 Описание фазы

Система автоматических напоминаний с настраиваемыми правилами, scheduled jobs и эскалацией.

**Ключевые функции:**

- Модель `ReminderRule` для настройки правил
- Cron job для ежедневной проверки
- Push/Email/Telegram уведомления
- Эскалация менеджеру при игнорировании
- История отправленных напоминаний
- Массовые уведомления

---

## 🗄️ Модель данных

### ReminderRule

```typescript
interface ReminderRule {
  id: string
  organizationId: string

  type: ReminderType
  enabled: boolean

  // Конфигурация
  triggerDays: number[]     // [30, 14, 7, 3, 1]
  channels: string[]        // ["push", "email", "telegram"]
  sendTo: string[]          // ["student", "instructor", "manager"]

  // Эскалация
  escalateToManager: boolean
  escalateAfterDays?: number

  // Шаблон
  messageTemplate?: string
}

enum ReminderType {
  MEDICAL_CERT_EXPIRING  // Истекает медсправка
  PAYMENT_OVERDUE        // Просроченный платёж
  INACTIVE_STUDENT       // Нет занятий >N дней
  EXAM_UPCOMING          // Предстоящий экзамен
  LESSON_TOMORROW        // Занятие завтра
  DOCUMENTS_PENDING      // Документы ожидают долго
  CONTRACT_EXPIRING      // Истекает договор
}
```

### ReminderHistory

```typescript
interface ReminderHistory {
  id: string
  ruleId: string
  recipientId: string
  recipientType: 'student' | 'instructor' | 'manager'

  channel: 'push' | 'email' | 'telegram'
  status: 'sent' | 'failed' | 'delivered' | 'read'

  sentAt: Date
  deliveredAt?: Date
  readAt?: Date

  // Ссылка на объект напоминания
  relatedType: string // "document", "payment", "lesson"
  relatedId: string
}
```

---

## 🧩 Компоненты

### 1. ReminderSettings (`reminder-settings.tsx`)

Страница настроек напоминаний:

```tsx
<ReminderSettings schoolId={schoolId}>
  <ReminderRuleCard
    type="MEDICAL_CERT_EXPIRING"
    title="Истекающая медсправка"
    description="Напоминание ученику о необходимости обновить медсправку"
    defaultConfig={{
      triggerDays: [30, 14, 7, 3, 1],
      channels: ['push', 'email'],
      sendTo: ['student'],
    }}
  />

  <ReminderRuleCard
    type="PAYMENT_OVERDUE"
    title="Просроченный платёж"
    defaultConfig={{
      triggerDays: [1, 3, 7, 14],
      escalateToManager: true,
      escalateAfterDays: 7,
    }}
  />

  {/* ... другие правила */}
</ReminderSettings>
```

### 2. ReminderRuleCard (`reminder-rule-card.tsx`)

Карточка настройки правила:

- Toggle включения/выключения
- Выбор дней срабатывания (chip-список)
- Выбор каналов (checkboxes)
- Настройка получателей
- Настройка эскалации
- Редактирование шаблона сообщения

### 3. BulkNotificationDialog (`bulk-notification.tsx`)

Диалог массовой отправки:

- Выбор типа напоминания
- Список получателей с чекбоксами
- Предпросмотр сообщения
- Выбор каналов отправки
- Прогресс отправки

### 4. ReminderHistory (`reminder-history.tsx`)

Таблица истории напоминаний:

- Фильтр по типу
- Фильтр по статусу
- Группировка по получателю
- Статистика доставки

---

## 🧪 Unit-тесты

### Файл: `lib/reminders/reminders.spec.ts`

| ID      | Группа   | Сценарий                                    | Статус |
| ------- | -------- | ------------------------------------------- | ------ |
| REM-U01 | Rule     | Создание правила со значениями по умолчанию | ⏳     |
| REM-U02 | Rule     | Обновление triggerDays                      | ⏳     |
| REM-U03 | Rule     | Обновление channels                         | ⏳     |
| REM-U04 | Rule     | Включение/выключение правила                | ⏳     |
| REM-U05 | Rule     | Уникальность (org + type)                   | ⏳     |
| REM-U06 | Rule     | Валидация triggerDays (положительные числа) | ⏳     |
| REM-U07 | Trigger  | shouldTrigger для медсправки (30 дней)      | ⏳     |
| REM-U08 | Trigger  | shouldTrigger для платежа (1 день)          | ⏳     |
| REM-U09 | Trigger  | shouldTrigger для неактивности (14 дней)    | ⏳     |
| REM-U10 | Trigger  | НЕ срабатывает при disabled правиле         | ⏳     |
| REM-U11 | Trigger  | НЕ срабатывает если день не в triggerDays   | ⏳     |
| REM-U12 | Send     | Отправка push-уведомления                   | ⏳     |
| REM-U13 | Send     | Отправка email                              | ⏳     |
| REM-U14 | Send     | Отправка в Telegram                         | ⏳     |
| REM-U15 | Send     | Мульти-канальная отправка                   | ⏳     |
| REM-U16 | Send     | Запись в историю после отправки             | ⏳     |
| REM-U17 | Template | Подстановка переменных в шаблон             | ⏳     |
| REM-U18 | Template | Форматирование даты в шаблоне               | ⏳     |
| REM-U19 | Template | Форматирование суммы в шаблоне              | ⏳     |
| REM-U20 | Escalate | Эскалация после N дней                      | ⏳     |
| REM-U21 | Escalate | Отправка менеджеру при эскалации            | ⏳     |
| REM-U22 | History  | Создание записи истории                     | ⏳     |
| REM-U23 | History  | Обновление статуса (delivered)              | ⏳     |
| REM-U24 | History  | Обновление статуса (read)                   | ⏳     |
| REM-U25 | History  | Получение истории по ученику                | ⏳     |
| REM-U26 | History  | Получение истории по правилу                | ⏳     |
| REM-U27 | Bulk     | Массовая отправка списку                    | ⏳     |
| REM-U28 | Bulk     | Прогресс массовой отправки                  | ⏳     |
| REM-U29 | Bulk     | Обработка ошибок при массовой отправке      | ⏳     |
| REM-U30 | Dedup    | Не отправлять дважды за один день           | ⏳     |

**Итого:** 30 тестов

### Файл: `lib/reminders/cron.spec.ts`

| ID       | Сценарий                        | Статус |
| -------- | ------------------------------- | ------ |
| CRON-U01 | Поиск истекающих медсправок     | ⏳     |
| CRON-U02 | Поиск просроченных платежей     | ⏳     |
| CRON-U03 | Поиск неактивных учеников       | ⏳     |
| CRON-U04 | Поиск предстоящих экзаменов     | ⏳     |
| CRON-U05 | Поиск занятий на завтра         | ⏳     |
| CRON-U06 | Фильтрация по активным правилам | ⏳     |
| CRON-U07 | Группировка по школам           | ⏳     |
| CRON-U08 | Возврат счётчика обработанных   | ⏳     |
| CRON-U09 | Логирование ошибок              | ⏳     |
| CRON-U10 | Retry при сбое отправки         | ⏳     |

**Итого Cron:** 10 тестов

---

## 🧪 E2E тесты

### Файл: `26-reminders.spec.ts`

#### Настройки напоминаний

| №   | Тест                                    | Описание                       |
| --- | --------------------------------------- | ------------------------------ |
| 1   | `should display reminder settings page` | Страница настроек              |
| 2   | `should show all reminder types`        | Все типы напоминаний           |
| 3   | `should toggle rule enabled/disabled`   | Вкл/выкл правила               |
| 4   | `should edit trigger days`              | Редактирование дней            |
| 5   | `should select notification channels`   | Выбор каналов                  |
| 6   | `should configure escalation`           | Настройка эскалации            |
| 7   | `should edit message template`          | Редактирование шаблона         |
| 8   | `should preview message with test data` | Предпросмотр сообщения         |
| 9   | `should save rule changes`              | Сохранение изменений           |
| 10  | `should reset to defaults`              | Сброс к значениям по умолчанию |

#### Массовые уведомления

| №   | Тест                                   | Описание                       |
| --- | -------------------------------------- | ------------------------------ |
| 11  | `should open bulk notification dialog` | Открытие диалога               |
| 12  | `should select recipients`             | Выбор получателей              |
| 13  | `should select all recipients`         | Выбрать всех                   |
| 14  | `should filter recipients by criteria` | Фильтрация получателей         |
| 15  | `should preview notification`          | Предпросмотр уведомления       |
| 16  | `should send bulk notification`        | Отправка массового уведомления |
| 17  | `should show sending progress`         | Прогресс отправки              |
| 18  | `should show success count`            | Счётчик успешных               |
| 19  | `should show failure count`            | Счётчик неудачных              |

#### История напоминаний

| №   | Тест                              | Описание            |
| --- | --------------------------------- | ------------------- |
| 20  | `should display reminder history` | Страница истории    |
| 21  | `should filter by reminder type`  | Фильтр по типу      |
| 22  | `should filter by status`         | Фильтр по статусу   |
| 23  | `should filter by date range`     | Фильтр по дате      |
| 24  | `should show delivery statistics` | Статистика доставки |
| 25  | `should export history to CSV`    | Экспорт в CSV       |

**Итого E2E:** 25 тестов

---

## 🔧 API Routes

### Cron Endpoint

```typescript
// /api/cron/reminders/route.ts
// Vercel Cron: каждый день в 9:00 MSK
export const config = {
  schedule: '0 6 * * *', // 6:00 UTC = 9:00 MSK
}

export async function GET(request: Request) {
  // 1. Проверить CRON_SECRET
  // 2. Найти триггеры
  // 3. Обработать напоминания
  // 4. Вернуть статистику
}
```

---

## 📂 Файловая структура

```
apps/driving-school/src/
├── app/
│   ├── (school-admin)/school/[id]/settings/reminders/
│   │   ├── page.tsx                    # Настройки напоминаний
│   │   └── _components/
│   │       ├── reminder-settings.tsx
│   │       └── reminder-rule-card.tsx
│   └── api/cron/reminders/
│       └── route.ts                    # Cron endpoint
├── _components/
│   ├── bulk-notification.tsx
│   └── reminder-history.tsx
├── _actions/
│   └── reminders/
│       ├── rules.action.ts             # CRUD правил
│       ├── send.action.ts              # Отправка уведомлений
│       └── history.action.ts           # История
└── lib/
    └── reminders/
        ├── reminders.ts
        ├── reminders.spec.ts
        ├── cron.ts
        ├── cron.spec.ts
        ├── templates.ts                # Шаблоны сообщений
        └── types.ts
```

---

## 📋 Типы напоминаний

| Тип                   | Описание            | Дни по умолчанию | Получатели       |
| --------------------- | ------------------- | ---------------- | ---------------- |
| MEDICAL_CERT_EXPIRING | Истекает медсправка | 30, 14, 7, 3, 1  | student          |
| PAYMENT_OVERDUE       | Просроченный платёж | 1, 3, 7, 14      | student, manager |
| INACTIVE_STUDENT      | Нет занятий         | 14, 21, 30       | student, manager |
| EXAM_UPCOMING         | Предстоящий экзамен | 7, 3, 1          | student          |
| LESSON_TOMORROW       | Занятие завтра      | 1                | student          |
| DOCUMENTS_PENDING     | Документы ожидают   | 3, 7             | student          |
| CONTRACT_EXPIRING     | Истекает договор    | 30, 14, 7        | student, manager |

---

## 🎯 Критерии приёмки

- [ ] Модель ReminderRule создана в schema.zmodel
- [ ] 7 типов напоминаний поддерживаются
- [ ] Cron job работает по расписанию (9:00 MSK)
- [ ] Push/Email/Telegram каналы работают
- [ ] Эскалация менеджеру при игнорировании
- [ ] Дедупликация (не отправлять дважды за день)
- [ ] История отправок сохраняется
- [ ] Массовые уведомления работают
- [ ] Все 40 unit-тестов проходят
- [ ] Все 25 E2E тестов проходят

---

**Последнее обновление:** 2026-01-19
