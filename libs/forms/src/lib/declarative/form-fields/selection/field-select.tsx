'use client'

import {
  CREATE_OPTION_VALUE,
  type CreatedOption,
  type CreateOptionHandler,
  isCreateOptionValue,
  mergeCreatedOptions,
} from '@letar/forms-core/uikit'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { BaseFieldProps, BaseOption, FieldSize } from '../../types'
import { chakraUIKit, createField, getOptionLabel, type ResolvedFieldProps, SelectionFieldLabel } from '../base'
import { useSelectionString } from './selection-field-strings'

/** Normalized option (value is always string for the UIKit Select contract) */
interface NormalizedOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
  group?: string
}

/**
 * Props for Select field
 */
export interface SelectFieldProps extends BaseFieldProps {
  /** Options for selection (string or number values). If not specified, taken from schema meta */
  options?: BaseOption<string | number>[]
  /**
   * Get group key (optgroup) from an option — symmetric to `Form.Field.Combobox`'s `getGroup`.
   * Options without a group (or when the prop is omitted) render flat, ungrouped.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="category"
   *   options={categories}
   *   getGroup={(opt) => opt.parentLabel}
   * />
   * ```
   */
  getGroup?: (option: BaseOption<string | number>) => string | undefined
  /** Value type: 'string' (by default) or 'number' */
  valueType?: 'string' | 'number'
  /**
   * Create a dictionary record without leaving the form. Adds a «+ Добавить…» item at the end of
   * the list; picking it calls `onCreate('')`. The app opens its own creation dialog (and calls
   * its server action) and returns `{ label, value }` — the option is added to the list and
   * selected — or `null` if the user cancelled (the value stays as it was).
   *
   * The created option lives while the field is mounted; once the app's `options` contain the
   * same value (list revalidated), the app's option wins and there is no duplicate.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="categoryId"
   *   options={categories}
   *   onCreate={async () => {
   *     const created = await openCategoryDialog()
   *     return created ? { label: created.name, value: created.id } : null
   *   }}
   * />
   * ```
   */
  onCreate?: CreateOptionHandler
  /** Text of the create item after the «+ » sign (default: localized «Add…» / «Добавить…») */
  createLabel?: string
  /** Show clear button (auto-determined: true if optional, false if required) */
  clearable?: boolean
  /** Size */
  size?: FieldSize
  /** Visual variant */
  variant?: 'outline' | 'subtle'
}

/** State type for useFieldState */
interface SelectFieldState {
  normalizedOptions: NormalizedOption[]
  resolvedClearable: boolean
  /** Adds an option returned by `onCreate` to the local list */
  addCreatedOption: (option: CreatedOption) => void
  /** `true` while `onCreate` is pending (repeated picks are ignored) */
  creatingRef: { current: boolean }
}

/**
 * Form.Field.Select - Styled Chakra Select dropdown
 *
 * Styled select component with customizable appearance,
 * animations and advanced features (search, clear, custom rendering).
 *
 * Default choice for all dropdowns, including mobile — `Form.Field.NativeSelect` is deprecated.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Select
 *   name="framework"
 *   label="Framework"
 *   options={[
 *     { label: 'React', value: 'react' },
 *     { label: 'Vue', value: 'vue' },
 *     { label: 'Angular', value: 'angular', disabled: true },
 *   ]}
 *   clearable
 * />
 * ```
 *
 * Uses the `UIKit` contract (`@letar/forms-core/uikit`) instead of importing Chakra directly —
 * Фаза 7.1, Этап 4 proof that the seam covers a selection field with an options list and
 * a portal-rendered dropdown, the most structurally different of the three proof fields.
 */
export const FieldSelect = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (
    componentProps: Omit<SelectFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
  ): SelectFieldState => {
    // Options created via `onCreate` — kept locally while the field is mounted
    const [createdOptions, setCreatedOptions] = useState<CreatedOption[]>([])
    const addCreatedOption = useCallback((option: CreatedOption) => {
      setCreatedOptions((prev) => [...prev, option])
    }, [])
    const creatingRef = useRef(false)
    const hasOnCreate = !!componentProps.onCreate
    const defaultCreateVerb = useSelectionString('formSelection.createOption')
    const createLabel = componentProps.createLabel ?? `${defaultCreateVerb}…`

    // Normalize options — value always string for the UIKit contract
    const normalizedOptions: NormalizedOption[] = useMemo(() => {
      // Options: props take priority, fallback to schema meta
      const sourceOptions = componentProps.options ?? resolved.options ?? []
      const getGroup = componentProps.getGroup
      // Created option loses to the app's own option with the same value (no duplicate after revalidation)
      const merged = mergeCreatedOptions<BaseOption<string | number>>(sourceOptions, createdOptions)
      const normalized: NormalizedOption[] = merged.map((opt) => ({
        label: opt.label,
        value: String(opt.value),
        disabled: opt.disabled,
        group: getGroup?.(opt),
      }))
      // The «+ Добавить…» item is service-only: intercepted in onValueChange, never reaches the form
      return hasOnCreate ? [...normalized, { label: `+ ${createLabel}`, value: CREATE_OPTION_VALUE }] : normalized
    }, [componentProps.options, componentProps.getGroup, resolved.options, createdOptions, hasOnCreate, createLabel])

    // Auto-determine clearable: show clear button if field is optional
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    return { normalizedOptions, resolvedClearable, addCreatedOption, creatingRef }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Convert current value to string for the UIKit contract
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    return (
      <chakraUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <chakraUIKit.Select
          value={stringValue}
          onValueChange={(newStringValue) => {
            const applyValue = (raw: string | undefined) => {
              // Convert back to needed type
              if (componentProps.valueType === 'number') {
                field.handleChange(raw ? Number(raw) : 0)
              } else {
                field.handleChange(raw ?? '')
              }
            }

            if (isCreateOptionValue(newStringValue)) {
              // Service item: value is not applied. Errors of `onCreate` are the app's business —
              // they surface as unhandled rejections (GlitchTip), not swallowed here
              if (componentProps.onCreate && !fieldState.creatingRef.current) {
                fieldState.creatingRef.current = true
                void componentProps.onCreate('').then((created) => {
                  if (created) {
                    fieldState.addCreatedOption(created)
                    applyValue(String(created.value))
                  }
                }).finally(() => {
                  fieldState.creatingRef.current = false
                })
              }
              return
            }
            applyValue(newStringValue)
          }}
          onBlur={field.handleBlur}
          options={fieldState.normalizedOptions.map((opt) => ({
            value: opt.value,
            label: getOptionLabel(opt),
            disabled: opt.disabled,
            group: opt.group,
          }))}
          label={resolved.label
            ? <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            : undefined}
          placeholder={resolved.placeholder}
          disabled={resolved.disabled}
          clearable={fieldState.resolvedClearable}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          data-field-name={fullPath}
        />
        <chakraUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </chakraUIKit.FieldRoot>
    )
  },
})
