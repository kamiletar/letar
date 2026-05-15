# DrivingSchoolForm

Расширенный Form компонент для приложения driving-school на основе `@letar/forms`.

## Содержимое

- **38 Select компонентов** для всех ENUM'ов приложения
- **8 Combobox компонентов** для асинхронного поиска моделей
- **Русские лейблы** для всех ENUM значений

## Использование

```tsx
import { DrivingSchoolForm } from '@/driving-school-form'

export function VehicleForm({ defaultValues, onSubmit }) {
  return (
    <DrivingSchoolForm initialValue={defaultValues} onSubmit={onSubmit}>
      <DrivingSchoolForm.Field.String name="brand" label="Марка" required />
      <DrivingSchoolForm.Field.String name="model" label="Модель" required />
      <DrivingSchoolForm.Select.TransmissionType name="transmission" label="Тип КПП" />
      <DrivingSchoolForm.Select.LicenseCategory name="licenseCategories" label="Категории" />
      <DrivingSchoolForm.Combobox.Instructor name="instructorId" label="Инструктор" />
      <DrivingSchoolForm.Button.Submit>Сохранить</DrivingSchoolForm.Button.Submit>
    </DrivingSchoolForm>
  )
}
```

## Select компоненты

Компоненты для выбора значений из ENUM'ов с русскими лейблами.

| Компонент                     | ENUM                 | Описание             |
| ----------------------------- | -------------------- | -------------------- |
| `Select.LicenseCategory`      | LicenseCategory      | Категории прав       |
| `Select.TransmissionType`     | TransmissionType     | Тип КПП              |
| `Select.DayOfWeek`            | DayOfWeek            | День недели          |
| `Select.LocationType`         | LocationType         | Тип локации          |
| `Select.StudyGroupSchedule`   | StudyGroupSchedule   | Расписание группы    |
| `Select.SchoolMemberRole`     | SchoolMemberRole     | Роль в школе         |
| `Select.UserRole`             | UserRole             | Роль пользователя    |
| `Select.SlotStatus`           | SlotStatus           | Статус слота         |
| `Select.LessonStatus`         | LessonStatus         | Статус занятия       |
| `Select.TheoryLessonStatus`   | TheoryLessonStatus   | Статус теории        |
| `Select.ExamType`             | ExamType             | Тип экзамена         |
| `Select.ExamSessionStatus`    | ExamSessionStatus    | Статус экзамена      |
| `Select.ExamResult`           | ExamResult           | Результат экзамена   |
| `Select.PenaltyType`          | PenaltyType          | Тип штрафа           |
| `Select.PenaltyStatus`        | PenaltyStatus        | Статус штрафа        |
| `Select.AbsenceType`          | AbsenceType          | Тип отсутствия       |
| `Select.ConnectionStatus`     | ConnectionStatus     | Статус связи         |
| `Select.TransferType`         | TransferType         | Тип перевода         |
| `Select.TransferStatus`       | TransferStatus       | Статус перевода      |
| `Select.TransferReason`       | TransferReason       | Причина перевода     |
| `Select.InvitationStatus`     | InvitationStatus     | Статус приглашения   |
| `Select.EnrollmentStatus`     | EnrollmentStatus     | Статус зачисления    |
| `Select.ReviewTargetType`     | ReviewTargetType     | Тип цели отзыва      |
| `Select.ReviewStatus`         | ReviewStatus         | Статус отзыва        |
| `Select.ReportReason`         | ReportReason         | Причина жалобы       |
| `Select.ReportStatus`         | ReportStatus         | Статус жалобы        |
| `Select.TicketCategory`       | TicketCategory       | Категория тикета     |
| `Select.TicketStatus`         | TicketStatus         | Статус тикета        |
| `Select.ChatType`             | ChatType             | Тип чата             |
| `Select.FileCategory`         | FileCategory         | Категория файла      |
| `Select.SubscriptionPlanType` | SubscriptionPlanType | Тип подписки         |
| `Select.SubscriptionStatus`   | SubscriptionStatus   | Статус подписки      |
| `Select.PaymentStatus`        | PaymentStatus        | Статус платежа       |
| `Select.PaymentMethod`        | PaymentMethod        | Способ оплаты        |
| `Select.LegalDocumentType`    | LegalDocumentType    | Тип юр. документа    |
| `Select.ApiKeyStatus`         | ApiKeyStatus         | Статус API ключа     |
| `Select.SyncStatus`           | SyncStatus           | Статус синхронизации |

## Combobox компоненты

Компоненты для асинхронного поиска моделей с ZenStack hooks.

| Компонент                 | Модель         | Поля поиска   | Фильтры      |
| ------------------------- | -------------- | ------------- | ------------ |
| `Combobox.Instructor`     | User           | name, email   | schoolId     |
| `Combobox.Student`        | User           | name, email   | —            |
| `Combobox.School`         | School         | name          | —            |
| `Combobox.StudyGroup`     | StudyGroup     | name          | schoolId     |
| `Combobox.TheoryTopic`    | TheoryTopic    | name          | schoolId     |
| `Combobox.Vehicle`        | Vehicle        | brand, model  | instructorId |
| `Combobox.LessonType`     | LessonType     | name          | instructorId |
| `Combobox.SchoolLocation` | SchoolLocation | name, address | schoolId     |

### Пример с фильтрами

```tsx
// Фильтрация инструкторов по школе
<DrivingSchoolForm.Combobox.Instructor
  name="instructorId"
  label="Инструктор"
  schoolId={currentSchoolId}
/>

// Фильтрация транспорта по инструктору
<DrivingSchoolForm.Combobox.Vehicle
  name="vehicleId"
  label="Транспорт"
  instructorId={selectedInstructorId}
/>
```

## Структура файлов

```
driving-school-form/
├── driving-school-form.tsx   # createForm с расширениями
├── index.ts                  # Экспорт
├── labels.ts                 # Русские названия ENUM'ов
├── selects/
│   ├── index.ts              # Экспорт всех Select
│   └── select-*.tsx          # 38 Select компонентов
└── comboboxes/
    ├── index.ts              # Экспорт всех Combobox
    └── combobox-*.tsx        # 8 Combobox компонентов
```

## Добавление новых компонентов

### Новый Select для ENUM

1. Добавить лейблы в `labels.ts`
2. Создать файл `selects/select-<name>.tsx`
3. Экспортировать в `selects/index.ts`
4. Добавить в `driving-school-form.tsx` extraSelects

### Новый Combobox для модели

1. Создать файл `comboboxes/combobox-<name>.tsx`
2. Использовать соответствующий ZenStack hook
3. Экспортировать в `comboboxes/index.ts`
4. Добавить в `driving-school-form.tsx` extraComboboxes

## Связанные документы

- [.claude/docs/forms.md](../../../../.claude/docs/forms.md) — документация по формам
- [@letar/forms](../../../../libs/forms/README.md) — базовая библиотека
- [docs/OFFLINE.md](../../docs/OFFLINE.md) — оффлайн-режим и синхронизация

---

**Создано:** 2025-12-20
