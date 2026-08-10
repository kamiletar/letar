'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import type { BaseFieldProps } from '@letar/forms-react'
import type { ReactNode } from 'react'

export type { BaseFieldProps }

/** Props for Form.Field.String (shadcn-скин). */
export interface StringFieldProps extends BaseFieldProps {
  /** Input type. Auto-detected from z.string().email()/url() */
  type?: 'text' | 'email' | 'password' | 'url' | 'tel'
  maxLength?: number
  minLength?: number
  pattern?: string
  autoComplete?: string
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

/** Props for Form.Field.Checkbox (shadcn-скин). */
export type CheckboxFieldProps = Omit<BaseFieldProps, 'placeholder'>

export interface SelectOption {
  label: ReactNode
  value: string | number
  disabled?: boolean
}

/** Props for Form.Field.Select (shadcn-скин). */
export interface SelectFieldProps extends BaseFieldProps {
  /** Options for selection. If not specified, taken from schema meta */
  options?: SelectOption[]
  /** Value type: 'string' (by default) or 'number' */
  valueType?: 'string' | 'number'
  /** Show clear button (auto-determined: true if optional, false if required) */
  clearable?: boolean
}

/** Props for Form.Field.Textarea (shadcn-скин). */
export interface TextareaFieldProps extends BaseFieldProps {
  rows?: number
  maxLength?: number
  autoComplete?: string
}

/** Props for Form.Field.Number (shadcn-скин). */
export interface NumberFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  min?: number
  max?: number
  step?: number
}

export interface RadioOption {
  label: ReactNode
  value: string
  disabled?: boolean
}

/** Props for Form.Field.RadioGroup (shadcn-скин). */
export interface RadioGroupFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: RadioOption[]
}

/** Props for Form.Field.SegmentGroup (shadcn-скин). */
export interface SegmentGroupFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: RadioOption[]
}

/** Props for Form.Field.Date (shadcn-скин). Beta: нативный `<input type="date">`. */
export type DateFieldProps = BaseFieldProps

/** Props for Form.Field.NativeSelect (shadcn-скин). Label — только `string` (нативный `<option>`). */
export interface NativeSelectFieldProps extends BaseFieldProps {
  options: { label: string; value: string; disabled?: boolean }[]
}

/** Props for Form.Field.Switch (shadcn-скин). */
export type SwitchFieldProps = Omit<BaseFieldProps, 'placeholder'>

/** Props for Form.Field.Slider (shadcn-скин). */
export interface SliderFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  min?: number
  max?: number
  step?: number
  /** Показать текущее значение рядом с меткой */
  showValue?: boolean
}

/** Props for Form.Field.Password (shadcn-скин). */
export interface PasswordFieldProps extends BaseFieldProps {
  maxLength?: number
  autoComplete?: string
  /** Показывать пароль открытым текстом по умолчанию */
  defaultVisible?: boolean
}

/**
 * Props for Form.Field.Combobox (shadcn-скин).
 *
 * Beta-упрощение: только статичные `options`, без `useQuery` (асинхронный поиск) и без
 * группировки — оба требуют больше инфраструктуры, чем нужно для доказательства контракта.
 * Фильтрация — по вхождению подстроки в `label` (регистронезависимо), на стороне поля.
 */
export interface ComboboxFieldProps extends BaseFieldProps {
  options: SelectOption[]
  /** Минимум символов для показа списка (по умолчанию 0 — показывать сразу) */
  minChars?: number
}

/**
 * Props for Form.Field.PinInput (shadcn-скин).
 *
 * Beta-упрощение: без вставки кода из буфера обмена одним действием (paste-across-boxes) —
 * только посимвольный ввод с автопереходом между ячейками.
 */
export interface PinInputFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Число ячеек (по умолчанию 4) */
  length?: number
  /** Маскировать ввод как пароль */
  mask?: boolean
  /** Вызывается, когда заполнены все ячейки */
  onComplete?: (value: string) => void
}

/** Props for Form.Field.Rating (shadcn-скин). */
export interface RatingFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Число звёзд (по умолчанию 5) */
  count?: number
}

/**
 * Props for Form.Field.Tags (shadcn-скин).
 *
 * Beta-упрощение: только Enter добавляет тег (нет `delimiter`/`addOnPaste` — вставка со
 * множественным разделителем не разбирается автоматически).
 */
export interface TagsFieldProps extends BaseFieldProps {
  /** Максимум тегов */
  maxTags?: number
  /** Минимальная длина тега (по умолчанию 1) */
  minTagLength?: number
}

/** Значение поля адреса. */
export interface AddressValue {
  /** Полная строка адреса */
  value: string
  /** Разобранные компоненты адреса (специфично для провайдера) */
  data?: Record<string, unknown>
}

/**
 * Props for Form.Field.Address (shadcn-скин).
 *
 * Beta-упрощение относительно Chakra-версии: нет клавиатурной навигации стрелками по списку
 * подсказок (`shadcnUIKit.Combobox` — общий примитив с `FieldCombobox`, только клик/Enter/Escape
 * самого Popover) и нет визуального спиннера внутри инпута.
 */
export interface AddressFieldProps extends BaseFieldProps {
  /** Провайдер подсказок адреса (рекомендуется) */
  provider?: AddressProvider
  /** DaData API token (обратная совместимость — создаёт DaData-провайдер внутри) */
  token?: string
  /** Минимум символов перед поиском (по умолчанию 3) */
  minChars?: number
  /** Задержка debounce в мс (по умолчанию 300) */
  debounceMs?: number
  /** Ограничить конкретными локациями (регион, город) */
  locations?: Array<{ region?: string; city?: string }>
  /** Возвращать только строку (по умолчанию false — возвращает AddressValue) */
  valueOnly?: boolean
}
