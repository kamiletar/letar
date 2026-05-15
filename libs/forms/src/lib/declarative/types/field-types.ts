'use client'

import type { ReactNode } from 'react'
import type { FieldTooltipMeta } from './meta-types'

/**
 * Base props for all Field components
 */
export interface BaseFieldProps {
  /** Field name (optional for primitive arrays) */
  name?: string
  /** Field label (can be a string or ReactNode for complex labels with links) */
  label?: ReactNode
  /** Placeholder text */
  placeholder?: string
  /** Helper text below the field (can be a string or ReactNode) */
  helperText?: ReactNode
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Tooltip for hint next to label (overrides value from schema) */
  tooltip?: FieldTooltipMeta
  /** Async-функция валидации (серверная проверка уникальности и т.д.) */
  asyncValidate?: (value: unknown) => Promise<string | undefined>
  /** Задержка debounce для async-валидации (мс, по умолчанию 500) */
  asyncDebounce?: number
  /** Триггер async-валидации: 'onBlur' (по умолчанию) или 'onChange' */
  asyncTrigger?: 'onBlur' | 'onChange'
}

// ============================================================================
// Text fields
// ============================================================================

/**
 * Props for string field
 */
export interface StringFieldProps extends BaseFieldProps {
  /** Input type (text, email, password, etc.). Auto-detected from z.string().email()/url() */
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  /** Maximum length. Auto-detected from z.string().max() */
  maxLength?: number
  /** Minimum length. Auto-detected from z.string().min() */
  minLength?: number
  /** HTML pattern for validation. Auto-detected from z.string().regex() */
  pattern?: string
  /** HTML autocomplete attribute */
  autoComplete?: string
  /** HTML inputMode attribute for mobile keyboard. Auto-detected from type. */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

/**
 * Props for textarea field
 */
export interface TextareaFieldProps extends BaseFieldProps {
  /** Number of visible rows */
  rows?: number
  /** Enable auto-resize */
  autoresize?: boolean
  /** Resize behavior */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  /** Maximum length */
  maxLength?: number
}

/**
 * Props for password field
 */
export interface PasswordFieldProps extends BaseFieldProps {
  /** Maximum length */
  maxLength?: number
  /** Default visibility */
  defaultVisible?: boolean
  /** HTML autocomplete attribute */
  autoComplete?: string
}

/**
 * Password complexity requirement
 */
export type PasswordRequirement = 'minLength:8' | 'uppercase' | 'lowercase' | 'number' | 'special'

/**
 * Props for password field with strength indicator
 */
export interface PasswordStrengthFieldProps extends BaseFieldProps {
  /** Password requirements */
  requirements?: PasswordRequirement[]
  /** Show requirements checklist */
  showRequirements?: boolean
  /** Default visibility */
  defaultVisible?: boolean
}

// ============================================================================
// Number fields
// ============================================================================

/**
 * Props for number field (basic)
 */
export interface NumberFieldProps extends BaseFieldProps {
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Change step */
  step?: number
}

/**
 * Intl.NumberFormat options for formatting
 */
export interface NumberInputFormatOptions {
  /** Formatting style */
  style?: 'decimal' | 'currency' | 'percent' | 'unit'
  /** Currency code (e.g., 'RUB', 'USD', 'EUR') */
  currency?: string
  /** Currency display style */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  /** Unit type (e.g., 'inch', 'kilogram') */
  unit?: string
  /** Unit display style */
  unitDisplay?: 'short' | 'long' | 'narrow'
  /** Minimum fraction digits */
  minimumFractionDigits?: number
  /** Maximum fraction digits */
  maximumFractionDigits?: number
}

/**
 * Props for NumberInput field with extended options
 */
export interface NumberInputFieldProps extends NumberFieldProps {
  /** Intl.NumberFormat options for display formatting */
  formatOptions?: NumberInputFormatOptions
  /** Allow mouse wheel changes */
  allowMouseWheel?: boolean
  /** Clamp value to min/max on blur */
  clampValueOnBlur?: boolean
  /** Change value on button hold */
  spinOnPress?: boolean
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Props for currency field
 */
export interface CurrencyFieldProps extends BaseFieldProps {
  /** Currency code (default: 'RUB') */
  currency?: string
  /** Currency display style (default: 'symbol') */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  /** Number of decimal places (default: 2) */
  decimalScale?: number
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Change step (default: 0.01) */
  step?: number
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Props for percentage field
 */
export interface PercentageFieldProps extends BaseFieldProps {
  /** Minimum value (default: 0) */
  min?: number
  /** Maximum value (default: 100) */
  max?: number
  /** Change step (default: 1) */
  step?: number
  /** Number of decimal places (default: 0) */
  decimalScale?: number
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

// ============================================================================
// Date and time fields
// ============================================================================

/**
 * Props for date field
 */
export interface DateFieldProps extends BaseFieldProps {
  /** Minimum date (format YYYY-MM-DD) */
  min?: string
  /** Maximum date (format YYYY-MM-DD) */
  max?: string
}

/**
 * Props for time field
 */
export interface TimeFieldProps extends BaseFieldProps {
  /** Minimum time (format HH:MM) */
  min?: string
  /** Maximum time (format HH:MM) */
  max?: string
  /** Step in seconds */
  step?: number
}

/**
 * Props for duration field
 */
export interface DurationFieldProps extends BaseFieldProps {
  /** Format: 'HH:MM' or 'minutes' (default: 'HH:MM') */
  format?: 'HH:MM' | 'minutes'
  /** Minimum duration in minutes */
  min?: number
  /** Maximum duration in minutes */
  max?: number
  /** Step in minutes (default: 15) */
  step?: number
}

/**
 * Props for date and time picker field
 */
export interface DateTimePickerFieldProps extends BaseFieldProps {
  /** Minimum date and time */
  minDateTime?: Date | string
  /** Maximum date and time */
  maxDateTime?: Date | string
  /** Time step in minutes (default: 15) */
  timeStep?: number
}

// ============================================================================
// Boolean fields
// ============================================================================

/**
 * Props for checkbox
 */
export interface CheckboxFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Color palette (default: brand) */
  colorPalette?: string
  /** Checkbox size (sm, md, lg) */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Props for switch
 */
export interface SwitchFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Color palette (default: brand) */
  colorPalette?: string
  /** Switch size (xs, sm, md, lg) */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

// ============================================================================
// Masked input / phone fields
// ============================================================================

/**
 * Props for masked input field
 */
export interface MaskedInputFieldProps extends BaseFieldProps {
  /** Mask pattern (e.g., '99 99 999999' for passport) */
  mask?: string | string[]
  /** Placeholder character for unfilled positions (default: '_') */
  placeholderChar?: string
  /** Show mask on focus */
  showMaskOnFocus?: boolean
  /** Show mask on hover */
  showMaskOnHover?: boolean
  /** Clear incomplete input on blur */
  clearIncomplete?: boolean
  /** Return value without mask (without mask characters) */
  autoUnmask?: boolean
}

/**
 * Country codes for phone field
 */
export type PhoneCountry = 'RU' | 'US' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES' | 'CN' | 'JP' | 'KR' | 'BY' | 'KZ' | 'UA'

/**
 * Props for phone field
 */
export interface PhoneFieldProps extends BaseFieldProps {
  /** Country code for phone format (default: 'RU') */
  country?: PhoneCountry
  /** Show country flag emoji */
  showFlag?: boolean
  /** Return value without mask (without mask characters) */
  autoUnmask?: boolean
}

// ============================================================================
// Address fields
// ============================================================================

import type { AddressProvider } from '../form-fields/specialized/providers'

/**
 * DaData suggestion structure.
 * @deprecated Use AddressSuggestion from providers instead.
 */
export interface DaDataSuggestion {
  value: string
  unrestricted_value: string
  data: {
    postal_code?: string
    country?: string
    country_iso_code?: string
    region?: string
    region_type?: string
    city?: string
    city_type?: string
    street?: string
    street_type?: string
    house?: string
    house_type?: string
    flat?: string
    flat_type?: string
    geo_lat?: string
    geo_lon?: string
  }
}

/**
 * Address value structure.
 */
export interface AddressValue {
  /** Full address string */
  value: string
  /** Parsed address components (provider-specific) */
  data?: Record<string, unknown>
}

/**
 * Props for address field.
 */
export interface AddressFieldProps extends BaseFieldProps {
  /** Address suggestion provider (recommended) */
  provider?: AddressProvider
  /** DaData API token (backward compatible — creates DaData provider internally) */
  token?: string
  /** Minimum characters before search (default: 3) */
  minChars?: number
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Restrict to specific locations (e.g., region, city) */
  locations?: Array<{ region?: string; city?: string }>
  /** Return string value only (default: false returns AddressValue) */
  valueOnly?: boolean
}

/**
 * Props for city selection field.
 */
export interface CityFieldProps extends BaseFieldProps {
  /** Address suggestion provider (recommended) */
  provider?: AddressProvider
  /** DaData API token (backward compatible — creates DaData provider internally) */
  token?: string
  /** Minimum characters before search (default: 2) */
  minChars?: number
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
}

// ============================================================================
// OTP/PIN fields
// ============================================================================

/**
 * Props for OTP field
 */
export interface OTPInputFieldProps extends BaseFieldProps {
  /** Number of input fields (default: 6) */
  length?: number
  /** Resend timeout in seconds (default: 60) */
  resendTimeout?: number
  /** Callback on "resend" click */
  onResend?: () => void | Promise<void>
  /** Auto-submit when complete */
  autoSubmit?: boolean
  /** Input type: numeric, alphanumeric, alphabetic */
  type?: 'numeric' | 'alphanumeric' | 'alphabetic'
  /** Mask input */
  mask?: boolean
}
