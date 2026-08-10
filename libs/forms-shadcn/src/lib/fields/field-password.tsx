'use client'

import { Eye, EyeOff } from 'lucide-react'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PasswordFieldProps } from './types'

interface PasswordFieldState {
  visible: boolean
  toggle: () => void
}

/** Form.Field.Password — shadcn-скин. `Input` из UIKit-контракта + кнопка показать/скрыть. */
export const FieldPassword = createField<PasswordFieldProps, string, PasswordFieldState>({
  displayName: 'FieldPassword',
  useFieldState: (componentProps): PasswordFieldState => {
    const [visible, setVisible] = useState(componentProps.defaultVisible ?? false)
    return { visible, toggle: () => setVisible((v) => !v) }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <div className="relative">
        <shadcnUIKit.Input
          type={fieldState.visible ? 'text' : 'password'}
          value={(field.state.value as string) ?? ''}
          onChange={(value) => field.handleChange(value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          maxLength={componentProps.maxLength}
          autoComplete={componentProps.autoComplete ?? resolved.autocomplete}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          data-field-name={fullPath}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Показать/скрыть пароль"
          disabled={resolved.disabled}
          onClick={fieldState.toggle}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center disabled:pointer-events-none disabled:opacity-50"
        >
          {fieldState.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldWrapper>
  ),
})
