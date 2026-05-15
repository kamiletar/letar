# Фаза 17: Kanban-доска учеников

> **Статус:** ⏳ Планируется
> **Версия:** v0.201.0 → v0.205.0
> **Unit-тесты:** ~25
> **E2E тесты:** ~30

---

## 📋 Описание фазы

Визуализация всех учеников школы по этапам обучения с drag & drop для быстрого перемещения между этапами.

**Ключевые функции:**

- Kanban-доска с колонками по этапам обучения
- Drag & Drop для перемещения учеников
- Карточки учеников с ключевой информацией
- Фильтрация по инструктору, категории, дате
- Быстрые действия из карточки

---

## 🧩 Компоненты

### 1. StudentsKanban (`students-kanban.tsx`)

Основной компонент Kanban-доски:

```tsx
<StudentsKanban schoolId={schoolId}>
  <KanbanColumn id="documents" title="Документы" count={15} color="gray" />
  <KanbanColumn id="theory" title="Теория" count={28} color="blue" />
  <KanbanColumn id="practice" title="Практика" count={45} color="purple" />
  <KanbanColumn id="internal_exam" title="Внутренний экзамен" count={8} color="cyan" />
  <KanbanColumn id="gibdd_exam" title="Экзамен ГИБДД" count={12} color="orange" />
  <KanbanColumn id="completed" title="Завершили" count={89} color="green" />
</StudentsKanban>
```

### 2. KanbanColumn (`kanban-column.tsx`)

Колонка Kanban-доски:

- Заголовок с количеством учеников
- Droppable зона для карточек
- Цветовая индикация этапа
- Счётчик срочных (с долгами/истекающими документами)

### 3. StudentKanbanCard (`student-kanban-card.tsx`)

Карточка ученика:

| Элемент  | Описание                                 |
| -------- | ---------------------------------------- |
| Avatar   | Фото или инициалы                        |
| Name     | ФИО ученика                              |
| Phone    | Телефон (скрытый по умолчанию)           |
| Progress | Прогресс-бар текущего этапа              |
| Badges   | Долг, истекающие документы, неактивность |
| Actions  | Меню быстрых действий                    |

### 4. KanbanFilters (`kanban-filters.tsx`)

Панель фильтров:

- Инструктор (мультивыбор)
- Категория прав (A, B, C, D, M)
- Дата поступления
- Статус документов
- Наличие долга
- Поиск по имени/телефону

### 5. KanbanDragOverlay (`kanban-drag-overlay.tsx`)

Оверлей при перетаскивании:

- Увеличенная карточка
- Тень для визуального выделения
- Индикатор целевой колонки

---

## 🧪 Unit-тесты

### Файл: `lib/kanban/kanban.spec.ts`

| ID     | Группа  | Сценарий                                      | Статус |
| ------ | ------- | --------------------------------------------- | ------ |
| KB-U01 | Columns | Получение этапов обучения                     | ⏳     |
| KB-U02 | Columns | Подсчёт учеников по этапам                    | ⏳     |
| KB-U03 | Columns | Фильтрация по инструктору                     | ⏳     |
| KB-U04 | Columns | Фильтрация по категории                       | ⏳     |
| KB-U05 | Columns | Фильтрация по дате поступления                | ⏳     |
| KB-U06 | Columns | Комбинированная фильтрация                    | ⏳     |
| KB-U07 | Move    | Перемещение ученика между этапами             | ⏳     |
| KB-U08 | Move    | Валидация перехода (нельзя назад без причины) | ⏳     |
| KB-U09 | Move    | Запись в историю изменений                    | ⏳     |
| KB-U10 | Move    | Автообновление даты этапа                     | ⏳     |
| KB-U11 | Move    | Уведомление инструктора при перемещении       | ⏳     |
| KB-U12 | Sort    | Сортировка по дате поступления                | ⏳     |
| KB-U13 | Sort    | Сортировка по имени                           | ⏳     |
| KB-U14 | Sort    | Сортировка по активности                      | ⏳     |
| KB-U15 | Badges  | Расчёт badge долга                            | ⏳     |
| KB-U16 | Badges  | Расчёт badge истекающих документов            | ⏳     |
| KB-U17 | Badges  | Расчёт badge неактивности (>14 дней)          | ⏳     |
| KB-U18 | Search  | Поиск по имени                                | ⏳     |
| KB-U19 | Search  | Поиск по телефону                             | ⏳     |
| KB-U20 | Search  | Поиск по email                                | ⏳     |
| KB-U21 | Stats   | Статистика по колонкам                        | ⏳     |
| KB-U22 | Stats   | Средний срок на этапе                         | ⏳     |
| KB-U23 | Access  | Менеджер может перемещать учеников            | ⏳     |
| KB-U24 | Access  | Инструктор не может перемещать                | ⏳     |
| KB-U25 | Access  | Owner может перемещать                        | ⏳     |

**Итого Unit:** 25 тестов

---

## 🧪 E2E тесты

### Файл: `25-kanban.spec.ts`

#### Отображение доски

| №   | Тест                                           | Описание                       |
| --- | ---------------------------------------------- | ------------------------------ |
| 1   | `should display kanban board`                  | Отображение Kanban-доски       |
| 2   | `should show all stage columns`                | Все колонки этапов видны       |
| 3   | `should display student count in columns`      | Счётчик учеников в колонках    |
| 4   | `should show student cards in correct columns` | Карточки в правильных колонках |
| 5   | `should display student name and avatar`       | Имя и аватар на карточке       |
| 6   | `should show debt badge`                       | Badge долга                    |
| 7   | `should show document expiry badge`            | Badge истекающих документов    |
| 8   | `should show inactive badge`                   | Badge неактивности             |

#### Drag & Drop

| №   | Тест                                         | Описание                               |
| --- | -------------------------------------------- | -------------------------------------- |
| 9   | `should drag student card`                   | Перетаскивание карточки                |
| 10  | `should show drag overlay`                   | Оверлей при перетаскивании             |
| 11  | `should highlight target column`             | Подсветка целевой колонки              |
| 12  | `should drop card in new column`             | Сброс карточки в новую колонку         |
| 13  | `should update student stage on drop`        | Обновление этапа после сброса          |
| 14  | `should show confirmation for backward move` | Подтверждение при движении назад       |
| 15  | `should cancel move on dialog dismiss`       | Отмена перемещения                     |
| 16  | `should update counts after move`            | Обновление счётчиков после перемещения |

#### Фильтрация

| №   | Тест                                | Описание                     |
| --- | ----------------------------------- | ---------------------------- |
| 17  | `should filter by instructor`       | Фильтр по инструктору        |
| 18  | `should filter by license category` | Фильтр по категории прав     |
| 19  | `should filter by enrollment date`  | Фильтр по дате поступления   |
| 20  | `should filter students with debt`  | Фильтр учеников с долгом     |
| 21  | `should filter by document status`  | Фильтр по статусу документов |
| 22  | `should search by student name`     | Поиск по имени               |
| 23  | `should clear all filters`          | Очистка всех фильтров        |
| 24  | `should persist filters in URL`     | Сохранение фильтров в URL    |

#### Действия с карточкой

| №   | Тест                                        | Описание                        |
| --- | ------------------------------------------- | ------------------------------- |
| 25  | `should open student profile on card click` | Открытие профиля по клику       |
| 26  | `should show quick actions menu`            | Меню быстрых действий           |
| 27  | `should call student from card`             | Звонок из карточки              |
| 28  | `should open chat from card`                | Открытие чата из карточки       |
| 29  | `should schedule lesson from card`          | Запись на занятие из карточки   |
| 30  | `should toggle card expansion`              | Раскрытие/сворачивание карточки |

**Итого E2E:** 30 тестов

---

## 📦 Зависимости

```bash
# Drag & Drop
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 📂 Файловая структура

```
apps/driving-school/src/
├── app/(school-admin)/school/[id]/students/kanban/
│   ├── page.tsx                    # Страница Kanban
│   └── _components/
│       ├── students-kanban.tsx     # Основной компонент
│       ├── kanban-column.tsx       # Колонка
│       ├── student-kanban-card.tsx # Карточка ученика
│       ├── kanban-filters.tsx      # Панель фильтров
│       └── kanban-drag-overlay.tsx # Оверлей при drag
├── _actions/
│   └── kanban/
│       ├── get-students.action.ts  # Получение учеников по этапам
│       └── move-student.action.ts  # Перемещение между этапами
└── lib/
    └── kanban/
        ├── kanban.ts
        ├── kanban.spec.ts
        ├── stages.ts               # Константы этапов
        └── types.ts
```

---

## 🎨 Дизайн колонок

| Этап           | Цвет       | ID              | Описание              |
| -------------- | ---------- | --------------- | --------------------- |
| Документы      | gray.500   | `documents`     | Сбор документов       |
| Теория         | blue.500   | `theory`        | Теоретические занятия |
| Практика       | purple.500 | `practice`      | Практические занятия  |
| Внутр. экзамен | cyan.500   | `internal_exam` | Внутренний экзамен    |
| ГИБДД          | orange.500 | `gibdd_exam`    | Экзамен в ГИБДД       |
| Завершили      | green.500  | `completed`     | Обучение завершено    |

---

## 🎯 Критерии приёмки

- [ ] Kanban-доска отображает учеников по этапам
- [ ] Drag & Drop работает корректно
- [ ] Перемещение ученика обновляет БД
- [ ] Фильтры работают и сохраняются в URL
- [ ] Badges отображаются корректно (долг, документы, неактивность)
- [ ] Быстрые действия открываются из меню карточки
- [ ] Подтверждение при движении назад
- [ ] Счётчики обновляются в реальном времени
- [ ] Все 25 unit-тестов проходят
- [ ] Все 30 E2E тестов проходят

---

**Последнее обновление:** 2026-01-19
