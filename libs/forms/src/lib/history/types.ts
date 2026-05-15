/** Конфигурация useFormHistory */
export interface FormHistoryConfig {
  /** Максимальное количество записей в истории (по умолчанию 50) */
  maxHistory?: number
  /** Debounce в мс перед записью в историю (по умолчанию 500) */
  debounceMs?: number
  /** Сохранять историю в sessionStorage (по умолчанию false) */
  persist?: boolean
  /** Ключ для sessionStorage (по умолчанию 'form-history') */
  persistKey?: string
  /** Включить keyboard shortcuts Ctrl+Z/Ctrl+Y (по умолчанию true) */
  keyboard?: boolean
}

/** Запись в истории формы */
export interface HistoryEntry<T = unknown> {
  /** Состояние формы на момент записи */
  values: T
  /** Таймстамп записи */
  timestamp: number
}

/** Результат хука useFormHistory */
export interface UseFormHistoryResult<T = unknown> {
  /** Отменить последнее действие */
  undo: () => void
  /** Повторить отменённое действие */
  redo: () => void
  /** Можно ли отменить */
  canUndo: boolean
  /** Можно ли повторить */
  canRedo: boolean
  /** Текущий индекс в истории */
  currentIndex: number
  /** Общее количество записей */
  historyLength: number
  /** Очистить историю */
  clear: () => void
  /** Полная история (для отладки) */
  history: HistoryEntry<T>[]
}
