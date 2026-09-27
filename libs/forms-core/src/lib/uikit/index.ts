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
export {
  getOptionDescriptionText,
  getOptionLabel,
  getOptionSearchText,
  getOptionText,
  groupOptions,
  hasGroups,
  isNodeLabelWithoutText,
} from './group-options'
export type { GroupableLike } from './group-options'

// `onCreate` у Select/Combobox — создание записи справочника, не уходя из формы
export { CREATE_OPTION_VALUE, isCreateOptionValue, mergeCreatedOptions, shouldOfferCreate } from './creatable-options'
export type { CreatedOption, CreateOptionHandler, SelectionActionContext } from './creatable-options'
export { applyOptionOverlay, isOptionEditable, pruneOptionOverlay, upsertOptionOverlay } from './editable-options'
export type {
  OptionOverlayEntry,
  SelectionActionKind,
  SettleErrorInfo,
  SettleErrorReason,
  UpdatedOption,
  UpdateOptionHandler,
} from './editable-options'

// Зависимые (каскадные) поля: `dependsOn`, ключ зависимостей, реестр очистки зависимых (§18)
export {
  areDepsReady,
  buildDeps,
  createDependentsRegistry,
  getValueAtPath,
  isEmptyDepValue,
  resolveDependsOn,
  serializeDeps,
} from './dependent-fields'
export type {
  DependentFieldProps,
  DependentRegistration,
  DependentsRegistry,
  FieldDeps,
  ResolvedDependency,
} from './dependent-fields'

// Реестр неподтверждённых оптимистичных действий формы: отправка ждёт его пустоты (§16.7)
export { createPendingRegistry } from './pending-registry'
export type { PendingRegistry, PendingRegistrySnapshot } from './pending-registry'

// Клавиатурная навигация кастомного listbox-попапа (headless `forms-vue`/`forms-angular`, §Vue/
// Angular parity): чистый расчёт индекса, без DOM и без сторонней позиционирующей библиотеки
export { createListboxTypeAhead, moveListboxActiveIndex } from './listbox-navigation'
export type { ListboxNavigationDirection, ListboxNavigationOption } from './listbox-navigation'

// Поиск внутри Select: порог показа, фильтр с учётом раскладки, контракт поля поиска для скина
export { correctKeyboardLayout, detectLayout } from './keyboard-layout'
export {
  createSearchMatcher,
  filterSelectionOptions,
  matchesSearchQuery,
  resolveSearchable,
  SELECT_SEARCH_THRESHOLD,
} from './search'
export type { SelectSearchable, SelectSearchSettings, UIKitSelectSearch } from './search'

// Асинхронные источники данных полей выбора: промис-загрузчики и общая форма «список из любого источника»
export type { LoadContext, LoadOptionsFn, LoadSelectedFn, OptionsSourceProps } from './load-options'
