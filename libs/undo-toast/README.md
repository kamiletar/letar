# @letar/undo-toast

Разрушительное действие отменяемо ПОСЛЕ, а не подтверждаемо ДО — заповедь №20 студии
(`.claude/private/WEBSTUDIO.md`). Вместо диалога «Вы уверены?» действие выполняется сразу
(заповедь №15), следом — тост с окном отмены на несколько секунд.

Не трогает `@letar/ui` напрямую и не завязана на TanStack Query — принимает уже готовый
`toaster`-инстанс (из `createAppToaster()` в `@letar/ui`) и произвольные `action`/`undo`
колбэки. Что внутри них — soft-delete запрос, оптимистичный откат кэша — решает вызывающая
сторона.

⚠️ **Не для действий, необратимых за пределами системы** (списание платежа, отправленное
письмо, публикация вовне) — там окно «после» физически не откатывает эффект, подтверждение
«до» остаётся правильным инструментом.

## Установка

```typescript
import { triggerUndoableAction } from '@letar/undo-toast'
import { useUndoableAction } from '@letar/undo-toast/client'
```

## API

### `triggerUndoableAction(toaster, options, vars)`

Вызывает `options.action(vars)` немедленно, показывает тост (`toaster.create`) с кнопкой
`options.undoLabel` (дефолт «Отменить»), живущей `options.durationMs` (дефолт 5000мс). Клик по
кнопке вызывает `options.undo(vars)`.

```typescript
triggerUndoableAction(
  toaster, // из createAppToaster() приложения
  {
    message: (item: { name: string }) => `Удалено: ${item.name}`,
    action: (item) => softDeleteMaterial(item.id), // сразу помечает deletedAt на сервере
    undo: (item) => restoreMaterial(item.id),
  },
  material,
)
```

### `useUndoableAction(toaster, options)` (`@letar/undo-toast/client`)

React-хук — возвращает мемоизированный `trigger(vars)`. `options` не мемоизируется
автоматически — при нестабильных колбэках оборачивай их `useCallback` на стороне компонента.

## Статус (2026-09-05)

Спроектировано и покрыто тестами в изоляции (мок `toaster`, реальный Chakra-рендер не
проверялся) — **интеграция ни в одно приложение ещё не сделана**. Реальная финализация
soft-delete после истечения окна (cron/отложенный commit на бэкенде) — ответственность
вызывающего приложения, не этой библиотеки. См. `/commandments-check`.

## Команды

```bash
nx test undo-toast
nx lint undo-toast
nx typecheck:tsgo undo-toast
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/undo-toast` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/undo-toast` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
