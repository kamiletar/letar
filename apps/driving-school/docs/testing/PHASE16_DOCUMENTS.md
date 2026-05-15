# Фаза 16: Документооборот v2

> **Статус:** ⏳ Планируется
> **Версия:** v0.195.0 → v0.200.0
> **Unit-тесты:** ~45
> **E2E тесты:** ~35

---

## 📋 Описание фазы

Полноценная система документов с версионированием, истечением срока и одобрением менеджером.

**Ключевые функции:**

- Модель `StudentDocument` с версионированием
- Типы документов (медсправка, паспорт, СНИЛС, фото)
- Отслеживание срока действия (критично для медсправки — 1 год!)
- Workflow одобрения/отклонения документов
- Фильтрация истекающих документов

---

## 🗄️ Модель данных

### StudentDocument

```typescript
interface StudentDocument {
  id: string
  progressId: string
  type: DocumentType
  status: DocStatus

  // Версионирование
  files: DocumentFile[]
  currentVersion: number

  // Срок действия
  validFrom?: Date
  expiresAt?: Date  // NULL = бессрочный

  // Проверка
  reviewedById?: string
  reviewedAt?: Date
  reviewNote?: string
}

enum DocumentType {
  MEDICAL_CERT      // Медсправка (1 год!)
  PASSPORT_COPY     // Копия паспорта
  PHOTOS_3X4        // Фото 3x4
  SNILS             // СНИЛС
  APPLICATION       // Заявление
  CONTRACT          // Договор
  PAYMENT_RECEIPT   // Квитанция
  STATE_FEE_RECEIPT // Госпошлина
  TRAINING_CERT     // Свидетельство (выходной)
}

enum DocStatus {
  PENDING   // Ожидает загрузки
  UPLOADED  // На проверке
  APPROVED  // Одобрен
  REJECTED  // Отклонён
  EXPIRED   // Истёк срок
}
```

---

## 🧩 Компоненты

### 1. ExpirationIndicator (`expiration-indicator.tsx`)

Индикатор истечения срока документа:

| Состояние                 | Цвет           | Текст                        |
| ------------------------- | -------------- | ---------------------------- |
| Истёк                     | 🔴 red         | "ИСТЁК 5 дней назад"         |
| Критично (<7 дней)        | 🔴 red + pulse | "Истекает через 3 дня"       |
| Предупреждение (<30 дней) | 🟠 orange      | "Истекает через 14 дней"     |
| Действителен              | 🟢 green       | "Действителен до 15.03.2027" |
| Бессрочный                | ⚪ gray        | "Бессрочный"                 |

### 2. DocumentCard (`document-card.tsx`)

Карточка документа с:

- Превью файла
- Статус и тип документа
- История версий
- Кнопки одобрения/отклонения
- Загрузка новой версии

### 3. DocumentsGrid (`documents-grid.tsx`)

Сетка документов ученика:

- Группировка по типам
- Фильтр по статусу
- Bulk-операции

### 4. VersionHistory (`version-history.tsx`)

Список версий документа:

- Дата загрузки
- Кто загрузил
- Превью каждой версии
- Откат к предыдущей версии

---

## 🧪 Unit-тесты

### Файл: `lib/documents/documents.spec.ts`

| ID      | Группа       | Сценарий                                                | Статус |
| ------- | ------------ | ------------------------------------------------------- | ------ |
| DOC-U01 | Create       | Создание документа со статусом PENDING                  | ⏳     |
| DOC-U02 | Create       | Автоматический расчёт expiresAt для медсправки (+1 год) | ⏳     |
| DOC-U03 | Create       | Бессрочные документы (паспорт, СНИЛС)                   | ⏳     |
| DOC-U04 | Upload       | Загрузка первой версии файла                            | ⏳     |
| DOC-U05 | Upload       | Загрузка новой версии (increment currentVersion)        | ⏳     |
| DOC-U06 | Upload       | Валидация типа файла (pdf, jpg, png)                    | ⏳     |
| DOC-U07 | Upload       | Валидация размера файла (max 10MB)                      | ⏳     |
| DOC-U08 | Status       | Переход PENDING → UPLOADED при загрузке                 | ⏳     |
| DOC-U09 | Status       | Переход UPLOADED → APPROVED при одобрении               | ⏳     |
| DOC-U10 | Status       | Переход UPLOADED → REJECTED при отклонении              | ⏳     |
| DOC-U11 | Status       | Переход REJECTED → UPLOADED при новой версии            | ⏳     |
| DOC-U12 | Status       | Автопереход в EXPIRED при истечении срока               | ⏳     |
| DOC-U13 | Expiry       | isExpired() для просроченных документов                 | ⏳     |
| DOC-U14 | Expiry       | isExpiringSoon() для документов <30 дней                | ⏳     |
| DOC-U15 | Expiry       | isCriticalExpiry() для документов <7 дней               | ⏳     |
| DOC-U16 | Expiry       | daysUntilExpiry() корректный расчёт                     | ⏳     |
| DOC-U17 | Query        | Получение документов ученика                            | ⏳     |
| DOC-U18 | Query        | Фильтрация по типу                                      | ⏳     |
| DOC-U19 | Query        | Фильтрация по статусу                                   | ⏳     |
| DOC-U20 | Query        | Фильтрация истекающих документов                        | ⏳     |
| DOC-U21 | Query        | Сортировка по сроку действия                            | ⏳     |
| DOC-U22 | Review       | Одобрение документа с reviewNote                        | ⏳     |
| DOC-U23 | Review       | Отклонение документа с причиной                         | ⏳     |
| DOC-U24 | Review       | Сохранение reviewedById и reviewedAt                    | ⏳     |
| DOC-U25 | Version      | Получение текущей версии файла                          | ⏳     |
| DOC-U26 | Version      | Получение истории версий                                | ⏳     |
| DOC-U27 | Version      | Откат к предыдущей версии                               | ⏳     |
| DOC-U28 | Access       | Менеджер может просматривать документы                  | ⏳     |
| DOC-U29 | Access       | Менеджер может одобрять/отклонять                       | ⏳     |
| DOC-U30 | Access       | Ученик не может одобрять документы                      | ⏳     |
| DOC-U31 | Access       | Ученик может загружать свои документы                   | ⏳     |
| DOC-U32 | Notification | Push при одобрении документа                            | ⏳     |
| DOC-U33 | Notification | Push при отклонении документа                           | ⏳     |
| DOC-U34 | Notification | Push о скором истечении (за 30, 14, 7 дней)             | ⏳     |
| DOC-U35 | Stats        | Подсчёт документов по статусам                          | ⏳     |

**Итого Unit:** 35 тестов

### Файл: `lib/documents/expiration.spec.ts`

| ID      | Сценарий                                     | Статус |
| ------- | -------------------------------------------- | ------ |
| EXP-U01 | calculateExpiryDate для медсправки           | ⏳     |
| EXP-U02 | calculateExpiryDate для бессрочных           | ⏳     |
| EXP-U03 | getExpiryStatus возвращает корректный статус | ⏳     |
| EXP-U04 | formatExpiryText для всех состояний          | ⏳     |
| EXP-U05 | findExpiringDocuments по школе               | ⏳     |
| EXP-U06 | findExpiringDocuments по ученику             | ⏳     |
| EXP-U07 | getExpiryColor для компонентов               | ⏳     |
| EXP-U08 | shouldShowPulse для критичных документов     | ⏳     |
| EXP-U09 | groupByExpiryStatus группировка              | ⏳     |
| EXP-U10 | sortByExpiry сортировка                      | ⏳     |

**Итого Expiration:** 10 тестов

---

## 🧪 E2E тесты

### Файл: `24-documents.spec.ts`

#### Загрузка документов

| №   | Тест                                            | Описание                      |
| --- | ----------------------------------------------- | ----------------------------- |
| 1   | `should display documents grid for student`     | Отображение сетки документов  |
| 2   | `should show empty state for PENDING documents` | Empty state для незагруженных |
| 3   | `should upload medical certificate`             | Загрузка медсправки           |
| 4   | `should show upload progress`                   | Индикатор прогресса загрузки  |
| 5   | `should validate file type`                     | Валидация типа файла          |
| 6   | `should validate file size`                     | Валидация размера файла       |
| 7   | `should auto-calculate expiry for medical cert` | Авторасчёт срока медсправки   |
| 8   | `should allow setting custom expiry date`       | Ручной ввод срока действия    |

#### Проверка документов (менеджер)

| №   | Тест                                      | Описание                      |
| --- | ----------------------------------------- | ----------------------------- |
| 9   | `should display documents pending review` | Список документов на проверке |
| 10  | `should preview document in modal`        | Превью документа в модалке    |
| 11  | `should approve document`                 | Одобрение документа           |
| 12  | `should reject document with reason`      | Отклонение с причиной         |
| 13  | `should show review note`                 | Отображение заметки проверки  |
| 14  | `should filter by status`                 | Фильтр по статусу             |
| 15  | `should filter expiring documents`        | Фильтр истекающих             |

#### Версионирование

| №   | Тест                                        | Описание                      |
| --- | ------------------------------------------- | ----------------------------- |
| 16  | `should upload new version after rejection` | Новая версия после отклонения |
| 17  | `should show version history`               | Отображение истории версий    |
| 18  | `should preview specific version`           | Превью конкретной версии      |
| 19  | `should increment version number`           | Инкремент номера версии       |
| 20  | `should show current version indicator`     | Индикатор текущей версии      |

#### Истечение срока

| №   | Тест                                              | Описание                             |
| --- | ------------------------------------------------- | ------------------------------------ |
| 21  | `should show green indicator for valid documents` | Зелёный индикатор для действительных |
| 22  | `should show orange warning for expiring soon`    | Оранжевый для истекающих             |
| 23  | `should show red indicator for critical expiry`   | Красный для критичных                |
| 24  | `should show pulsing for critical documents`      | Пульсация для критичных              |
| 25  | `should show expired badge`                       | Badge "Истёк"                        |
| 26  | `should sort by expiry date`                      | Сортировка по сроку                  |

#### Страница документов школы

| №   | Тест                                       | Описание                       |
| --- | ------------------------------------------ | ------------------------------ |
| 27  | `should display school documents page`     | Страница документов школы      |
| 28  | `should show documents grouped by student` | Группировка по ученикам        |
| 29  | `should filter by document type`           | Фильтр по типу документа       |
| 30  | `should show expiring documents alert`     | Алерт об истекающих документах |
| 31  | `should export documents list to CSV`      | Экспорт списка в CSV           |
| 32  | `should search student by name`            | Поиск ученика по имени         |
| 33  | `should show document statistics`          | Статистика по документам       |
| 34  | `should bulk send reminder`                | Массовая отправка напоминаний  |
| 35  | `should navigate to student profile`       | Переход к профилю ученика      |

**Итого E2E:** 35 тестов

---

## 📂 Файловая структура

```
apps/driving-school/src/
├── app/
│   ├── (school-admin)/school/[id]/
│   │   └── documents/
│   │       ├── page.tsx              # Страница документов школы
│   │       └── _components/
│   │           ├── documents-table.tsx
│   │           └── document-filters.tsx
│   └── (student)/my-documents/
│       ├── page.tsx                   # Документы ученика
│       └── _components/
│           └── documents-grid.tsx
├── _components/
│   ├── document-card.tsx
│   ├── expiration-indicator.tsx
│   ├── version-history.tsx
│   └── document-upload.tsx
├── _actions/
│   └── documents/
│       ├── upload.action.ts
│       ├── review.action.ts
│       └── queries.action.ts
└── lib/
    └── documents/
        ├── documents.ts
        ├── documents.spec.ts
        ├── expiration.ts
        └── expiration.spec.ts
```

---

## 🎯 Критерии приёмки

- [ ] Модель StudentDocument создана в schema.zmodel
- [ ] Все 9 типов документов поддерживаются
- [ ] Медсправка автоматически получает срок +1 год
- [ ] ExpirationIndicator показывает корректные цвета и текст
- [ ] Версионирование работает при загрузке новых файлов
- [ ] Менеджер может одобрить/отклонить документ
- [ ] Push-уведомления отправляются при изменении статуса
- [ ] Фильтр истекающих документов работает
- [ ] Все 45 unit-тестов проходят
- [ ] Все 35 E2E тестов проходят

---

**Последнее обновление:** 2026-01-19
