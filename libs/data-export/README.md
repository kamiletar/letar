# @letar/data-export

«Свои данные забрать и стереть самому» — заповедь №30 студии
(`.claude/private/WEBSTUDIO.md`). Две кнопки в профиле без письма в поддержку: «Скачать мои
данные» и «Удалить аккаунт» — 152-ФЗ даёт на это право (ст. 14, ст. 21), обычная реализация
«напишите нам на почту» формально законна, но превращает право в квест.

Не знает про модели конкретного приложения — источники данных и шаги удаления передаются как
произвольные async-колбэки, приложение само решает, что собирать (исключая чужие данные — второй
участник сделки, чужие комментарии в ветке) и что обезличивать вместо удаления (заказы/счета/
платежи по 152-ФЗ обязаны пережить аккаунт — бухучёт 5 лет). Кнопка «Удалить» на UI-стороне —
не отдельный компонент этой либы, а `@letar/undo-toast` (заповедь №20 прямо требует окно отмены
перед необратимым действием).

## Установка

```typescript
import { collectDataExport, runDeletionSteps } from '@letar/data-export'
```

## API

### `collectDataExport(collectors)`

`collectors` — `Record<string, () => Promise<unknown>>`, один ключ на источник. Каждый источник
собирается независимо — сбой одного не обнуляет остальные, каждый результат приходит отдельно
помеченным.

```typescript
const bundle = await collectDataExport({
  profile: () => db.user.findUnique({ where: { id: userId } }),
  orders: () => db.order.findMany({ where: { userId } }),
})
// { generatedAt: Date, data: { profile: { ok: true, value }, orders: { ok: true, value } } }
```

### `runDeletionSteps(steps)`

`steps` — `{ name, run }[]`, выполняются **последовательно** (не параллельно) — типичный порядок
«отвязать связи → затем обезличить/удалить владельца» требует завершения ранних шагов раньше
поздних. Сбой одного шага не прерывает остальные.

```typescript
const outcomes = await runDeletionSteps([
  { name: 'обезличить платежи', run: () => anonymizePayments(userId) },
  { name: 'удалить профиль', run: () => db.user.delete({ where: { id: userId } }) },
])
// [{ name, ok: true } | { name, ok: false, error }]
```

## Статус (2026-09-05)

Спроектировано и покрыто тестами в изоляции — **интеграция ни в одно приложение ещё не
сделана**. Первый кандидат — `studio` (свой личный кабинет, 152-ФЗ в ДНК). См.
`/commandments-check`.

## Команды

```bash
nx test data-export
nx lint data-export
nx typecheck:tsgo data-export
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/data-export` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/data-export` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
