import type { CreateToasterReturn } from '@chakra-ui/react'

/**
 * Заповедь №20 студии: разрушительное действие отменяемо ПОСЛЕ, а не подтверждаемо ДО.
 * Вместо диалога «Вы уверены?» — действие выполняется сразу (заповедь №15, оптимистично), следом
 * всплывает тост с окном отмены, пока реальная отмена ещё физически возможна на бэкенде
 * (soft-delete/отложенный commit — не мгновенный hard-delete).
 *
 * Библиотека не трогает TanStack Query напрямую и не завязана на конкретный API мутаций —
 * `action`/`undo` это просто асинхронные функции, вызывающая сторона решает, что внутри них
 * происходит (soft-delete запрос, оптимистичный откат кэша и т.п.).
 *
 * ⚠️ Не для действий, необратимых за пределами системы (списание платежа, отправка письма,
 * публикация вовне) — там окно «после» не может откатить эффект, подтверждение «до» остаётся
 * правильным инструментом (см. текст заповеди №20 в WEBSTUDIO.md).
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
  /** Выполняется сразу — тот же оптимистичный шаг, что и заповедь №15. */
  action: (vars: TVars) => Promise<void> | void
  /** Выполняется по клику "Отменить" — откат `action`. */
  undo: (vars: TVars) => Promise<void> | void
  /** Ошибка любой из двух функций — сырую ошибку сюда, человекочитаемый текст (заповедь №11) решает вызывающая сторона. */
  onError?: (error: unknown, vars: TVars) => void
}

/**
 * Запускает `action` немедленно и показывает тост с окном отмены, вызывающим `undo` по клику.
 * Не хранит состояние сама — повторный вызов создаёт независимый тост с независимым таймером.
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
