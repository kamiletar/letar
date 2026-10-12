'use client'

import { Box, Steps } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'
import { useFormStepsContext } from './form-steps-context'

export interface FormStepsIndicatorProps {
  /** Custom completed icon (default: check mark) */
  completedIcon?: React.ReactNode
  /** Show step descriptions in indicator */
  showDescriptions?: boolean
  /** Allow clicking on steps to navigate (disabled in linear mode) */
  clickable?: boolean
  /**
   * Ниже какого брейкпоинта прятать подписи шагов и оставлять только номера.
   * Название шага остаётся в `aria-label` кнопки.
   * `false` — подписи видны всегда (прежнее поведение). По умолчанию `md`.
   */
  collapseLabelsBelow?: 'sm' | 'md' | 'lg' | 'xl' | false
}

/**
 * Form.Steps.Indicator - Step progress indicator
 *
 * Displays a horizontal or vertical stepper showing progress through form steps.
 * Automatically reads step information from registered Form.Steps.Step components.
 *
 * @example
 * ```tsx
 * <Form.Steps>
 *   <Form.Steps.Indicator showDescriptions />
 *   ...
 * </Form.Steps>
 * ```
 */
export function FormStepsIndicator({
  completedIcon = <LuCheck />,
  showDescriptions = false,
  clickable = true,
  collapseLabelsBelow = 'md',
}: FormStepsIndicatorProps) {
  const { steps, linear } = useFormStepsContext()

  // Подписи видны только от брейкпоинта вверх: на 360 px четыре шага с подписями растягивали страницу
  const labelDisplay = collapseLabelsBelow ? { base: 'none', [collapseLabelsBelow]: 'block' } : undefined

  // In linear mode, clicking is disabled
  const isClickable = clickable && !linear

  return (
    <Steps.List>
      {steps.map((step) => (
        <Steps.Item key={step.index} index={step.index}>
          {isClickable
            ? (
              <Steps.Trigger aria-label={collapseLabelsBelow ? step.title : undefined}>
                <Steps.Indicator>
                  <Steps.Status complete={completedIcon} incomplete={step.icon || <Steps.Number />} />
                </Steps.Indicator>
                {showDescriptions && step.description
                  ? (
                    <Box display={labelDisplay}>
                      <Steps.Title>{step.title}</Steps.Title>
                      <Steps.Description display={labelDisplay}>{step.description}</Steps.Description>
                    </Box>
                  )
                  : <Steps.Title display={labelDisplay}>{step.title}</Steps.Title>}
              </Steps.Trigger>
            )
            : (
              <>
                <Steps.Indicator>
                  <Steps.Status complete={completedIcon} incomplete={step.icon || <Steps.Number />} />
                </Steps.Indicator>
                {showDescriptions && step.description
                  ? (
                    <Box display={labelDisplay}>
                      <Steps.Title>{step.title}</Steps.Title>
                      <Steps.Description display={labelDisplay}>{step.description}</Steps.Description>
                    </Box>
                  )
                  : <Steps.Title display={labelDisplay}>{step.title}</Steps.Title>}
              </>
            )}
          <Steps.Separator />
        </Steps.Item>
      ))}
    </Steps.List>
  )
}

FormStepsIndicator.displayName = 'FormStepsIndicator'
