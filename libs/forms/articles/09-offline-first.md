# Offline-first формы: как не потерять данные при обрыве связи

> **Уровень сложности:** Сложный

**TL;DR:**

- Один проп `offline` включает сохранение в IndexedDB при потере сети и автосинхронизацию с retry при восстановлении
- Три независимых механизма: `persistence` (черновики в localStorage), `offline` (гарантия доставки через IndexedDB), `useFormAutosave` (серверный автосейв)
- Edge-кейсы решены: конфликты синхронизации, FileUpload в offline, лимиты IndexedDB, мониторинг очереди

**Кому полезно:**

- Junior: понять разницу между persistence (черновики) и offline (гарантия доставки) и когда какой механизм использовать
- Middle: освоить offline prop, SyncQueue, конфликт-стратегии и паттерн комбинирования persistence + offline
- Senior: оценить архитектуру retry с backoff, FileUpload в offline-режиме и серверный автосейв для CMS-форм

---

> Девятая статья из цикла «@letar/forms — от боли к декларативным формам». Как формы сохраняют данные локально при потере связи и синхронизируются при восстановлении.

---

## Проблема: заполнил — потерял

Инструктор автошколы заполняет отчёт о занятии на планшете. 15 полей: ученик, маршрут, результаты, замечания. Нажимает «Отправить» — и видит ошибку сети. Данные потеряны. 10 минут работы в пустую.

Или другой сценарий: менеджер в поле заполняет форму заказа. Мобильный интернет нестабилен. Форма зависает на submit — непонятно, отправилось или нет.

---

## Решение: offline prop

```tsx
<Form
  schema={LessonReportSchema}
  initialValue={data}
  onSubmit={saveLessonReport}
  offline={{
    actionType: 'SAVE_LESSON_REPORT',
    onQueued: () => toast.info('Сохранено локально. Отправится при восстановлении связи.'),
    onSynced: () => toast.success('Синхронизировано с сервером!'),
    onSyncError: (error) => toast.error(`Ошибка синхронизации: ${error.message}`),
  }}
>
  <Form.OfflineIndicator />
  <Form.Field.String name="studentName" />
  <Form.Field.Select name="route" />
  <Form.Field.Rating name="result" />
  <Form.Field.Textarea name="notes" />
  <Form.Button.Submit>Сохранить отчёт</Form.Button.Submit>
</Form>
```

Что происходит:

1. **Онлайн**: форма отправляется как обычно через `onSubmit`
2. **Оффлайн**: данные сохраняются в IndexedDB + ставятся в очередь
3. **Восстановление**: очередь автоматически синхронизируется
4. `OfflineIndicator` показывает текущий статус

---

## Как это работает

### Архитектура

```
┌─────────────┐    Онлайн?     ┌──────────────┐
│  Form Submit │───── Да ──────▶│  onSubmit()  │──▶ Сервер
│             │                └──────────────┘
│             │    Нет?         ┌──────────────┐
│             │───── Нет ──────▶│  IndexedDB   │
└─────────────┘                └──────┬───────┘
                                      │
                          ┌───────────▼──────────┐
                          │  SyncQueue (фоновый)  │
                          │  Ждёт восстановления  │
                          └───────────┬──────────┘
                                      │ Онлайн!
                          ┌───────────▼──────────┐
                          │  Retry: onSubmit()    │──▶ Сервер
                          │  3 попытки, backoff   │
                          └──────────────────────┘
```

### IndexedDB: локальное хранилище

Каждая отправка формы сохраняется как запись:

```typescript
{
  id: 'uuid-1234',
  actionType: 'SAVE_LESSON_REPORT',
  data: { studentName: 'Иванов', route: 'маршрут-3', ... },
  status: 'pending',       // pending → syncing → synced | failed
  createdAt: '2026-03-31T10:00:00Z',
  retryCount: 0,
}
```

### SyncQueue: очередь синхронизации

```typescript
// Фоновый процесс
window.addEventListener('online', () => {
  syncQueue.processAll()
})

// Или по таймеру (для нестабильного соединения)
setInterval(() => {
  if (navigator.onLine) {
    syncQueue.processAll()
  }
}, 30_000) // каждые 30 сек
```

Retry-стратегия:

- 1-я попытка: сразу
- 2-я: через 5 сек
- 3-я: через 30 сек
- После 3 неудач: `status: 'failed'`, вызов `onSyncError`

---

## OfflineIndicator: UI статуса

```tsx
<Form.OfflineIndicator />
```

Показывает:

- **Онлайн**: ничего (или зелёный индикатор)
- **Оффлайн**: жёлтая плашка «Нет соединения. Данные сохраняются локально»
- **Синхронизация**: «Отправка 3 из 5...» с прогресс-баром
- **Ошибка**: красная плашка с кнопкой «Повторить»

---

## Persistence: сохранение черновиков

Отдельная от offline фича — автосохранение черновиков в localStorage:

```tsx
<Form
  schema={Schema}
  initialValue={data}
  onSubmit={save}
  persistence={{
    key: 'product-draft', // Ключ в localStorage
    debounceMs: 1000, // Сохранять через 1 сек после изменения
    onRestore: () => toast.info('Восстановлен черновик'),
  }}
>
  ...
</Form>
```

Пользователь закрыл вкладку, вернулся — черновик на месте. После успешной отправки черновик удаляется.

### Persistence vs Offline

| Аспект    | Persistence          | Offline                |
| --------- | -------------------- | ---------------------- |
| Хранилище | localStorage         | IndexedDB              |
| Когда     | При вводе (autosave) | При submit без сети    |
| Цель      | Не потерять черновик | Гарантировать доставку |
| Очередь   | Нет                  | Да, с retry            |

Можно комбинировать оба:

```tsx
<Form
  schema={Schema}
  initialValue={data}
  onSubmit={save}
  persistence={{ key: 'order-draft' }}
  offline={{ actionType: 'CREATE_ORDER', onSynced: () => toast.success('Заказ создан!') }}
>
```

---

## Реальный кейс: PWA для автошколы

Driving-school — PWA-приложение для автошкол. Инструкторы работают на планшетах, часто без стабильного интернета:

```tsx
function LessonReportForm({ lesson, students }) {
  return (
    <Form
      schema={LessonReportSchema}
      initialValue={{ lessonId: lesson.id, date: new Date() }}
      onSubmit={saveLessonReport}
      persistence={{ key: `lesson-${lesson.id}` }}
      offline={{
        actionType: 'SAVE_LESSON_REPORT',
        onQueued: () => toast.info('Отчёт сохранён локально'),
        onSynced: () => toast.success('Отчёт отправлен'),
      }}
    >
      <Form.OfflineIndicator />

      <Form.Field.Select name="studentId" options={students} />
      <Form.Field.Date name="date" />
      <Form.Field.Duration name="duration" />
      <Form.Field.Select name="route" />

      {/* Form.Steps — подробнее в статье 5: мультистеп */}
      <Form.Steps animated>
        <Form.Steps.Step title="Оценка">
          <Form.Field.Rating name="theory" />
          <Form.Field.Rating name="practice" />
          <Form.Field.Rating name="safety" />
        </Form.Steps.Step>

        <Form.Steps.Step title="Замечания">
          <Form.Field.Textarea name="notes" />
          <Form.Field.FileUpload name="photos" accept="image/*" />
        </Form.Steps.Step>

        <Form.Steps.Navigation submitLabel="Сохранить отчёт" />
      </Form.Steps>
    </Form>
  )
}
```

Инструктор заполняет отчёт → интернет пропал → данные в IndexedDB → связь вернулась → автосинхронизация → toast «Отчёт отправлен».

---

## Edge-кейсы: конфликты, файлы и лимиты

### Конфликты при синхронизации

Пользователь заполнил форму оффлайн, а за это время запись на сервере изменилась. Что делать?

```typescript
offline={{
  actionType: 'UPDATE_LESSON_REPORT',
  conflictStrategy: 'last-write-wins', // по умолчанию
  onConflict: (local, server) => {
    // Кастомная стратегия: показать диалог
    return showConflictDialog(local, server)
  },
}}
```

Три стратегии разрешения:

| Стратегия         | Описание                                      |
| ----------------- | --------------------------------------------- |
| `last-write-wins` | Последнее сохранение побеждает (по умолчанию) |
| `server-wins`     | Серверная версия всегда приоритетнее          |
| `manual`          | Вызывается `onConflict` — пользователь решает |

Для большинства форм (создание записей) конфликтов не бывает. Для редактирования — рекомендуется `onConflict` с UI для сравнения версий.

### FileUpload в offline-режиме

Файлы — особый случай. Бинарные данные больше текстовых полей на порядки:

```typescript
// При offline submit файлы сохраняются как Blob в IndexedDB
{
  id: 'uuid-5678',
  actionType: 'SAVE_REPORT',
  data: { studentName: 'Иванов', notes: '...' },
  files: [
    { fieldName: 'photos', blob: Blob(245000), fileName: 'photo1.jpg' },
    { fieldName: 'photos', blob: Blob(312000), fileName: 'photo2.jpg' },
  ],
  status: 'pending',
}
```

При синхронизации файлы отправляются через `FormData`:

1. Сначала отправляются файлы → получаем URL
2. Затем отправляются данные формы с URL файлов
3. Если файл не удалось отправить — запись остаётся в очереди

**Ограничение:** очень большие файлы (>50 МБ) могут не поместиться в IndexedDB. Для таких случаев рекомендуется ограничение `maxSize` в Zod-схеме.

### Лимиты IndexedDB

| Браузер | Лимит                              | Как узнать                     |
| ------- | ---------------------------------- | ------------------------------ |
| Chrome  | До 80% свободного места            | `navigator.storage.estimate()` |
| Firefox | До 50% свободного места            | `navigator.storage.estimate()` |
| Safari  | ~1 ГБ (может запросить увеличение) | Нет API                        |

На практике: 1000 текстовых форм занимают ~5 МБ. Проблемы начинаются только с файлами.

Библиотека автоматически:

- Удаляет записи со статусом `synced` через 24 часа
- Показывает предупреждение, если очередь содержит >50 записей
- Предоставляет API для ручной очистки: `syncQueue.clear({ status: 'synced' })`

### Мониторинг очереди

```tsx
import { useSyncQueue } from '@letar/forms/offline'

function SyncStatus() {
  const { pending, syncing, failed, total } = useSyncQueue()

  return (
    <Text fontSize="sm" color="gray.500">
      В очереди: {pending} | Отправляется: {syncing} | Ошибки: {failed}
    </Text>
  )
}
```

---

## Серверный автосейв

Для длинных форм (20+ полей) данные должны сохраняться на сервер автоматически, не дожидаясь submit:

```tsx
import { AutosaveIndicator, useFormAutosave } from '@letar/forms'

function EditProductForm({ productId }: { productId: string }) {
  return (
    <Form schema={ProductSchema} initialValue={product} onSubmit={save}>
      <AutosaveIndicator /> {/* «Сохранено» / «Сохраняется...» / «Ошибка» */}
      <Form.Field.String name="title" />
      <Form.Field.RichText name="description" />
      <Form.Field.Currency name="price" />
      <Form.Button.Submit>Опубликовать</Form.Button.Submit>
    </Form>
  )
}
```

`useFormAutosave` принимает:

- `endpoint` — URL для PUT/PATCH запроса
- `interval` — интервал автосохранения (по умолчанию 30 секунд)
- `debounce` — задержка после последнего изменения (по умолчанию 2 секунды)

### Form.DirtyGuard — предупреждение при уходе

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.DirtyGuard message="У вас есть несохранённые изменения. Уйти?" />
  <Form.Field.String name="title" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

`DirtyGuard` перехватывает `beforeunload` и навигацию (Next.js Router) — если форма грязная, показывает подтверждение.

---

## Сравнение подходов

| Функция        | `persistence`             | `offline`               | `useFormAutosave`         |
| -------------- | ------------------------- | ----------------------- | ------------------------- |
| Хранилище      | localStorage              | IndexedDB               | Сервер (API endpoint)     |
| Когда          | При каждом изменении      | При submit без сети     | По таймеру / debounce     |
| Восстановление | При перезагрузке страницы | При восстановлении сети | Не нужно (уже на сервере) |
| Для чего       | Черновики                 | Гарантия доставки       | Длинные формы (CMS)       |

---

## Итоги

| Компонент                               | Что делает                                 |
| --------------------------------------- | ------------------------------------------ |
| `offline` prop                          | Включает offline-режим с очередью          |
| `persistence` prop                      | Автосохранение черновиков                  |
| `useFormAutosave`                       | Серверный автосейв по таймеру              |
| `AutosaveIndicator`                     | UI-статус автосохранения                   |
| `Form.DirtyGuard`                       | Предупреждение о несохранённых данных      |
| `Form.OfflineIndicator`                 | UI-статус сети и синхронизации             |
| `actionType`                            | Тип действия (для идентификации в очереди) |
| `onQueued` / `onSynced` / `onSyncError` | Колбэки жизненного цикла                   |

Ключевые принципы:

1. **Форма не знает про сеть** — offline/online прозрачно для пользователя
2. **Гарантия доставки** — retry с exponential backoff
3. **Persistence отдельно** — черновики ≠ offline-очередь
4. **Автосейв** — для длинных форм, где данные критичны

---

## Ссылки

- **Документация:** [forms.letar.best](https://forms.letar.best)
- **Примеры:** [forms-example.letar.best](https://forms-example.letar.best)
- **GitHub:** [github.com/letar/forms](https://github.com/letar/forms)
- **npm MCP:** `npx @letar/form-mcp`
- **Offline-формы:** [forms-example.letar.best/examples/offline](https://forms-example.letar.best/examples/offline)
- **Persistence:** [forms-example.letar.best/examples/persistence](https://forms-example.letar.best/examples/persistence)

---

_Это девятая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: ZenStack pipeline](08-zenstack-pipeline.md) | [Следующая: i18n](10-i18n.md)._

---

**Как вы решаете offline-сценарии?**
