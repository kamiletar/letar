import { cn } from './cn'

/**
 * Классы shadcn/Tailwind для нативного `<input>`, общие для полей, которым нужен голый
 * `<input>` в обход UIKit-обёртки (не пропускает `min`/`max`/`step`/`id`) —
 * `FieldDateRange`, `FieldDateTimePicker`.
 */
export const NATIVE_INPUT_CLASS = cn(
  'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)
