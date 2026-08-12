'use client'

import { formatPhoneNumber, PHONE_MASKS, stripPhoneNumber } from '@letar/forms-core/phone'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { PhoneCountry, PhoneFieldProps } from './types'

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
