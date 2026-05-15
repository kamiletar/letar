'use client'

import type { ReactNode } from 'react'

/**
 * Base option for selection components
 *
 * Used in: Select, RadioGroup, SegmentedGroup, NativeSelect
 *
 * @template T - Value type (default string)
 */
export interface BaseOption<T = string> {
  /** Display text of the option */
  label: ReactNode
  /** Option value */
  value: T
  /** Option is disabled */
  disabled?: boolean
}

/**
 * Option with grouping support
 *
 * Used in: Listbox, Combobox
 *
 * @template T - Value type (default string)
 */
export interface GroupableOption<T = string> extends BaseOption<T> {
  /** Group key for option grouping */
  group?: string
}

/**
 * Extended option with description and icon
 *
 * Used in: RadioCard, CheckboxCard
 *
 * @template T - Value type (default string)
 */
export interface RichOption<T = string> extends BaseOption<T> {
  /** Option description */
  description?: ReactNode
  /** Option icon */
  icon?: ReactNode
}

// =============================================================================
// Type aliases for compatibility (deprecated, use base types)
// =============================================================================

/**
 * @deprecated Use BaseOption
 */
export type SelectOption<T = string> = BaseOption<T>

/**
 * @deprecated Use BaseOption
 */
export type RadioOption<T = string> = BaseOption<T>

/**
 * @deprecated Use BaseOption
 */
export type SegmentedGroupOption<T = string> = BaseOption<T>

/**
 * @deprecated Use GroupableOption
 */
export type ListboxOption<T = string> = GroupableOption<T>

/**
 * @deprecated Use GroupableOption
 */
export type ComboboxOption<T = string> = GroupableOption<T>

/**
 * @deprecated Use RichOption
 */
export type RadioCardOption<T = string> = RichOption<T>

/**
 * @deprecated Use RichOption
 */
export type CheckboxCardOption<T = string> = RichOption<T>

/**
 * Option for NativeSelect (uses title instead of label)
 *
 * @template T - Value type (default string)
 */
export interface NativeSelectOption<T = string> {
  /** Display text of the option */
  title: ReactNode
  /** Option value */
  value: T
}
