'use client'

import { Field, Group, Input, Text } from '@chakra-ui/react'
import { type ReactElement, useCallback } from 'react'
import { withMask } from 'use-mask-input'
import type { PhoneCountry, PhoneFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Phone masks by country
 */
const PHONE_MASKS: Record<PhoneCountry, string | string[]> = {
  RU: '+7 (999) 999-99-99',
  US: '+1 (999) 999-9999',
  UK: '+44 9999 999999',
  DE: '+49 999 99999999',
  FR: '+33 9 99 99 99 99',
  IT: '+39 999 999 9999',
  ES: '+34 999 99 99 99',
  CN: '+86 999 9999 9999',
  JP: '+81 99 9999 9999',
  KR: '+82 99 9999 9999',
  BY: '+375 (99) 999-99-99',
  KZ: '+7 (999) 999-99-99',
  UA: '+380 (99) 999-99-99',
}

/**
 * Country flags
 */
const COUNTRY_FLAGS: Record<PhoneCountry, string> = {
  RU: '🇷🇺',
  US: '🇺🇸',
  UK: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  CN: '🇨🇳',
  JP: '🇯🇵',
  KR: '🇰🇷',
  BY: '🇧🇾',
  KZ: '🇰🇿',
  UA: '🇺🇦',
}

/**
 * State for phone field
 */
interface PhoneFieldState {
  /** Ref callback for applying mask */
  maskRef: (element: HTMLInputElement | null) => void
}

/**
 * Form.Field.Phone - Phone input with country mask
 *
 * Renders phone field with automatic mask based on country.
 *
 * @example Russian phone (by default)
 * ```tsx
 * <Form.Field.Phone name="phone" label="Phone" />
 * ```
 *
 * @example US phone with flag
 * ```tsx
 * <Form.Field.Phone name="phone" country="US" showFlag />
 * ```
 *
 * @example Return value without mask
 * ```tsx
 * <Form.Field.Phone name="phone" autoUnmask />
 * ```
 */
export const FieldPhone = createField<PhoneFieldProps, string, PhoneFieldState>({
  displayName: 'FieldPhone',

  useFieldState: (props) => {
    const { country = 'RU', autoUnmask = false } = props
    const mask = PHONE_MASKS[country]

    // Create ref callback for applying mask
    const maskRef = useCallback(
      (element: HTMLInputElement | null) => {
        if (element && mask) {
          const maskCallback = withMask(mask, {
            showMaskOnFocus: true,
            clearIncomplete: true,
            autoUnmask,
          })
          maskCallback(element)
        }
      },
      [mask, autoUnmask]
    )

    return { maskRef }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { country = 'RU', showFlag = false } = componentProps
    const flag = COUNTRY_FLAGS[country]
    const mask = PHONE_MASKS[country]

    const value = (field.state.value as string) ?? ''
    const resolvedPlaceholder = resolved.placeholder ?? mask?.toString().replace(/9/g, '_')

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
        <Group attached>
          {showFlag && (
            <Text px={3} display="flex" alignItems="center" bg="bg.muted" borderWidth="1px" borderRightWidth="0">
              {flag}
            </Text>
          )}
          <Input
            ref={fieldState.maskRef}
            value={value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            placeholder={resolvedPlaceholder}
            data-field-name={fullPath}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </Group>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
