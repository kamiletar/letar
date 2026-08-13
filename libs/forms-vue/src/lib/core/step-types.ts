import type { VNode } from 'vue'

/**
 * Информация об одном шаге, общая для headless- и shadcn-скина `Form.Steps`.
 * Vue-эквивалент `StepInfo` из `@letar/forms-react` (`libs/forms-react/src/lib/steps/step-types.ts`) —
 * `icon`/`ReactNode` заменён на `VNode | string`, остальное 1:1.
 */
export interface StepInfo {
  /** Индекс шага (0-based) */
  index: number
  /** Заголовок шага */
  title: string
  /** Опциональное описание */
  description?: string
  /** Опциональная иконка */
  icon?: VNode | string
  /** Имена полей на этом шаге (для валидации) */
  fieldNames: string[]
  /** Колбэк при входе на шаг */
  onEnter?: () => void
  /** Колбэк при выходе с шага (может отменить переход) */
  onLeave?: (direction: StepDirection) => Promise<boolean> | boolean
}

/** Направление перехода между шагами (для UI-индикатора/анимации в скине) */
export type StepDirection = 'forward' | 'backward'
