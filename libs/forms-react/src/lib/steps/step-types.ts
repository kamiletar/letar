'use client'

import type { ReactNode } from 'react'

/** Информация об одном шаге, общая для всех UI-скинов Form.Steps. */
export interface StepInfo {
  /** Индекс шага (0-based) */
  index: number
  /** Заголовок шага */
  title: string
  /** Опциональное описание */
  description?: string
  /** Опциональная иконка */
  icon?: ReactNode
  /** Имена полей на этом шаге (для валидации) */
  fieldNames: string[]
  /** Колбэк при входе на шаг */
  onEnter?: () => void
  /** Колбэк при выходе с шага (может отменить переход) */
  onLeave?: (direction: StepDirection) => Promise<boolean> | boolean
}

/** Направление анимации перехода между шагами */
export type StepDirection = 'forward' | 'backward'
