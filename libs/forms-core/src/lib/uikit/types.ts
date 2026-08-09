/**
 * UIKit contract — the seam between framework-free `forms-core` and a concrete UI adapter
 * (Chakra, shadcn, ...). `forms-core` defines the shape a field needs; the adapter supplies
 * the implementation. This file is types only — no runtime code, no framework import.
 *
 * `TNode` stands in for whatever a concrete adapter renders (`ReactNode` for React, a Vue
 * VNode for a Vue adapter, etc.) — kept generic so this file itself never imports React.
 *
 * Scope: ~20 primitives identified in the 2026-07-05 coupling audit (`libs/forms/PLAN.md`,
 * Фаза 7). Only the seven marked "core" below have a concrete Chakra implementation
 * (`libs/forms` uikit-chakra.tsx) and are consumed by a field today (`Field.String`,
 * `Field.Checkbox`, `Field.Select` — Этап 4 proof). The rest are typed but unimplemented:
 * fixing their shape now avoids inventing it ad-hoc when the next field migrates.
 */

// === Core primitives (implemented + consumed by the Этап 4 proof) ===

export interface UIKitFieldRootProps<TNode = unknown> {
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  children?: TNode
}

export interface UIKitFieldLabelProps<TNode = unknown> {
  label?: TNode
  required?: boolean
}

export interface UIKitFieldErrorProps<TNode = unknown> {
  hasError: boolean
  errorMessage?: string
  helperText?: TNode
  isValidating?: boolean
}

export interface UIKitInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: string
  inputMode?: string
  placeholder?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  autoComplete?: string
  disabled?: boolean
  readOnly?: boolean
  'data-field-name'?: string
}

export interface UIKitCheckboxProps<TNode = unknown> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onBlur?: () => void
  disabled?: boolean
  readOnly?: boolean
  label?: TNode
  colorPalette?: string
  size?: string
  'data-field-name'?: string
}

export interface UIKitSelectOption<TNode = unknown> {
  value: string
  label: TNode
  disabled?: boolean
}

export interface UIKitSelectProps<TNode = unknown> {
  value?: string
  onValueChange: (value: string | undefined) => void
  onBlur?: () => void
  options: UIKitSelectOption<TNode>[]
  label?: TNode
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  size?: string
  variant?: string
  'data-field-name'?: string
}

/** Реализованные примитивы — минимум, доказывающий, что граница не протекает (Этап 4). */
export interface UIKitCorePrimitives<TNode = unknown> {
  FieldRoot: (props: UIKitFieldRootProps<TNode>) => TNode
  FieldLabel: (props: UIKitFieldLabelProps<TNode>) => TNode
  FieldError: (props: UIKitFieldErrorProps<TNode>) => TNode
  Input: (props: UIKitInputProps) => TNode
  Checkbox: (props: UIKitCheckboxProps<TNode>) => TNode
  Select: (props: UIKitSelectProps<TNode>) => TNode
}

// === Extended primitives (typed contract only — no adapter implementation yet) ===
//
// Shapes below follow the same style as the core primitives above so a future migration can
// implement them without redesigning the interface. Left out of the Этап 4 proof deliberately —
// migrating them is separate work per field, not part of proving the seam itself.

export interface UIKitNumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  onBlur?: () => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  readOnly?: boolean
  'data-field-name'?: string
}

export interface UIKitNativeSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface UIKitNativeSelectProps {
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: UIKitNativeSelectOption[]
  placeholder?: string
  disabled?: boolean
  'data-field-name'?: string
}

export interface UIKitComboboxProps<TNode = unknown> {
  value?: string
  inputValue: string
  onInputChange: (value: string) => void
  onValueChange: (value: string | undefined) => void
  options: UIKitSelectOption<TNode>[]
  loading?: boolean
  placeholder?: string
  disabled?: boolean
  'data-field-name'?: string
}

export interface UIKitRadioOption<TNode = unknown> {
  value: string
  label: TNode
  disabled?: boolean
}

export interface UIKitRadioGroupProps<TNode = unknown> {
  value?: string
  onValueChange: (value: string) => void
  options: UIKitRadioOption<TNode>[]
  disabled?: boolean
  'data-field-name'?: string
}

export interface UIKitSegmentGroupProps<TNode = unknown> {
  value?: string
  onValueChange: (value: string) => void
  options: UIKitRadioOption<TNode>[]
  disabled?: boolean
  'data-field-name'?: string
}

export interface UIKitPinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length: number
  mask?: boolean
  disabled?: boolean
  'data-field-name'?: string
}

export interface UIKitLayoutProps<TNode = unknown> {
  children?: TNode
  gap?: string | number
}

export interface UIKitTextProps<TNode = unknown> {
  children?: TNode
  color?: string
}

export interface UIKitButtonProps<TNode = unknown> {
  children?: TNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}

export interface UIKitIconButtonProps<TNode = unknown> {
  children?: TNode
  onClick?: () => void
  'aria-label': string
  disabled?: boolean
}

export interface UIKitExtendedPrimitives<TNode = unknown> {
  NumberInput: (props: UIKitNumberInputProps) => TNode
  NativeSelect: (props: UIKitNativeSelectProps) => TNode
  Combobox: (props: UIKitComboboxProps<TNode>) => TNode
  RadioGroup: (props: UIKitRadioGroupProps<TNode>) => TNode
  SegmentGroup: (props: UIKitSegmentGroupProps<TNode>) => TNode
  PinInput: (props: UIKitPinInputProps) => TNode
  Box: (props: UIKitLayoutProps<TNode>) => TNode
  HStack: (props: UIKitLayoutProps<TNode>) => TNode
  VStack: (props: UIKitLayoutProps<TNode>) => TNode
  Text: (props: UIKitTextProps<TNode>) => TNode
  Button: (props: UIKitButtonProps<TNode>) => TNode
  IconButton: (props: UIKitIconButtonProps<TNode>) => TNode
}

/**
 * Полный контракт UIKit. Core-примитивы обязательны (реализованы и используются),
 * extended — опциональны до тех пор, пока соответствующее поле не мигрирует на контракт.
 */
export type UIKit<TNode = unknown> = UIKitCorePrimitives<TNode> & Partial<UIKitExtendedPrimitives<TNode>>
