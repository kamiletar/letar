'use client'

import { Field, TagsInput } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { createField, FieldError, SelectionFieldLabel } from '../base'

/**
 * Props for Form.Field.Tags
 */
export interface TagsFieldProps extends BaseFieldProps {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Maximum number of tags */
  maxTags?: number
  /** Minimum length of each tag (by default: 1) */
  minTagLength?: number
  /** Custom delimiter (regex or string). Default: Enter */
  delimiter?: RegExp | string
  /** Add tags on blur (by default: false) */
  addOnBlur?: boolean
  /** Add tags on paste (by default: true) */
  addOnPaste?: boolean
  /** Allow editing tags on click (by default: false) */
  editable?: boolean
  /** Show clear button (by default: false) */
  clearable?: boolean
  /** Size (by default: md) */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Visual variant (by default: outline) */
  variant?: 'outline' | 'subtle' | 'flushed'
  /** Color palette for tags */
  colorPalette?: string
}

/**
 * Form.Field.Tags - Tags input field
 *
 * Renders input for adding/removing string tags.
 * Integrates with Chakra UI TagsInput component.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Tags name="tags" label="Tags" placeholder="Add tag..." />
 * ```
 *
 * @example With constraints
 * ```tsx
 * <Form.Field.Tags
 *   name="categories"
 *   label="Categories"
 *   maxTags={5}
 *   minTagLength={2}
 *   helperText="Up to 5 categories"
 * />
 * ```
 *
 * @example With custom delimiter
 * ```tsx
 * <Form.Field.Tags
 *   name="emails"
 *   label="Email addresses"
 *   delimiter={/[;,\s]/}
 *   addOnPaste
 * />
 * ```
 *
 * @example Editable tags
 * ```tsx
 * <Form.Field.Tags
 *   name="tags"
 *   label="Tags"
 *   editable
 *   clearable
 * />
 * ```
 */
export const FieldTags = createField<TagsFieldProps, string[]>({
  displayName: 'FieldTags',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      maxTags,
      minTagLength = 1,
      delimiter,
      addOnBlur = false,
      addOnPaste = true,
      editable = false,
      clearable = false,
      size = 'md',
      variant = 'outline',
      colorPalette,
    } = componentProps

    const value = (field.state.value as string[]) ?? []

    const handleValueChange = (details: { value: string[] }) => {
      field.handleChange(details.value)
    }

    const validateTag = (details: { inputValue: string }) => {
      return details.inputValue.length >= minTagLength
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <TagsInput.Root
          value={value}
          onValueChange={handleValueChange}
          max={maxTags}
          validate={validateTag}
          delimiter={delimiter}
          blurBehavior={addOnBlur ? 'add' : undefined}
          addOnPaste={addOnPaste}
          editable={editable}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          size={size}
          variant={variant}
          colorPalette={colorPalette}
          data-field-name={fullPath}
        >
          {resolved.label && (
            <TagsInput.Label>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </TagsInput.Label>
          )}

          <TagsInput.Control>
            <TagsInput.Items />
            <TagsInput.Input placeholder={resolved.placeholder} onBlur={field.handleBlur} />
            {clearable && <TagsInput.ClearTrigger />}
          </TagsInput.Control>

          <TagsInput.HiddenInput />
        </TagsInput.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
