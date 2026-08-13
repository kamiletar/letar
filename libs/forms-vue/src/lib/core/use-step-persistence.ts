import { onScopeDispose, type Ref, watch } from 'vue'

const DEFAULT_STORAGE_PREFIX = 'form-steps:'

/**
 * Конфигурация персистенции шагов формы
 */
export interface StepPersistenceConfig {
  /** Уникальный ключ для localStorage — должен быть уникален для каждой формы */
  key: string
  /**
   * Задержка debounce сохранения в миллисекундах
   * @default 300
   */
  debounceMs?: number
  /**
   * Префикс ключа localStorage — разные скины на одной странице не должны конфликтовать друг
   * с другом (например headless- и shadcn-версия одной формы).
   * @default 'form-steps:'
   */
  storagePrefix?: string
}

/**
 * Синхронное чтение сохранённого шага. Vue-порт `useStepPersistence` из `@letar/forms-react`
 * (`libs/forms-react/src/lib/steps/use-step-persistence.ts`) разделяет React-хук на две части:
 * React вызывал `useStepPersistence(0, config)` отдельным экземпляром хука только ради этой
 * функции (хуки обязаны вызываться безусловно на верхнем уровне, до инициализации `useState`)
 * — побочный эффект такого вызова: его собственный `useEffect([currentStep=0])` отрабатывал на
 * mount и планировал debounce-запись `"0"` поверх только что восстановленного значения; это не
 * ломало итоговый результат только благодаря порядку выполнения двух `setTimeout` (см. разбор в
 * `CHANGELOG.md`). В Vue `setup()` не имеет такого ограничения на порядок вызовов — `getPersistedStep`
 * вынесен в обычную синхронную функцию без реактивности и без риска гонки таймеров.
 */
export function getPersistedStep(config?: StepPersistenceConfig): number | null {
  if (!config || typeof window === 'undefined') {
    return null
  }
  try {
    const prefix = config.storagePrefix ?? DEFAULT_STORAGE_PREFIX
    const stored = localStorage.getItem(`${prefix}${config.key}`)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed
      }
    }
  } catch {
    // Некорректное значение или ошибка localStorage — игнорировать
  }
  return null
}

/**
 * Результат `useStepPersistence`
 */
export interface UseStepPersistenceResult {
  /** Очистить сохранённый шаг (вызывать после успешной отправки формы) */
  clearPersistence: () => void
}

/**
 * Composable реактивной персистенции текущего шага в localStorage (запись, с debounce). Чтение —
 * отдельная синхронная функция `getPersistedStep`, см. её комментарий.
 *
 * @example
 * ```ts
 * const currentStep = ref(0)
 * const { clearPersistence } = useStepPersistence(currentStep, { key: 'my-form', debounceMs: 300 })
 * ```
 */
export function useStepPersistence(
  currentStep: Ref<number>,
  config?: StepPersistenceConfig,
): UseStepPersistenceResult {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    currentStep,
    (value) => {
      if (!config || typeof window === 'undefined') {
        return
      }

      const debounceMs = config.debounceMs ?? 300
      const prefix = config.storagePrefix ?? DEFAULT_STORAGE_PREFIX

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        try {
          localStorage.setItem(`${prefix}${config.key}`, String(value))
        } catch {
          // localStorage может быть переполнен или отключён
        }
      }, debounceMs)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  })

  function clearPersistence(): void {
    if (!config || typeof window === 'undefined') {
      return
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    try {
      const prefix = config.storagePrefix ?? DEFAULT_STORAGE_PREFIX
      localStorage.removeItem(`${prefix}${config.key}`)
    } catch {
      // Игнорировать ошибки
    }
  }

  return { clearPersistence }
}
