'use client'

import { useFieldPlaceholderString } from '@letar/forms-react'
import { cn } from '@letar/tailwind-utils'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { SHADCN_NO_PROVIDER_LOCALE } from './selection-strings'
import type { EditableFieldProps } from './types'

const inputClass = cn(
  'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
)

/**
 * Form.Field.Editable — shadcn-скин.
 *
 * Клик по превью переключает в режим редактирования (нативный `<input>`/`<textarea>`). Beta:
 * нет отдельного `Cancel`/`Submit`/`Edit` набора кнопок (`showControls` из Chakra-версии) —
 * `submitOnBlur` (по умолчанию `true`) и `Enter`/`Escape` покрывают тот же сценарий без лишнего
 * UI; `dblclick`/`focus`-режимы активации не портированы, только `click` (по умолчанию у обеих
 * версий) и `none` (управление снаружи через `activationMode="none"` — превью всегда активно).
 */
export const FieldEditable = createField<
  EditableFieldProps,
  string,
  { isEditing: boolean; setIsEditing: (v: boolean) => void; placeholder: string }
>({
  displayName: 'FieldEditable',

  useFieldState: (props) => {
    const [isEditing, setIsEditing] = useState(props.activationMode === 'none')
    const placeholder = useFieldPlaceholderString('formFieldPlaceholder.editable', SHADCN_NO_PROVIDER_LOCALE)
    return { isEditing, setIsEditing, placeholder }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { multiline = false, activationMode = 'click', submitOnBlur = true } = componentProps
    const { isEditing, setIsEditing, placeholder } = fieldState
    const currentValue = (field.state.value as string) ?? ''

    const commit = () => {
      if (activationMode !== 'none') { setIsEditing(false) }
      field.handleBlur()
    }

    if (!isEditing) {
      return (
        <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={resolved.disabled || resolved.readOnly}
            data-field-name={fullPath}
            className={cn(
              'w-full rounded-md border border-transparent px-3 py-1 text-left text-sm outline-none',
              'hover:border-input',
              !currentValue && 'text-muted-foreground',
            )}
          >
            {currentValue || resolved.placeholder || placeholder}
          </button>
        </FieldWrapper>
      )
    }

    const sharedProps = {
      value: currentValue,
      autoFocus: activationMode !== 'none',
      disabled: resolved.disabled,
      readOnly: resolved.readOnly,
      placeholder: resolved.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => field.handleChange(e.target.value),
      onBlur: () => {
        if (submitOnBlur) { commit() }
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { commit() }
        if (e.key === 'Escape') { setIsEditing(activationMode === 'none') }
      },
      'data-field-name': fullPath,
      className: inputClass,
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        {multiline ? <textarea {...sharedProps} rows={3} /> : <input {...sharedProps} type="text" />}
      </FieldWrapper>
    )
  },
})
