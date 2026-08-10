'use client'

import type { ReactElement } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { StringFieldProps } from './types'

/** Автоматический inputMode по типу поля (для мобильных клавиатур). */
function getInputModeFromType(type: string): StringFieldProps['inputMode'] {
  switch (type) {
    case 'email':
      return 'email'
    case 'tel':
      return 'tel'
    case 'url':
      return 'url'
    default:
      return 'text'
  }
}

/**
 * Form.Field.String — shadcn-скин.
 *
 * Первое из 3 полей Шага 5 (Фаза 7.3) — та же проверка архитектуры, что уже прошла Chakra:
 * поле собрано на `UIKit`-контракте из `forms-core` через `createFieldPrimitives`
 * (`@letar/forms-react`), без единой строчки, специфичной для сборки формы.
 */
export const FieldString = createField<StringFieldProps, string>({
  displayName: 'FieldString',
  render: ({ field, fullPath, resolved, hasError, errorMessage, isValidating, componentProps }): ReactElement => {
    const type = componentProps.type ?? 'text'
    const inputMode = componentProps.inputMode ?? getInputModeFromType(type)

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <shadcnUIKit.FieldLabel label={resolved.label} required={resolved.required} tooltip={resolved.tooltip} />
        <shadcnUIKit.Input
          type={type}
          inputMode={inputMode}
          value={(field.state.value as string) ?? ''}
          onChange={(value) => field.handleChange(value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          maxLength={componentProps.maxLength}
          minLength={componentProps.minLength}
          pattern={componentProps.pattern}
          autoComplete={componentProps.autoComplete}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          data-field-name={fullPath}
        />
        <shadcnUIKit.FieldError
          hasError={hasError}
          errorMessage={errorMessage}
          helperText={resolved.helperText}
          isValidating={isValidating}
        />
      </shadcnUIKit.FieldRoot>
    )
  },
})
