'use client'

import type { ReactNode } from 'react'

/**
 * Base option for selection components
 *
 * Used in: Select, RadioGroup, SegmentedGroup, NativeSelect
 *
 * @template T - Value type (default string)
 */
export interface BaseOption<T = string, TData = unknown> {
  /** Display text of the option */
  label: ReactNode
  /**
   * String form of the option — for search, typeahead and the trigger caption. Needed when
   * `label` is not a string (otherwise the option falls back to its value).
   */
  textValue?: string
  /** Option value */
  value: T
  /** Option is disabled */
  disabled?: boolean
  /** App data: the field never reads it, only hands it to `renderOption`/`renderValue` */
  data?: TData
}

/** State of an option for `renderOption` (highlight is a CSS concern — `[data-highlighted]`) */
export interface OptionRenderState {
  selected: boolean
  disabled: boolean
}

/** Flag «the option cannot be edited» for fields with `onUpdate` (default: editable) */
export interface EditableOptionFlag {
  /** `false` hides the pencil for this option (system records) */
  editable?: boolean
}

/** Option of `Form.Field.Select` — `data` type is inferred from `options` */
export type SelectFieldOption<TData = unknown> = BaseOption<string | number, TData> & EditableOptionFlag

/** Option of `Form.Field.Combobox` with static `options` */
export type ComboboxFieldOption<T = string, TData = unknown> = GroupableOption<T, TData>

/**
 * Option with grouping support
 *
 * Used in: Listbox, Combobox
 *
 * @template T - Value type (default string)
 */
export interface GroupableOption<T = string, TData = unknown> extends BaseOption<T, TData> {
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
