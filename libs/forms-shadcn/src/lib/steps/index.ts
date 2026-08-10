'use client'

import { FormStepsCompletedContent } from './form-steps-completed'
import { FormStepsIndicator } from './form-steps-indicator'
import { FormStepsNavigation } from './form-steps-navigation'
import { FormStepsRoot } from './form-steps-root'
import { FormStepsStep } from './form-steps-step'

export type { FormStepsCompletedContentProps } from './form-steps-completed'
export type { FormStepsIndicatorProps } from './form-steps-indicator'
export type { FormStepsNavigationProps } from './form-steps-navigation'
export type { FormStepsProps, StepPersistenceConfig } from './form-steps-root'
export type { FormStepsStepProps } from './form-steps-step'

interface FormStepsCompound {
  (props: import('./form-steps-root').FormStepsProps): ReturnType<typeof FormStepsRoot>
  Step: typeof FormStepsStep
  Indicator: typeof FormStepsIndicator
  Navigation: typeof FormStepsNavigation
  CompletedContent: typeof FormStepsCompletedContent
}

/**
 * Form.Steps — shadcn-скин (beta). Мультистеп compound-компонент форм-уровня (не `createField()`
 * -поле — та же категория, что `Form.Steps` у Chakra-версии). См. JSDoc `FormStepsRoot` для
 * известных упрощений beta.
 *
 * @example
 * ```tsx
 * <FormSteps>
 *   <FormSteps.Indicator />
 *   <FormSteps.Step title="Личное"><FieldString name="firstName" label="Имя" /></FormSteps.Step>
 *   <FormSteps.Step title="Контакты"><FieldString name="email" label="Email" /></FormSteps.Step>
 *   <FormSteps.CompletedContent>Готово!</FormSteps.CompletedContent>
 *   <FormSteps.Navigation />
 * </FormSteps>
 * ```
 */
export const FormSteps: FormStepsCompound = Object.assign(FormStepsRoot, {
  Step: FormStepsStep,
  Indicator: FormStepsIndicator,
  Navigation: FormStepsNavigation,
  CompletedContent: FormStepsCompletedContent,
})
