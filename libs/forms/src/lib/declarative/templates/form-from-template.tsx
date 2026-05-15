'use client'

import type { ReactElement } from 'react'
import { Form } from '../index'
import type { FormFromTemplateProps } from './template-types'

/**
 * Form.FromTemplate — автоматическая генерация формы из шаблона.
 *
 * Использует Form.FromSchema внутри для автоматического рендеринга полей.
 *
 * @example
 * ```tsx
 * import { templates } from '@letar/forms/templates'
 *
 * <Form.FromTemplate
 *   template={templates.contactForm}
 *   onSubmit={handleSubmit}
 *   submitLabel="Отправить"
 * />
 * ```
 *
 * @example С override
 * ```tsx
 * <Form.FromTemplate
 *   template={templates.registerForm}
 *   override={{ exclude: ['confirmPassword'] }}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export function FormFromTemplate<T extends Record<string, unknown>>({
  template,
  onSubmit,
  initialValue,
  override,
  submitLabel = 'Отправить',
  debug = false,
}: FormFromTemplateProps<T>): ReactElement {
  const mergedInitialValue = initialValue ? { ...template.defaultValues, ...initialValue } : template.defaultValues

  return (
    <Form.FromSchema
      schema={template.schema}
      initialValue={mergedInitialValue}
      onSubmit={onSubmit}
      exclude={override?.exclude}
      debug={debug}
      submitLabel={submitLabel}
    />
  )
}
