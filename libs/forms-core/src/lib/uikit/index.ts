export type {
  UIKit,
  UIKitButtonProps,
  UIKitCheckboxProps,
  UIKitComboboxProps,
  UIKitCorePrimitives,
  UIKitErrorFallbackProps,
  UIKitExtendedPrimitives,
  UIKitFieldErrorProps,
  UIKitFieldLabelProps,
  UIKitFieldRootProps,
  UIKitIconButtonProps,
  UIKitInputProps,
  UIKitLayoutProps,
  UIKitNativeSelectOption,
  UIKitNativeSelectProps,
  UIKitNumberInputProps,
  UIKitOptionRenderState,
  UIKitPinInputProps,
  UIKitRadioGroupProps,
  UIKitRadioOption,
  UIKitRequiredIndicatorProps,
  UIKitSegmentGroupProps,
  UIKitSelectControl,
  UIKitSelectionSlotProps,
  UIKitSelectOption,
  UIKitSelectProps,
  UIKitTextProps,
  UIKitTone,
  UIKitTooltipProps,
} from './types'

// Pure grouping logic for selection fields — the framework-free half of the old
// `use-grouped-options` hook (its other half built an Ark UI collection, an adapter detail).
export { getOptionLabel, getOptionText, groupOptions, hasGroups, isNodeLabelWithoutText } from './group-options'
export type { GroupableLike } from './group-options'

// `onCreate` у Select/Combobox — создание записи справочника, не уходя из формы
export { CREATE_OPTION_VALUE, isCreateOptionValue, mergeCreatedOptions, shouldOfferCreate } from './creatable-options'
export type { CreatedOption, CreateOptionHandler } from './creatable-options'
export { applyOptionOverlay, isOptionEditable, pruneOptionOverlay, upsertOptionOverlay } from './editable-options'
export type { OptionOverlayEntry, SelectionActionKind, UpdatedOption, UpdateOptionHandler } from './editable-options'
