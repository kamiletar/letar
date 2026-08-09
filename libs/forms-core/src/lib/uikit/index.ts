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
  UIKitPinInputProps,
  UIKitRadioGroupProps,
  UIKitRadioOption,
  UIKitRequiredIndicatorProps,
  UIKitSegmentGroupProps,
  UIKitSelectOption,
  UIKitSelectProps,
  UIKitTextProps,
  UIKitTone,
  UIKitTooltipProps,
} from './types'

// Pure grouping logic for selection fields — the framework-free half of the old
// `use-grouped-options` hook (its other half built an Ark UI collection, an adapter detail).
export { getOptionLabel, groupOptions, hasGroups } from './group-options'
export type { GroupableLike } from './group-options'
