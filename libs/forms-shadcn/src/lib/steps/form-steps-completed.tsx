'use client'

import type { ReactNode } from 'react'
import { useFormStepsContext } from './form-steps-context'

export interface FormStepsCompletedContentProps {
  children: ReactNode
}

/** Form.Steps.CompletedContent — shadcn-скин. Показывается после прохождения всех шагов. */
export function FormStepsCompletedContent({ children }: FormStepsCompletedContentProps) {
  const { isCompleted } = useFormStepsContext()
  if (!isCompleted) { return null }
  return <div>{children}</div>
}

FormStepsCompletedContent.displayName = 'FormStepsCompletedContent'
