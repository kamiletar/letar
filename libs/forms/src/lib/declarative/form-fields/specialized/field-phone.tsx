'use client'

import { Field, Group, Input, Text } from '@chakra-ui/react'
import { formatPhoneNumber, stripPhoneNumber } from '@letar/forms-core/phone'
import type { ChangeEvent, ReactElement } from 'react'
import type { PhoneCountry, PhoneFieldProps } from '../../types'
import { createField, FieldError, FieldLabel } from '../base'

/**
 * Phone masks by country
 */
const PHONE_MASKS: Record<PhoneCountry, string> = {
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
 * Form.Field.Phone - Phone input with country mask
 *
 * Форматирование маски — чистый JS на каждый `onChange` (без сторонних
 * DOM-мутирующих mask-библиотек, см. `@letar/forms-core/phone`). Раньше использовался
 * `use-mask-input` (imask), который мутирует DOM в обход React и конфликтует
 * с controlled `value` при быстром посимвольном вводе в WebKit.
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
export const FieldPhone = createField<PhoneFieldProps, string>({
  displayName: 'FieldPhone',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { country = 'RU', showFlag = false, autoUnmask = false } = componentProps
    const flag = COUNTRY_FLAGS[country]
    const mask = PHONE_MASKS[country]

    const rawValue = (field.state.value as string) ?? ''
    const displayValue = formatPhoneNumber(stripPhoneNumber(rawValue), mask)
    const resolvedPlaceholder = resolved.placeholder ?? mask.replace(/9/g, '_')

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const digits = stripPhoneNumber(e.target.value)
      const formatted = formatPhoneNumber(digits, mask)
      field.handleChange(autoUnmask ? stripPhoneNumber(formatted) : formatted)
    }

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
            value={displayValue}
            onChange={handleChange}
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
