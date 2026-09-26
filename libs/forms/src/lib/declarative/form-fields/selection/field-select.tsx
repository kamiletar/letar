'use client'

import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreateOptionHandler,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type UpdateOptionHandler,
} from '@letar/forms-core/uikit'
import {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useNodeLabelWarning,
  useSelectionActionsState,
} from '@letar/forms-react'
import type { ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'
import type { BaseFieldProps, FieldSize, OptionRenderState, SelectFieldOption } from '../../types'
import { chakraUIKit, createField, type ResolvedFieldProps, SelectionFieldLabel } from '../base'
import { useSelectionString } from './selection-field-strings'
import { SelectCreateButton, SelectEditButton } from './selection-slots'

/** Normalized option (value is always string for the UIKit Select contract) */
interface NormalizedOption {
  label: React.ReactNode
  textValue?: string
  value: string
  disabled?: boolean
  editable?: boolean
  group?: string
  data?: unknown
}

/**
 * Props for Select field
 */
export interface SelectFieldProps<TData = unknown> extends BaseFieldProps {
  /** Options for selection (string or number values). If not specified, taken from schema meta */
  options?: SelectFieldOption<TData>[]
  /**
   * Own content of an option in the dropdown. The skin still draws its own item frame
   * (highlight, indicator), you only supply what is inside. `option.data` is typed from `options`.
   * Not called for the service «+ Add…» item.
   *
   * @example
   * ```tsx
   * <Form.Field.Select
   *   name="cityId"
   *   options={cities.map((c) => ({ value: c.id, label: c.name, data: c }))}
   *   renderOption={(o) => <span>{o.label} <small>{o.data?.region}</small></span>}
   * />
   * ```
   */
  renderOption?: (option: SelectFieldOption<TData>, state: OptionRenderState) => React.ReactNode
  /**
   * Own caption of the selected value in the trigger. It sits inside a `<button>` — phrasing
   * content only. Empty result (`null`/`''`) falls back to the option text; `placeholder` is
   * shown while nothing is selected.
   */
  renderValue?: (option: SelectFieldOption<TData>) => React.ReactNode
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
  getGroup?: (option: SelectFieldOption<TData>) => string | undefined
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
  onCreate?: CreateOptionHandler<TData>
  /** Text of the create item after the «+ » sign (default: localized «Add…» / «Добавить…») */
  createLabel?: string
  /**
   * Show the service «+ Add…» item at the end of the list (default `true` when `onCreate` is set).
   * `false` — no item: put `<Form.Field.Select.CreateButton />` into `listFooter` or your own `renderOption`.
   */
  createItem?: boolean
  /**
   * Edit a dictionary record without leaving the form: a pencil appears at every item and at the
   * selected value. The app opens its own dialog (its server action) and returns
   * `{ label, value, data? }` — the option is updated in place — or `null` if the user cancelled.
   * Same `value` = caption fix (the form is not dirty); another `value` = the record was replaced
   * (copy-on-write) and, if it was selected, the new one becomes selected.
   * Shortcut: F2 (Fn+F2 on laptops) on the highlighted item or the selected value.
   */
  onUpdate?: UpdateOptionHandler<SelectFieldOption<TData>, TData>
  /** Own footer of the list, after the items (e.g. `<Form.Field.Select.CreateButton />`) */
  listFooter?: ReactNode
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
  /** Actions (`onCreate`/`onUpdate`): pending, overlay of edits, created options, pipeline */
  actions: ReturnType<typeof useSelectionActionsState>
  /** Options in the app's own shape (with `data`) by string value — for the render functions */
  optionByValue: Map<string, SelectFieldOption>
  /** Localized strings of the slots */
  strings: { edit: string; hotkeyHint: string; create: string }
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
const FieldSelectBase = createField<SelectFieldProps, string | number, SelectFieldState>({
  displayName: 'FieldSelect',
  useFieldState: (
    componentProps: Omit<SelectFieldProps, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
  ): SelectFieldState => {
    const hasOnCreate = !!componentProps.onCreate
    const showCreateItem = hasOnCreate && componentProps.createItem !== false
    const defaultCreateVerb = useSelectionString('formSelection.createOption')
    const createLabel = componentProps.createLabel ?? `${defaultCreateVerb}…`
    const edit = useSelectionString('formSelection.editOption')
    const hotkeyHint = useSelectionString('formSelection.editHotkeyHint')

    // Options: props take priority, fallback to schema meta
    const appOptions = (componentProps.options ?? resolved.options ?? []) as SelectFieldOption[]
    const actions = useSelectionActionsState({ appOptions })
    const { createdOptions, overlay } = actions

    // Normalize options — value always string for the UIKit contract
    const { normalizedOptions, optionByValue } = useMemo(() => {
      const getGroup = componentProps.getGroup
      // Local edits lie over the app's options until it revalidates the list
      const edited = applyOptionOverlay(appOptions, overlay)
      // Created option loses to the app's own option with the same value (no duplicate after revalidation)
      const merged = mergeCreatedOptions<SelectFieldOption>(edited, createdOptions)
      const hasOnUpdate = !!componentProps.onUpdate
      const normalized: NormalizedOption[] = merged.map((opt) => ({
        label: opt.label,
        textValue: opt.textValue,
        data: opt.data,
        value: String(opt.value),
        disabled: opt.disabled,
        editable: isOptionEditable(opt, hasOnUpdate),
        group: getGroup?.(opt),
      }))
      // The «+ Добавить…» item is service-only: intercepted in onValueChange, never reaches the form
      const withCreate: NormalizedOption[] = showCreateItem
        ? [...normalized, { label: `+ ${createLabel}`, value: CREATE_OPTION_VALUE }]
        : normalized
      // The app's own shape by string value — what the render functions receive
      const byValue = new Map<string, SelectFieldOption>(merged.map((opt) => [String(opt.value), opt]))
      return { normalizedOptions: withCreate, optionByValue: byValue }
    }, [
      appOptions,
      componentProps.getGroup,
      componentProps.onUpdate,
      overlay,
      createdOptions,
      showCreateItem,
      createLabel,
    ])

    // Auto-determine clearable: show clear button if field is optional
    const resolvedClearable = componentProps.clearable ?? !resolved.required

    useNodeLabelWarning('Select', normalizedOptions)

    return {
      normalizedOptions,
      optionByValue,
      resolvedClearable,
      actions,
      strings: { edit, hotkeyHint, create: `+ ${createLabel}` },
    }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    // Convert current value to string for the UIKit contract
    const currentValue = field.state.value
    const stringValue = currentValue !== null && currentValue !== undefined ? String(currentValue) : undefined

    const { actions, strings } = fieldState
    const hasOnUpdate = !!componentProps.onUpdate
    const interactive = !resolved.disabled && !resolved.readOnly

    const applyValue = (raw: string | undefined) => {
      // Convert back to needed type
      if (componentProps.valueType === 'number') {
        field.handleChange(raw ? Number(raw) : 0)
      } else {
        field.handleChange(raw ?? '')
      }
    }

    // Errors of `onCreate`/`onUpdate` are the app's business — they surface as unhandled
    // rejections (GlitchTip), not swallowed here
    const runCreate = () => {
      const onCreate = componentProps.onCreate
      if (!onCreate) {
        return
      }
      actions.run({
        scope: 'option',
        call: () => onCreate(''),
        apply: (created) => {
          actions.addCreatedOption(created)
          applyValue(String(created.value))
        },
      })
    }

    const runEdit = (option: unknown, scope: 'option' | 'value') => {
      const onUpdate = componentProps.onUpdate
      const source = option as SelectFieldOption
      if (!onUpdate) {
        return
      }
      const fromValue = String(source.value)
      actions.run({
        scope,
        call: () => onUpdate(source),
        apply: (result) => {
          actions.recordEdit(fromValue, result)
          // Replaced record (another value): the selected one follows it. Same value — form stays clean
          if (String(result.value) !== fromValue && stringValue === fromValue) {
            applyValue(String(result.value))
          }
        },
      })
    }

    const actionsValue = {
      pending: actions.pending,
      canCreate: !!componentProps.onCreate,
      hasOnUpdate,
      interactive,
      search: '',
      runCreate,
      runEdit,
      strings: {
        edit: strings.edit,
        editAria: (text: string) => `${strings.edit}: ${text}`,
        create: strings.create,
        createWithSearch: () => strings.create,
        hotkeyHint: strings.hotkeyHint,
      },
    }

    const optionContext = (opt: { value: string }, scope: 'option' | 'value' | 'value-text') => {
      const source = fieldState.optionByValue.get(opt.value)
      const editable = !!source && isOptionEditable(source, hasOnUpdate)
      return {
        option: source,
        text: source ? getOptionText(source) : '',
        editable,
        scope,
      }
    }

    const selectedSource = stringValue !== undefined ? fieldState.optionByValue.get(stringValue) : undefined

    return (
      <chakraUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <SelectionActionsProvider value={actionsValue}>
          <chakraUIKit.Select
            value={stringValue}
            onValueChange={(newStringValue) => {
              if (isCreateOptionValue(newStringValue)) {
                // Service item: value is not applied
                runCreate()
                return
              }
              applyValue(newStringValue)
            }}
            onBlur={field.handleBlur}
            options={fieldState.normalizedOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
              textValue: opt.textValue,
              disabled: opt.disabled,
              group: opt.group,
              data: opt.data,
            }))}
            renderOption={componentProps.renderOption
              ? (opt, state) => {
                // Service item «+ Add…» is never passed through the app's renderer
                const source = fieldState.optionByValue.get(opt.value)
                return source
                  ? (
                    <SelectionOptionProvider value={optionContext(opt, 'option')}>
                      {componentProps.renderOption?.(source, state)}
                    </SelectionOptionProvider>
                  )
                  : opt.label
              }
              : undefined}
            // Own renderOption — own buttons (`Select.EditButton`); default pencil only without it
            renderOptionActions={hasOnUpdate && !componentProps.renderOption
              ? (opt) => (
                <SelectionOptionProvider value={optionContext(opt, 'option')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            renderValue={componentProps.renderValue
              ? (opt) => {
                const source = fieldState.optionByValue.get(opt.value)
                const custom = source ? componentProps.renderValue?.(source) : undefined
                // Пустой результат отдаём как есть — скин откатится к тексту опции
                if (custom === undefined || custom === null || custom === false || custom === '') {
                  return custom
                }
                return (
                  <SelectionOptionProvider value={optionContext(opt, 'value-text')}>{custom}</SelectionOptionProvider>
                )
              }
              : undefined}
            controlActions={hasOnUpdate && selectedSource && stringValue !== undefined
              ? (
                <SelectionOptionProvider value={optionContext({ value: stringValue }, 'value')}>
                  <SelectEditButton />
                </SelectionOptionProvider>
              )
              : undefined}
            listFooter={componentProps.listFooter}
            controlRef={actions.controlRef}
            onEditHotkey={hasOnUpdate && interactive
              ? (value, scope) => {
                const source = fieldState.optionByValue.get(value)
                if (source && isOptionEditable(source, true)) {
                  runEdit(source, scope)
                }
              }
              : undefined}
            editHotkeyHint={strings.hotkeyHint}
            label={resolved.label
              ? <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
              : undefined}
            placeholder={resolved.placeholder}
            disabled={resolved.disabled}
            readOnly={resolved.readOnly}
            clearable={fieldState.resolvedClearable}
            size={componentProps.size ?? 'md'}
            variant={componentProps.variant ?? 'outline'}
            data-field-name={fullPath}
          />
        </SelectionActionsProvider>
        <chakraUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </chakraUIKit.FieldRoot>
    )
  },
})

/**
 * `createField` is not generic, so the generic signature is restored by a cast: `TData` is
 * inferred from `options` and flows into `renderOption`/`renderValue`/`getGroup`.
 */
const FieldSelectGeneric = FieldSelectBase as unknown as <TData = unknown>(
  props: SelectFieldProps<TData>,
) => ReactElement

/** Slots `Form.Field.Select.EditButton` / `.CreateButton` — for your own `renderOption`/`listFooter` */
export const FieldSelect = Object.assign(FieldSelectGeneric, {
  EditButton: SelectEditButton,
  CreateButton: SelectCreateButton,
})
