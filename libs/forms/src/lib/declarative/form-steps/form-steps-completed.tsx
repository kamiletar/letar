'use client'

import { Steps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface FormStepsCompletedContentProps {
  /** Content to show when all steps are completed */
  children: ReactNode
}

/**
 * Form.Steps.CompletedContent - Content shown after all steps are completed
 *
 * This content is displayed when the user has gone past the last step.
 * Useful for showing a summary or confirmation message.
 *
 * @example
 * ```tsx
 * <Form.Steps.CompletedContent>
 *   <Text>All steps complete! Review your data below.</Text>
 *   <FormSummary />
 * </Form.Steps.CompletedContent>
 * ```
 */
export function FormStepsCompletedContent({ children }: FormStepsCompletedContentProps) {
  return <Steps.CompletedContent>{children}</Steps.CompletedContent>
}

FormStepsCompletedContent.displayName = 'FormStepsCompletedContent'
