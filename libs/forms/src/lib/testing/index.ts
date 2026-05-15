/**
 * @letar/forms/testing — утилиты для тестирования форм
 *
 * Peer dependencies (не включены в основной бандл):
 * - @testing-library/react
 * - @testing-library/user-event
 * - @testing-library/jest-dom (рекомендуется)
 * - vitest или jest
 *
 * @example
 * ```tsx
 * import { renderForm, fillField, submitForm, expectFieldError } from '@letar/forms/testing'
 *
 * const { onSubmit } = renderForm(ContactForm)
 * await fillField('name', 'Иван')
 * await fillField('email', 'ivan@test.com')
 * await submitForm()
 * expect(onSubmit).toHaveBeenCalled()
 * ```
 */

// Типы
export type { FormComponent, RenderFormOptions, RenderFormResult } from './types'

// Рендер
export { renderForm } from './render-form'

// Взаимодействие
export { fillField } from './fill-field'
export { submitForm } from './submit-form'

// Ассерты
export { expectFieldError, expectFieldValue, expectNoFieldError } from './expect-helpers'

// Мультистеп
export { expectActiveStep, goToStep } from './step-helpers'

// Массивы
export { addItem, expectItemCount, removeItem } from './array-helpers'

// Утилиты
export { renderComparison, renderReadOnlyView } from './comparison-helpers'
export { TestWrapper } from './test-wrapper'
