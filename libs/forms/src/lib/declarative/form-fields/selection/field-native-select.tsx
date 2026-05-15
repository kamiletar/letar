'use client'

import { NativeSelect } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, NativeSelectOption } from '../../types'
import { createField, FieldWrapper } from '../base'

// Re-export for backward compatibility
export type { NativeSelectOption } from '../../types'

export interface NativeSelectFieldProps<T = string> extends BaseFieldProps {
  options: NativeSelectOption<T>[]
}

/**
 * Form.Field.NativeSelect - Native browser select dropdown
 *
 * Renders a Chakra NativeSelect with automatic form integration and error display.
 * Uses native browser select for best mobile UX (shows system picker on iOS/Android).
 *
 * @example
 * ```tsx
 * <Form.Field.NativeSelect
 *   name="type"
 *   label="Type"
 *   options={[
 *     { title: 'Option 1', value: 'opt1' },
 *     { title: 'Option 2', value: 'opt2' },
 *   ]}
 * />
 * ```
 */
export const FieldNativeSelect = createField<NativeSelectFieldProps, string>({
  displayName: 'FieldNativeSelect',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => (
    <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
      <NativeSelect.Root>
        <NativeSelect.Field
          value={(field.state.value as string) ?? ''}
          onChange={(e) => field.handleChange((e.target as HTMLSelectElement).value)}
          onBlur={field.handleBlur}
          data-field-name={fullPath}
        >
          {resolved.placeholder && (
            <option value="" disabled>
              {resolved.placeholder}
            </option>
          )}
          {componentProps.options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {typeof opt.title === 'string' ? opt.title : opt.value}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </FieldWrapper>
  ),
})
