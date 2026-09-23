import type { CreateToasterReturn } from '@chakra-ui/react'

/**
 * Заповедь №20 студии: разрушительное действие отменяемо ПОСЛЕ, а не подтверждаемо ДО.
 * Библиотека покрывает два разных сценария под одной вывеской «тост с Отменить» — они звучат
 * похоже, но перепутывать их нельзя, у каждого свой контракт:
 *
 * 1. **`triggerUndoableAction` — немедленный commit + реальная отмена.** Есть soft-delete/
 *    восстановление на сервере (`deletedAt`/аналог). `action(vars)` выполняется сразу (заповедь
 *    №15, оптимистично), `undo(vars)` по клику явно ОТКАТЫВАЕТ уже совершённое действие. Ничего
 *    не теряется при закрытии вкладки — действие уже на сервере.
 * 2. **`triggerDeferredUndoableAction` — отложенный commit с pagehide-safety.** Нет soft-delete
 *    (обычный hard-delete/смена статуса без обратного действия). Запись убирается из UI сразу,
 *    но настоящий запрос (`onCommit`) откладывается на время жизни тоста; клик «Отменить»
 *    ОТМЕНЯЕТ ещё не отправленный запрос — откатывать нечего, он не уходил.
 *
 * Библиотека не трогает TanStack Query напрямую и не завязана на конкретный API мутаций —
 * `action`/`undo`/`onCommit`/`onUndo` это просто функции, вызывающая сторона решает, что внутри
 * них происходит.
 *
 * ⚠️ Не для действий, необратимых за пределами системы (списание платежа, отправка письма,
 * публикация вовне) — там подтверждение «до» остаётся правильным инструментом (заповедь №20,
 * WEBSTUDIO.md).
 *
 * ⚠️ Не подходит записям с внешним каскадным эффектом, который другие видят немедленно (см.
 * PLAN_CROSSCUTTING.md domwellbes, «Единообразие админки») — там нужен `TriggerConfirmDialog`,
 * не тост с отменой.
 */

const DEFAULT_UNDO_LABEL = 'Отменить'
const DEFAULT_UNDO_DURATION_MS = 5000

type ToastCreateOptions = Parameters<CreateToasterReturn['create']>[0]

export interface UndoToastOptions<TVars> {
  /** Текст тоста — строка или функция от параметров действия ("Удалено: {name}"). */
  message: string | ((vars: TVars) => string)
  /** Подпись кнопки отмены. */
  undoLabel?: string
  /** Сколько времени доступна отмена (мс). */
  durationMs?: number
  /** Выполняется сразу — тот же оптимистичный шаг, что и заповедь №15 (soft-delete и т.п.). */
  action: (vars: TVars) => Promise<void> | void
  /** Выполняется по клику "Отменить" — явно откатывает уже совершённый `action` (restore). */
  undo: (vars: TVars) => Promise<void> | void
  /** Ошибка любой из двух функций — сырую ошибку сюда, человекочитаемый текст (заповедь №11) решает вызывающая сторона. */
  onError?: (error: unknown, vars: TVars) => void
}

/**
 * Запускает `action` немедленно и показывает тост с окном отмены, вызывающим `undo` по клику.
 * Требует, чтобы `action` был реально обратим на сервере (soft-delete + restore) — если такого
 * обратного действия нет, используй `triggerDeferredUndoableAction`, не подделывай `undo`
 * заглушкой. Не хранит состояние сама — повторный вызов создаёт независимый тост с независимым
 * таймером.
 */
export function triggerUndoableAction<TVars>(
  toaster: CreateToasterReturn,
  options: UndoToastOptions<TVars>,
  vars: TVars,
): void {
  const {
    message,
    undoLabel = DEFAULT_UNDO_LABEL,
    durationMs = DEFAULT_UNDO_DURATION_MS,
    action,
    undo,
    onError,
  } = options

  const title = typeof message === 'function' ? message(vars) : message

  Promise.resolve(action(vars)).catch((error: unknown) => onError?.(error, vars))

  const toastOptions: ToastCreateOptions = {
    title,
    type: 'info',
    duration: durationMs,
    action: {
      label: undoLabel,
      onClick: () => {
        Promise.resolve(undo(vars)).catch((error: unknown) => onError?.(error, vars))
      },
    },
  }
  toaster.create(toastOptions)
}

export interface DeferredUndoToastOptions<TVars> {
  /** Текст тоста — строка или функция от параметров действия ("Удалено: {name}"). */
  message: string | ((vars: TVars) => string)
  /** Подпись кнопки отмены. */
  undoLabel?: string
  /** Сколько времени доступна отмена (мс). */
  durationMs?: number
  /**
   * Настоящая мутация — вызывается один раз, по истечении `durationMs` либо раньше, если
   * страница закрывается/перезагружается (`pagehide`/`beforeunload`, см. pagehide-safety ниже).
   * ⚠️ Обязан быть готов исполниться в unload-контексте: обычный `fetch`/Server Action браузер
   * может оборвать вместе с выгрузкой страницы, не дождавшись ответа. Используй
   * `fetch(url, { keepalive: true })` или `navigator.sendBeacon`, а не то, что годится только
   * для обычного клика.
   */
  onCommit: (vars: TVars) => Promise<void> | void
  /** Клик "Отменить" — отменяет запланированный `onCommit`, реальный запрос не уходит вовсе. */
  onUndo: (vars: TVars) => Promise<void> | void
  /** Ошибка `onCommit`/`onUndo` — сырую ошибку сюда, человекочитаемый текст (заповедь №11) решает вызывающая сторона. */
  onError?: (error: unknown, vars: TVars) => void
}

/**
 * Показывает тост с окном отмены и откладывает `onCommit` до истечения `durationMs` — либо до
 * более раннего ухода со страницы.
 *
 * ⚠️ pagehide-safety обязательна, не опциональна. Модель «отложенный commit только по таймеру»
 * без сброса при уходе со страницы уже ломалась на корзине (`cart-item-row.tsx`): пользователь
 * закрывает вкладку/перезагружает страницу, пока идёт окно — таймер не долетает, `onCommit`
 * не срабатывает никогда, а пользователь уверен, что действие выполнено. Поэтому здесь
 * `onCommit` срабатывает РОВНО ОДИН РАЗ — либо по истечении `durationMs`, либо немедленно на
 * `pagehide`/`beforeunload`, если это случилось раньше. Оба слушателя нужны одновременно:
 * `pagehide` — основной сигнал ухода (переживает bfcache-навигацию, надёжнее в мобильном Safari),
 * `beforeunload` — подстраховка для сред, где `pagehide` не долетает.
 *
 * Используй эту функцию (не `triggerUndoableAction`) там, где нет реального обратного действия
 * на сервере — обычный hard-delete/переход в терминальный статус без soft-delete поля. Не хранит
 * состояние сама — повторный вызов создаёт независимый тост с независимым таймером.
 */
export function triggerDeferredUndoableAction<TVars>(
  toaster: CreateToasterReturn,
  options: DeferredUndoToastOptions<TVars>,
  vars: TVars,
): void {
  const {
    message,
    undoLabel = DEFAULT_UNDO_LABEL,
    durationMs = DEFAULT_UNDO_DURATION_MS,
    onCommit,
    onUndo,
    onError,
  } = options

  const title = typeof message === 'function' ? message(vars) : message
  const hasWindow = typeof window !== 'undefined'
  let settled = false

  const cleanup = (): void => {
    clearTimeout(timer)
    if (hasWindow) {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }

  const flush = (): void => {
    if (settled) {
      return
    }
    settled = true
    cleanup()
    Promise.resolve(onCommit(vars)).catch((error: unknown) => onError?.(error, vars))
  }

  const timer = setTimeout(flush, durationMs)

  if (hasWindow) {
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
  }

  const toastOptions: ToastCreateOptions = {
    title,
    type: 'info',
    duration: durationMs,
    action: {
      label: undoLabel,
      onClick: () => {
        if (settled) {
          return
        }
        settled = true
        cleanup()
        Promise.resolve(onUndo(vars)).catch((error: unknown) => onError?.(error, vars))
      },
    },
  }
  toaster.create(toastOptions)
}
