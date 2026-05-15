# Фаза 15: Manager Dashboard и улучшения админ-панели

> **Статус:** ✅ Частично реализовано | ⏳ Manager Dashboard
> **Версия:** v0.191.0 → v0.194.0
> **Unit-тесты:** ~20
> **E2E тесты:** ~90

---

## 📋 Описание фазы

Manager Dashboard для менеджера школы + улучшения UX админ-панели.

**Новое (v0.191.0+):**

- TodaySection — виджет "Сегодня" (занятия, экзамены, платежи)
- NeedsAttentionWidget — виджет "Требуют внимания"
- Manager Dashboard page — страница школы для менеджера
- QuickActionsBar — панель быстрых действий

**Готово:**

- Alert System — панель критичных уведомлений
- Breadcrumbs — навигационные хлебные крошки
- Dark mode toggle — переключатель темы
- KPI Dashboard — карточки с трендами и sparkline
- Command Palette — глобальный поиск (Cmd+K)
- Export Button — экспорт данных в CSV/Excel
- Bulk Actions — массовые действия в таблицах
- Real-time — SSE обновления

---

## 🧩 Компоненты

### 1. Alert System (`alerts-panel.tsx`)

Панель критичных уведомлений для отображения:

- Долги > 7 дней
- Отмены занятий сегодня
- Неявки за неделю
- Истекающие документы

**Интерфейс:**

```typescript
interface AlertItem {
  id: string
  type: 'debt' | 'cancellation' | 'no_show' | 'document_expiry'
  severity: 'error' | 'warning' | 'info'
  title: string
  description: string
  count?: number
  link?: string
}
```

### 2. Breadcrumbs (`breadcrumbs.tsx`)

Автоматическая генерация хлебных крошек из URL:

- Локализованные названия страниц
- Иконка "домой" в начале
- Кликабельные сегменты

### 3. KPI Card (`kpi-card.tsx`)

Карточка метрики с:

- Текущее значение
- Процент изменения (тренд)
- Sparkline график (7 дней)
- Цветовая индикация тренда

### 4. Command Palette (`command-palette.tsx`)

Глобальный поиск и навигация:

- Открытие по Cmd+K (Mac) / Ctrl+K (Windows)
- Навигация стрелками + Enter
- Секции: Навигация, Действия, Поиск
- Фильтрация по ключевым словам

### 5. Export Button (`export-button.tsx`)

Экспорт данных:

- CSV и Excel форматы
- Выбор полей для экспорта
- BOM для кириллицы в Excel
- Диалог с прогрессом

### 6. TodaySection (`today-section.tsx`) — НОВЫЙ

Виджет "Сегодня" для менеджера школы:

```tsx
<TodaySection>
  <TodayLessons count={15} cancelled={2} />
  <TodayExams count={3} />
  <TodayPaymentsDue amount={45000} students={5} />
</TodaySection>
```

**Отображает:**

- Занятия на сегодня (всего / отменённых)
- Экзамены на сегодня
- Ожидаемые платежи (сумма / количество учеников)

### 7. NeedsAttentionWidget (`needs-attention.tsx`) — НОВЫЙ

Виджет "Требуют внимания" с категориями:

```tsx
<NeedsAttentionWidget>
  <Category title="Документы" icon={<LuFileWarning />} colorPalette="red">
    <Item count={5} label="Истекающие медсправки" link="/documents?filter=expiring" />
    <Item count={3} label="Ожидают проверки" link="/documents?filter=pending" />
  </Category>

  <Category title="Финансы" icon={<LuBanknote />} colorPalette="orange">
    <Item count={7} label="Просроченные платежи" amount={125000} />
  </Category>

  <Category title="Обучение" icon={<LuUserX />} colorPalette="yellow">
    <Item count={12} label="Без занятий >14 дней" />
    <Item count={4} label="Готовы к экзамену (не записаны)" />
  </Category>
</NeedsAttentionWidget>
```

### 8. QuickActionsBar (`quick-actions-bar.tsx`) — НОВЫЙ

Панель быстрых действий для менеджера:

- Добавить ученика
- Записать на занятие
- Создать группу
- Отправить уведомление

---

## 🧪 Unit-тесты (НОВЫЕ)

### Файл: `lib/dashboard/manager-dashboard.spec.ts`

| ID     | Группа         | Сценарий                                 | Статус |
| ------ | -------------- | ---------------------------------------- | ------ |
| MD-U01 | TodaySection   | Подсчёт занятий на сегодня               | ⏳     |
| MD-U02 | TodaySection   | Подсчёт отменённых занятий               | ⏳     |
| MD-U03 | TodaySection   | Подсчёт экзаменов на сегодня             | ⏳     |
| MD-U04 | TodaySection   | Расчёт суммы ожидаемых платежей          | ⏳     |
| MD-U05 | TodaySection   | Подсчёт учеников с ожидаемыми платежами  | ⏳     |
| MD-U06 | NeedsAttention | Подсчёт истекающих медсправок (<30 дней) | ⏳     |
| MD-U07 | NeedsAttention | Подсчёт документов на проверке           | ⏳     |
| MD-U08 | NeedsAttention | Подсчёт просроченных платежей            | ⏳     |
| MD-U09 | NeedsAttention | Расчёт суммы просроченных платежей       | ⏳     |
| MD-U10 | NeedsAttention | Подсчёт неактивных учеников (>14 дней)   | ⏳     |
| MD-U11 | NeedsAttention | Подсчёт готовых к экзамену               | ⏳     |
| MD-U12 | NeedsAttention | Пустые категории скрываются              | ⏳     |
| MD-U13 | QuickActions   | Список доступных действий для manager    | ⏳     |
| MD-U14 | QuickActions   | Список доступных действий для owner      | ⏳     |
| MD-U15 | QuickActions   | Фильтрация по разрешениям                | ⏳     |
| MD-U16 | Access         | Менеджер видит только свою школу         | ⏳     |
| MD-U17 | Access         | Super Manager видит все школы            | ⏳     |
| MD-U18 | Access         | Owner видит все школы                    | ⏳     |
| MD-U19 | Cache          | Данные кэшируются на 5 минут             | ⏳     |
| MD-U20 | Cache          | Инвалидация при изменениях               | ⏳     |

**Итого Unit:** 20 тестов

---

## 🧪 E2E тесты

### Файл: `20-manager-dashboard.spec.ts` — НОВЫЙ

#### Manager Dashboard page

| №   | Тест                                                  | Описание                     |
| --- | ----------------------------------------------------- | ---------------------------- |
| 1   | `should display manager dashboard for school manager` | Страница для менеджера       |
| 2   | `should redirect non-manager to appropriate page`     | Редирект для не-менеджера    |
| 3   | `should show school name in header`                   | Название школы в заголовке   |
| 4   | `should display AlertsPanel with school alerts`       | AlertsPanel с алертами школы |

#### TodaySection

| №   | Тест                                     | Описание                   |
| --- | ---------------------------------------- | -------------------------- |
| 5   | `should display TodaySection widget`     | Отображение виджета        |
| 6   | `should show today lessons count`        | Счётчик занятий на сегодня |
| 7   | `should show cancelled lessons count`    | Счётчик отменённых         |
| 8   | `should show today exams count`          | Счётчик экзаменов          |
| 9   | `should show payments due amount`        | Сумма ожидаемых платежей   |
| 10  | `should show students with payments due` | Количество учеников        |
| 11  | `should navigate to lessons on click`    | Переход к занятиям         |
| 12  | `should navigate to exams on click`      | Переход к экзаменам        |
| 13  | `should navigate to payments on click`   | Переход к платежам         |

#### NeedsAttentionWidget

| №   | Тест                                        | Описание                 |
| --- | ------------------------------------------- | ------------------------ |
| 14  | `should display NeedsAttentionWidget`       | Отображение виджета      |
| 15  | `should show documents category`            | Категория "Документы"    |
| 16  | `should show expiring medical certs count`  | Истекающие медсправки    |
| 17  | `should show pending documents count`       | Документы на проверке    |
| 18  | `should show finances category`             | Категория "Финансы"      |
| 19  | `should show overdue payments count`        | Просроченные платежи     |
| 20  | `should show overdue amount`                | Сумма просроченных       |
| 21  | `should show learning category`             | Категория "Обучение"     |
| 22  | `should show inactive students count`       | Неактивные ученики       |
| 23  | `should show ready for exam count`          | Готовы к экзамену        |
| 24  | `should hide empty categories`              | Скрытие пустых категорий |
| 25  | `should navigate to filtered list on click` | Переход по клику         |

#### QuickActionsBar

| №   | Тест                                     | Описание                         |
| --- | ---------------------------------------- | -------------------------------- |
| 26  | `should display QuickActionsBar`         | Отображение панели               |
| 27  | `should show "Add student" action`       | Действие "Добавить ученика"      |
| 28  | `should show "Schedule lesson" action`   | Действие "Записать на занятие"   |
| 29  | `should show "Create group" action`      | Действие "Создать группу"        |
| 30  | `should show "Send notification" action` | Действие "Отправить уведомление" |
| 31  | `should open add student dialog`         | Открытие диалога добавления      |
| 32  | `should open schedule lesson dialog`     | Открытие диалога записи          |
| 33  | `should open create group dialog`        | Открытие диалога группы          |
| 34  | `should open notification dialog`        | Открытие диалога уведомления     |

**Итого Manager Dashboard E2E:** 34 теста

### Файл: `20-admin-ux.spec.ts` (существующий)

### Файл: `20-admin-ux.spec.ts`

| №   | Тест                                               | Описание                            |
| --- | -------------------------------------------------- | ----------------------------------- |
| 1   | `should display alerts panel when alerts exist`    | Отображение панели алертов          |
| 2   | `should show debt alert with correct count`        | Алерт долга с количеством           |
| 3   | `should show cancellation alert`                   | Алерт отмен                         |
| 4   | `should show no-show alert`                        | Алерт неявок                        |
| 5   | `should collapse/expand alerts panel`              | Сворачивание/разворачивание панели  |
| 6   | `should dismiss individual alert`                  | Закрытие отдельного алерта          |
| 7   | `should navigate to alert link`                    | Переход по ссылке алерта            |
| 8   | `should display breadcrumbs on owner page`         | Отображение хлебных крошек          |
| 9   | `should navigate via breadcrumb links`             | Навигация через хлебные крошки      |
| 10  | `should show home icon in breadcrumbs`             | Иконка домой в начале               |
| 11  | `should open command palette with Cmd+K`           | Открытие по Cmd+K                   |
| 12  | `should open command palette with Ctrl+K`          | Открытие по Ctrl+K (Windows)        |
| 13  | `should close command palette with Escape`         | Закрытие по Escape                  |
| 14  | `should filter results by query`                   | Фильтрация по запросу               |
| 15  | `should navigate with arrow keys`                  | Навигация стрелками                 |
| 16  | `should select item with Enter`                    | Выбор по Enter                      |
| 17  | `should navigate to selected page`                 | Переход на выбранную страницу       |
| 18  | `should show "nothing found" for empty results`    | Сообщение "ничего не найдено"       |
| 19  | `should display KPI card with value`               | Отображение KPI карточки            |
| 20  | `should show positive trend indicator`             | Индикатор положительного тренда     |
| 21  | `should show negative trend indicator`             | Индикатор отрицательного тренда     |
| 22  | `should display sparkline graph`                   | Отображение sparkline графика       |
| 23  | `should format currency values`                    | Форматирование валюты               |
| 24  | `should format percentage values`                  | Форматирование процентов            |
| 25  | `should invert trend colors when invertTrend=true` | Инвертирование цветов тренда        |
| 26  | `should toggle dark mode`                          | Переключение темной темы            |
| 27  | `should persist dark mode preference`              | Сохранение настройки темы           |
| 28  | `should open export dialog`                        | Открытие диалога экспорта           |
| 29  | `should select/deselect export fields`             | Выбор полей для экспорта            |
| 30  | `should select all fields`                         | Выбрать все поля                    |
| 31  | `should deselect all fields`                       | Очистить выбор полей                |
| 32  | `should switch export format to CSV`               | Переключение на CSV                 |
| 33  | `should switch export format to Excel`             | Переключение на Excel               |
| 34  | `should disable export when no fields selected`    | Блокировка при пустом выборе        |
| 35  | `should show loading state during export`          | Индикатор загрузки при экспорте     |
| 36  | `should download CSV file`                         | Скачивание CSV файла                |
| 37  | `should download Excel file`                       | Скачивание Excel файла              |
| 38  | `should show success toast after export`           | Toast успеха после экспорта         |
| 39  | `should show error toast on export failure`        | Toast ошибки при сбое               |
| 40  | `should cancel export dialog`                      | Отмена диалога экспорта             |
| 41  | `should use simple export button`                  | Простая кнопка экспорта без диалога |
| 42  | `should show command palette button in header`     | Кнопка Command Palette в header     |
| 43  | `should open command palette via button click`     | Открытие по клику на кнопку         |
| 44  | `should display keyboard shortcut hint`            | Подсказка горячих клавиш            |
| 45  | `should work across different pages`               | Работа на разных страницах          |

### Bulk Actions тесты

| №   | Тест                                           | Описание                          |
| --- | ---------------------------------------------- | --------------------------------- |
| 46  | `should show checkbox in table header`         | Чекбокс "выбрать всё" в заголовке |
| 47  | `should show checkbox in each row`             | Чекбоксы в каждой строке          |
| 48  | `should select single item`                    | Выбор одного элемента             |
| 49  | `should select all items`                      | Выбор всех элементов              |
| 50  | `should deselect all items`                    | Снятие выделения со всех          |
| 51  | `should show indeterminate state`              | Частичное выделение               |
| 52  | `should show bulk action bar when selected`    | Показ панели при выделении        |
| 53  | `should hide bulk action bar when deselected`  | Скрытие панели при отмене         |
| 54  | `should show selected count in action bar`     | Счётчик выбранных в панели        |
| 55  | `should execute bulk delete action`            | Массовое удаление                 |
| 56  | `should execute bulk export action`            | Массовый экспорт                  |
| 57  | `should show loading state during bulk action` | Индикатор загрузки                |
| 58  | `should cancel bulk selection`                 | Отмена выделения через панель     |

### Real-time тесты

| №   | Тест                                 | Описание                    |
| --- | ------------------------------------ | --------------------------- |
| 59  | `should show realtime indicator`     | Отображение индикатора      |
| 60  | `should show connecting status`      | Статус "Подключение"        |
| 61  | `should show connected status`       | Статус "Подключено"         |
| 62  | `should show disconnected status`    | Статус "Отключено"          |
| 63  | `should show last updated time`      | Время последнего обновления |
| 64  | `should update time periodically`    | Обновление времени          |
| 65  | `should reconnect on button click`   | Переподключение по клику    |
| 66  | `should invalidate queries on event` | Инвалидация кэша по событию |

---

## 🔧 Тестовые утилиты

### Helpers для Command Palette

```typescript
// Открыть Command Palette
async function openCommandPalette(page: Page) {
  await page.keyboard.press('Control+k')
  await page.waitForSelector('[role="dialog"]')
}

// Поиск в Command Palette
async function searchInCommandPalette(page: Page, query: string) {
  await openCommandPalette(page)
  await page.fill('input[placeholder*="Поиск"]', query)
}

// Выбор элемента стрелками
async function selectItemByArrows(page: Page, index: number) {
  for (let i = 0; i < index; i++) {
    await page.keyboard.press('ArrowDown')
  }
  await page.keyboard.press('Enter')
}
```

### Helpers для Export

```typescript
// Ожидание скачивания файла
async function waitForDownload(page: Page) {
  const downloadPromise = page.waitForEvent('download')
  return downloadPromise
}

// Проверка содержимого CSV
async function verifyCsvContent(download: Download, expectedHeaders: string[]) {
  const path = await download.path()
  const content = fs.readFileSync(path, 'utf-8')
  const headers = content.split('\n')[0].split(';')
  expect(headers).toEqual(expectedHeaders)
}
```

---

## 📝 Зависимости тестов

| Компонент       | Требует                                        |
| --------------- | ---------------------------------------------- |
| Alert System    | Тестовые данные с долгами/отменами             |
| Breadcrumbs     | Многоуровневая навигация (owner pages)         |
| Command Palette | Авторизованный пользователь                    |
| KPI Card        | Данные статистики за несколько периодов        |
| Export          | Данные для экспорта, доступ к файловой системе |
| Dark mode       | localStorage доступ                            |

---

## 🎯 Критерии приёмки

- [x] Alert System интегрирован в dashboard секции
- [x] Bulk Actions компоненты созданы и интегрированы в UsersTable
- [x] Real-time SSE endpoint создан
- [ ] Все 66 E2E тестов проходят
- [ ] Command Palette работает на всех страницах
- [ ] Экспорт корректно форматирует кириллицу
- [ ] Dark mode сохраняется между сессиями
- [ ] Alerts показываются только при наличии данных
- [ ] Breadcrumbs корректно генерируются из URL
- [ ] KPI sparkline отображается корректно

---

## 📂 Файловая структура

```
apps/driving-school/src/app/
├── _components/
│   ├── bulk-actions/           # Компоненты массовых действий
│   │   ├── index.ts
│   │   ├── use-bulk-selection.ts
│   │   ├── row-checkbox.tsx
│   │   ├── select-all-checkbox.tsx
│   │   └── bulk-action-bar.tsx
│   └── realtime-indicator.tsx  # Индикатор SSE подключения
├── _hooks/
│   └── use-realtime.ts         # SSE хук с TanStack Query интеграцией
├── dashboard/
│   ├── _actions/
│   │   └── alerts.action.ts    # Server Actions для алертов
│   └── _components/
│       └── alerts-panel.tsx    # Панель критичных уведомлений
└── api/sse/dashboard/
    └── route.ts                # SSE endpoint

apps/driving-school-e2e/src/
├── 20-admin-ux.spec.ts         # E2E тесты фазы 15
└── helpers/
    └── admin-ux.helpers.ts     # Вспомогательные функции
```

---

**Последнее обновление:** 2026-01-19
