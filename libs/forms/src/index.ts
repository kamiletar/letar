// Form hook and contexts
export {
  fieldContext,
  formContext,
  useFieldContext,
  useFormContext,
  useTypedFormContext,
  useTypedFormSubscribe,
} from './lib/context'
export { useAppForm, withForm } from './lib/form-hook'

// Base form components (for naming/grouping)
export { FormField, type FormFieldContextValue, type FormFieldProps, useFormField } from './lib/form-field'
export { FormGroup, type FormGroupContextValue, type FormGroupProps, useFormGroup } from './lib/form-group'

// Components with TanStack Form integration
export {
  TanStackFormField,
  type TanStackFormFieldContextValue,
  type TanStackFormFieldProps,
  useTanStackFormField,
} from './lib/tanstack-form-field'

// Components with Chakra UI integration
export { ChakraFormField, type ChakraFormFieldProps } from './lib/chakra-form-field'

// Array field components
export {
  FormGroupList,
  type FormGroupListContextValue,
  FormGroupListItem,
  type FormGroupListItemContextValue,
  type FormGroupListItemProps,
  type FormGroupListProps,
  useFormGroupList,
  useFormGroupListItem,
} from './lib/form-group-list'

// Types
export type { BaseFieldProps, DeepKeys, DeepValue, FieldApi, FormApi } from './lib/types'

// Declarative forms API
export {
  booleanMeta,
  ButtonSubmit,
  commonMeta,
  createForm,
  dateMeta,
  DeclarativeFormContext,
  enumMeta,
  FieldCombobox,
  FieldListbox,
  FieldNumber,
  FieldSegmentedGroup,
  FieldSelect,
  FieldString,
  Form,
  FormGroupDeclarative,
  FormGroupListDeclarative,
  numberMeta,
  // Relation field provider
  RelationFieldProvider,
  // Metadata helpers
  relationMeta,
  textMeta,
  useDeclarativeField,
  useDeclarativeForm,
  useDeclarativeFormOptional,
  useRelationFieldContext,
  useRelationOptions,
  withRelations,
  // Enrich schema with UI metadata
  withUIMeta,
  withUIMetaDeep,
} from './lib/declarative'

export type {
  ComboboxFieldProps,
  ComboboxOption,
  DeclarativeFormContextValue,
  DeepUIMetaConfig,
  ExtendedForm,
  FieldChangeApi,
  FieldTooltipMeta,
  FieldUIMeta,
  FormApiConfig,
  FormApiResult,
  FormApiState,
  FormDividerProps,
  FormGroupDeclarativeProps,
  FormGroupListDeclarativeProps,
  FormInfoBlockProps,
  FormProps,
  FormPropsWithApi,
  FormWatchProps,
  HiddenFieldProps,
  ListboxFieldProps,
  ListboxOption,
  NumberFieldProps,
  OnFieldChangeMap,
  // Relation provider types
  QueryHookResult,
  RelationConfig,
  RelationFieldConfig,
  RelationFieldContextValue,
  RelationOption,
  RelationState,
  SegmentedGroupFieldProps,
  SegmentedGroupOption,
  SelectFieldProps,
  SelectionFieldType,
  SelectOption,
  StringFieldProps,
  SubmitButtonProps,
  UIMetaConfig,
  UseCreateHook,
  UseQueryHook,
  UseUpdateHook,
} from './lib/declarative'

export {
  type CalculatedFieldProps,
  type FieldActionsResult,
  FieldCalculated,
  FieldHidden,
  FormDivider,
  FormInfoBlock,
  FormWatch,
  useFieldActions,
  useFormApi,
  useFormStepsContext,
} from './lib/declarative'

// Hooks for async search (Combobox, Autocomplete)
export { useAsyncSearch, useDebounce } from './lib/declarative'
export type { AsyncQueryFn, AsyncQueryResult, UseAsyncSearchOptions, UseAsyncSearchResult } from './lib/declarative'

// Field UI components
export { FieldLabel, type FieldLabelProps, FieldTooltip, type FieldTooltipProps } from './lib/declarative'

// Context utilities
export {
  createNamedGroupContext,
  createSafeContext,
  type NamedGroupContextValue,
  type SafeContextResult,
} from './lib/contexts'

// Offline support
export { FormOfflineIndicator, FormSyncStatus, useOfflineForm, useOfflineStatus, useSyncQueue } from './lib/offline'

export type {
  FormOfflineConfig,
  OfflineIndicatorProps,
  OfflineSubmitResult,
  SyncAction,
  SyncActionType,
  SyncStatusProps,
  UseOfflineFormOptions,
  UseOfflineFormResult,
  UseSyncQueueResult,
} from './lib/offline'

// i18n support
export { FormI18nProvider, getLocalizedValue, useFormI18n, useLocalizedOptions } from './lib/i18n'

export type { LocalizableOption, TranslateFunction, TranslateParams } from './lib/i18n'

// Security utilities
export {
  parseFileSize,
  processFileWithSecurity,
  sanitizeFileName,
  useRateLimit,
  validateMimeType,
} from './lib/declarative'
export type { FileSecurityConfig, FileSecurityResult, RateLimitConfig, RateLimitState } from './lib/declarative'

// Conversational Mode
export { ConversationalMode, useConversationalState } from './lib/declarative'
export type { ConversationalModeProps, ConversationalState } from './lib/declarative'

// Autosave
export { AutosaveIndicator, useFormAutosave } from './lib/declarative'
export type {
  AutosaveIndicatorProps,
  AutosaveStatus,
  FormAutosaveConfig,
  UseFormAutosaveResult,
} from './lib/declarative'

// URL Prefill
export { generatePrefillUrl, useUrlPrefill } from './lib/declarative/use-url-prefill'
export type { UrlPrefillOptions } from './lib/declarative/use-url-prefill'

// Form Templates
export { FormFromTemplate, templates } from './lib/declarative'
export type { FormFromTemplateProps, FormTemplate } from './lib/declarative'

// CAPTCHA (Turnstile / reCAPTCHA / hCaptcha)
export { CAPTCHA_TOKEN_FIELD, CaptchaContext, CaptchaField, useCaptchaConfig } from './lib/captcha'
export type {
  CaptchaConfig,
  CaptchaFieldProps,
  CaptchaProvider,
  CaptchaSize,
  CaptchaTheme,
  CaptchaVerifyOptions,
  CaptchaVerifyResult,
} from './lib/captcha'

// Серверная верификация CAPTCHA (server-only)
export { verifyCaptcha } from './lib/captcha/verify'

// CreditCard (форматирование, валидация, определение бренда)
export {
  CardBrandIcon,
  CreditCardField,
  creditCardSchema,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  luhn,
} from './lib/declarative/form-fields/specialized/credit-card'
export type {
  CardBrand,
  CardBrandInfo,
  CreditCardFieldProps,
  CreditCardLayout,
} from './lib/declarative/form-fields/specialized/credit-card'

// Server Error Mapping (Prisma, ZenStack, Zod, ActionResult)
export { applyServerErrors, mapServerErrors } from './lib/server-errors'
export type {
  ActionResultError,
  FieldError,
  FieldErrorMap,
  MappedServerErrors,
  MapServerErrorsConfig,
  PrismaError,
  ZenStackError,
  ZodFlatError,
} from './lib/server-errors'

// Form History (Undo/Redo)
export { HistoryControls, useFormHistory } from './lib/history'
export type { FormHistoryConfig, HistoryControlsProps, HistoryEntry, UseFormHistoryResult } from './lib/history'

// Form Analytics (field-level tracking, drop-off, completion)
export {
  AnalyticsPanel,
  createGtagAdapter,
  createPostHogAdapter,
  createUmamiAdapter,
  createYandexMetrikaAdapter,
  useFormAnalytics,
} from './lib/analytics'
export type {
  AnalyticsAdapter,
  AnalyticsPanelProps,
  FieldAnalytics,
  FormAnalyticsConfig,
  FormAnalyticsEvent,
  UseFormAnalyticsResult,
} from './lib/analytics'

// ReadOnly View
export { FormReadOnlyView } from './lib/declarative/form-readonly-view'
export type { FormReadOnlyViewProps } from './lib/declarative/form-readonly-view'

// Skeleton (loading state)
export { FormSkeleton } from './lib/declarative/form-skeleton'
export type { FormSkeletonProps } from './lib/declarative/form-skeleton'

// Comparison (diff-view)
export { FormComparison } from './lib/declarative/form-comparison'
export type { FormComparisonProps } from './lib/declarative/form-comparison'

// DependsOn (каскадный рендеринг)
export { FormDependsOn } from './lib/declarative/form-depends-on'
export type { FormDependsOnProps } from './lib/declarative/form-depends-on'
