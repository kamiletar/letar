'use client'

import { formatPhoneNumber, stripPhoneNumber } from '@letar/forms-core/phone'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PhoneCountry, PhoneFieldProps } from './types'

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
 * Form.Field.Phone — shadcn-скин.
 *
 * Форматирование маски — тот же чистый JS-форматтер, что у Chakra-версии
 * (`@letar/forms-core/phone`, WebKit-safe с v1.4.4). Флаг страны (`showFlag`) — соседний
 * `<span>`, не визуально «приклеенный» бордер, как `Group attached` у Chakra (beta-упрощение,
 * в UIKit-контракте нет примитива для составных инпутов).
 */
export const FieldPhone = createField<PhoneFieldProps, string>({
  displayName: 'FieldPhone',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { country = 'RU', showFlag = false, autoUnmask = false } = componentProps
    const mask = PHONE_MASKS[country]

    const rawValue = (field.state.value as string) ?? ''
    const displayValue = formatPhoneNumber(stripPhoneNumber(rawValue), mask)
    const resolvedPlaceholder = resolved.placeholder ?? mask.replace(/9/g, '_')

    const handleChange = (rawInput: string) => {
      const digits = stripPhoneNumber(rawInput)
      const formatted = formatPhoneNumber(digits, mask)
      field.handleChange(autoUnmask ? stripPhoneNumber(formatted) : formatted)
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          {showFlag && <span aria-hidden="true">{COUNTRY_FLAGS[country]}</span>}
          <div className="flex-1">
            <shadcnUIKit.Input
              value={displayValue}
              onChange={handleChange}
              onBlur={field.handleBlur}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={resolvedPlaceholder}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              data-field-name={fullPath}
            />
          </div>
        </div>
      </FieldWrapper>
    )
  },
})
