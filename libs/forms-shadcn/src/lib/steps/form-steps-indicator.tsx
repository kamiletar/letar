'use client'

import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { useFormStepsContext } from './form-steps-context'

export interface FormStepsIndicatorProps {
  /** Кастомная иконка завершённого шага (по умолчанию — галочка) */
  completedIcon?: ReactNode
  /** Показывать описания шагов */
  showDescriptions?: boolean
  /** Разрешить клик по индикатору для навигации (отключено в linear-режиме) */
  clickable?: boolean
}

/**
 * Form.Steps.Indicator — shadcn-скин (beta). Прогресс-индикатор шагов, нативная разметка
 * (кнопки/разделители) вместо Chakra `Steps.List`/`Steps.Item`.
 */
export function FormStepsIndicator({
  completedIcon = <Check className="size-4" />,
  showDescriptions = false,
  clickable = true,
}: FormStepsIndicatorProps) {
  const { steps, linear, currentStep, goToStep } = useFormStepsContext()
  const isClickable = clickable && !linear

  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isCompleted = step.index < currentStep
        const isActive = step.index === currentStep
        return (
          <li key={step.index} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => goToStep(step.index)}
              className={cn(
                'flex items-center gap-2 text-left',
                !isClickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  isCompleted && 'bg-primary text-primary-foreground border-primary',
                  isActive && !isCompleted && 'border-ring text-foreground',
                  !isActive && !isCompleted && 'border-input text-muted-foreground',
                )}
              >
                {isCompleted ? completedIcon : (step.icon ?? step.index + 1)}
              </span>
              <span>
                <span className={cn('block text-sm', isActive ? 'font-medium' : 'text-muted-foreground')}>
                  {step.title}
                </span>
                {showDescriptions && step.description && (
                  <span className="text-muted-foreground block text-xs">{step.description}</span>
                )}
              </span>
            </button>
            {i < steps.length - 1 && <span className="bg-border h-px flex-1" />}
          </li>
        )
      })}
    </ol>
  )
}

FormStepsIndicator.displayName = 'FormStepsIndicator'
