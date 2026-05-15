# База данных: Платформа для автошкол

> Схема базы данных, модели ZenStack, индексы и связи.

## ER-диаграмма (упрощённая)

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│    User     │────►│  StudentProfile  │────►│ StudentInstructor │
│             │     │                  │     │    Connection     │
│  - email    │     │ - preferredAreas │     │                   │
│  - name     │     │ - note           │     │ - isPrimary       │
│  - role     │     └──────────────────┘     │ - prepaidLessons  │
│  - phone    │                              │ - status          │
└──────┬──────┘     ┌──────────────────┐     └─────────┬─────────┘
       │            │InstructorProfile │◄──────────────┘
       └───────────►│                  │
                    │ - carBrand       │     ┌───────────────────┐
                    │ - bio            │────►│  ScheduleSettings │
                    │ - penalties      │     │                   │
                    └────────┬─────────┘     │ - workDays        │
                             │               │ - lessonDuration  │
                             │               └───────────────────┘
                             ▼
                    ┌──────────────────┐     ┌───────────────────┐
                    │     TimeSlot     │────►│      Lesson       │
                    │                  │     │                   │
                    │ - startTime      │     │ - status          │
                    │ - endTime        │     │ - instructorNotes │
                    │ - status         │     │ - cancelReason    │
                    └──────────────────┘     └───────────────────┘
```

## Enum'ы

### UserRole

```typescript
enum UserRole {
  STUDENT       // Ученик
  INSTRUCTOR    // Инструктор
  SCHOOL_ADMIN  // Администратор автошколы
}
```

### LessonStatus

```typescript
enum LessonStatus {
  PENDING           // Ожидает подтверждения
  CONFIRMED         // Подтверждено
  NEEDS_RESCHEDULE  // Требует переноса
  COMPLETED         // Проведено
  NO_SHOW           // Неявка ученика
  CANCELLED         // Отменено
  RESCHEDULED       // Перенесено
}
```

### InvitationStatus

```typescript
enum InvitationStatus {
  PENDING   // Ожидает
  ACCEPTED  // Принято
  EXPIRED   // Истекло (7 дней)
  DECLINED  // Отклонено
}
```

### ConnectionStatus

```typescript
enum ConnectionStatus {
  ACTIVE        // Активная связь
  PAUSED        // На паузе (временная передача)
  DISCONNECTED  // Отключена
}
```

### SlotStatus

```typescript
enum SlotStatus {
  AVAILABLE  // Доступен для записи
  BOOKED     // Забронирован
  BLOCKED    // Заблокирован инструктором
}
```

### PenaltyType / PenaltyStatus

```typescript
enum PenaltyType {
  LATE_CANCEL  // Поздняя отмена
  NO_SHOW      // Неявка
}

enum PenaltyStatus {
  CHARGED    // Начислен
  PAID       // Оплачен
  CANCELLED  // Отменён
}
```

### AbsenceType

```typescript
enum AbsenceType {
  VACATION    // Отпуск
  SICK_LEAVE  // Больничный
}
```

### TransmissionType

```typescript
enum TransmissionType {
  MANUAL     // Механика
  AUTOMATIC  // Автомат
}
```

### DayOfWeek

```typescript
enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

### NotificationType

```typescript
enum NotificationType {
  LESSON_CREATED          // Занятие создано
  LESSON_CONFIRMED        // Занятие подтверждено
  LESSON_CANCELLED        // Занятие отменено
  LESSON_REMINDER         // Напоминание о занятии
  LESSON_NEEDS_RESCHEDULE // Требуется перенос
  PENALTY_CHARGED         // Начислен штраф
  INVITATION_RECEIVED     // Получено приглашение
  STUDENT_TRANSFER        // Передача ученика
  INSTRUCTOR_RETURNED     // Инструктор вернулся
  SCHOOL_INVITE           // Приглашение в автошколу
}
```

### SyncStatus

```typescript
enum SyncStatus {
  PENDING  // Ожидает синхронизации
  SYNCED   // Синхронизировано
  FAILED   // Ошибка синхронизации
}
```

### AuditAction

```typescript
enum AuditAction {
  USER_REGISTER      // Регистрация
  USER_LOGIN         // Вход
  LESSON_CREATE      // Создание занятия
  LESSON_CONFIRM     // Подтверждение
  LESSON_CANCEL      // Отмена
  LESSON_RESCHEDULE  // Перенос
  LESSON_COMPLETE    // Завершение
  PENALTY_CHARGE     // Начисление штрафа
  PENALTY_PAY        // Оплата штрафа
  PENALTY_CANCEL     // Отмена штрафа
  SCHEDULE_UPDATE    // Изменение расписания
  STUDENT_TRANSFER   // Передача ученика
  ADMIN_ACTION       // Действие админа
}
```

## Индексы

### Критичные для производительности

| Модель       | Индекс                      | Назначение                       |
| ------------ | --------------------------- | -------------------------------- |
| TimeSlot     | `[instructorId, startTime]` | Быстрый поиск слотов инструктора |
| TimeSlot     | `[status]`                  | Фильтрация по статусу            |
| Lesson       | `[studentId]`               | Занятия ученика                  |
| Lesson       | `[instructorId]`            | Занятия инструктора              |
| Lesson       | `[status]`                  | Фильтрация по статусу            |
| Lesson       | `[createdAt]`               | Сортировка по дате               |
| Notification | `[userId, isRead]`          | Непрочитанные уведомления        |
| AuditLog     | `[entityType, entityId]`    | Поиск по сущности                |
| AuditLog     | `[createdAt]`               | Сортировка по дате               |

## Воркфлоу

```bash
# 1. Редактируй схему
vim schema.zmodel

# 2. Генерация Prisma + Zod
nx zenstack:generate driving-school

# 3. Push в БД (dev)
nx db:push driving-school

# 4. Миграция (prod)
nx db:migrate driving-school
```

## Связи между моделями

### User → Profiles

- `User` 1:1 `StudentProfile` (если role = STUDENT)
- `User` 1:1 `InstructorProfile` (если role = INSTRUCTOR)

### Lessons

- `Lesson` → `User` (student) через `@relation("StudentLessons")`
- `Lesson` → `User` (instructor) через `@relation("InstructorLessons")`
- `Lesson` → `TimeSlot` (1:1)
- `Lesson` → `Lesson` (self-reference для переносов)

### Notifications

- `User` 1:N `Notification`
- `User` 1:1 `NotificationSettings`
- `User` 1:N `PushSubscription`
- `User` 1:1 `TelegramLink`

### Schools

- `School` N:M `User` через `SchoolMembership`
