'use client'

import { Editable, Field, IconButton } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import type { BaseFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Props for Editable field
 */
export interface EditableFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Placeholder when empty */
  placeholder?: string
  /** Use textarea for multiline editing (by default: false) */
  multiline?: boolean
  /** Activation mode (by default: click) */
  activationMode?: 'click' | 'dblclick' | 'focus' | 'none'
  /** Show control buttons (edit, cancel, save) (by default: false) */
  showControls?: boolean
  /** Automatically resize textarea (only for multiline=true) (by default: true) */
  autoResize?: boolean
  /** Custom edit icon */
  editIcon?: ReactNode
  /** Custom cancel icon */
  cancelIcon?: ReactNode
  /** Custom submit icon */
  submitIcon?: ReactNode
  /** Save on blur (by default: true) */
  submitOnBlur?: boolean
}

/**
 * Form.Field.Editable - Inline editable text
 *
 * Renders text that can be clicked for inline editing.
 * Supports single-line input and multiline textarea.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Editable
 *   name="title"
 *   label="Title"
 *   placeholder="Click to add title"
 * />
 * ```
 *
 * @example Multiline
 * ```tsx
 * <Form.Field.Editable
 *   name="description"
 *   multiline
 *   placeholder="Click to add description..."
 * />
 * ```
 *
 * @example With control buttons
 * ```tsx
 * <Form.Field.Editable
 *   name="name"
 *   showControls
 *   activationMode="dblclick"
 * />
 * ```
 */
export const FieldEditable = createField<EditableFieldProps, string>({
  displayName: 'FieldEditable',

  render: ({ field, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      multiline = false,
      activationMode = 'click',
      showControls = false,
      editIcon,
      cancelIcon,
      submitIcon,
      submitOnBlur = true,
    } = componentProps

    const currentValue = (field.state.value as string) || ''

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />

        <Editable.Root
          value={currentValue}
          onValueChange={(details) => field.handleChange(details.value)}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          placeholder={resolved.placeholder ?? 'Click to edit'}
          activationMode={activationMode}
          submitMode={submitOnBlur ? 'blur' : 'enter'}
        >
          <Editable.Preview
            minH={multiline ? '48px' : undefined}
            alignItems={multiline ? 'flex-start' : undefined}
            width="full"
          />

          {multiline ? <Editable.Textarea /> : <Editable.Input />}

          {showControls && (
            <Editable.Control>
              <Editable.EditTrigger asChild>
                <IconButton variant="ghost" size="xs">
                  {editIcon ?? '✏️'}
                </IconButton>
              </Editable.EditTrigger>
              <Editable.CancelTrigger asChild>
                <IconButton variant="outline" size="xs">
                  {cancelIcon ?? '✕'}
                </IconButton>
              </Editable.CancelTrigger>
              <Editable.SubmitTrigger asChild>
                <IconButton variant="outline" size="xs">
                  {submitIcon ?? '✓'}
                </IconButton>
              </Editable.SubmitTrigger>
            </Editable.Control>
          )}
        </Editable.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
