import { cn } from '@letar/tailwind-utils'

/** Стиль карточки выбора (border+ring при выборе, opacity при disabled) — общий для FieldRadioCard и FieldCheckboxCard. */
export function cardClass(selected: boolean, disabled: boolean | undefined): string {
  return cn(
    'flex flex-1 flex-col gap-1 rounded-md border p-3 text-left text-sm outline-none',
    selected ? 'border-primary ring-primary/50 ring-2' : 'border-input hover:bg-accent/50',
    disabled && 'pointer-events-none opacity-50',
  )
}
