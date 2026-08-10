import { cn } from '../../utils/cn'

/**
 * Классы `shadcnUIKit.Input` (см. `input.tsx`), вынесенные для полей, которым нужен нативный
 * `<input>` в обход `UIKitInputProps` (не пропускает `min`/`max`/`step`/`id`) — `FieldDateRange`,
 * `FieldDateTimePicker`.
 */
export const NATIVE_INPUT_CLASS = cn(
  'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)
