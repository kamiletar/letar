'use client'

import { IconButton, Input, InputGroup } from '@chakra-ui/react'
import { type ReactElement, useState } from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'
import type { PasswordFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * State for toggling password visibility
 */
interface PasswordFieldState {
  /** Whether password is visible */
  visible: boolean
  /** Toggle visibility */
  toggle: () => void
}

/**
 * Form.Field.Password - Password input field with visibility toggle
 *
 * Renders a password input field with a show/hide button.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Password name="password" label="Password" />
 * ```
 *
 * @example With visible password by default
 * ```tsx
 * <Form.Field.Password name="password" label="Password" defaultVisible />
 * ```
 */
export const FieldPassword = createField<PasswordFieldProps, string, PasswordFieldState>({
  displayName: 'FieldPassword',

  useFieldState: (props) => {
    const [visible, setVisible] = useState(props.defaultVisible ?? false)
    return {
      visible,
      toggle: () => setVisible((v) => !v),
    }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <InputGroup
        endElement={
          <IconButton
            tabIndex={-1}
            me="-2"
            aspectRatio="square"
            size="sm"
            variant="ghost"
            height="calc(100% - {spacing.2})"
            aria-label="Toggle password visibility"
            disabled={resolved.disabled}
            onPointerDown={(e) => {
              if (resolved.disabled) {
                return
              }
              if (e.button !== 0) {
                return
              }
              e.preventDefault()
              fieldState.toggle()
            }}
          >
            {fieldState.visible ? <LuEyeOff /> : <LuEye />}
          </IconButton>
        }
      >
        <Input
          type={fieldState.visible ? 'text' : 'password'}
          value={(field.state.value as string) ?? ''}
          onChange={(e) => field.handleChange((e.target as HTMLInputElement).value)}
          onBlur={field.handleBlur}
          placeholder={resolved.placeholder}
          maxLength={componentProps.maxLength}
          autoComplete={componentProps.autoComplete ?? resolved.autocomplete}
          data-field-name={fullPath}
        />
      </InputGroup>
    </FieldWrapper>
  ),
})
