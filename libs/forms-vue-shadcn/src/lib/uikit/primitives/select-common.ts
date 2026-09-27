import { cn } from '@letar/tailwind-utils'
import type { UINode } from '../ui-node'

/**
 * Общее между обычным (`select.ts`, Reka `SelectRoot`) и Search-вариантом (`select-searchable.ts`,
 * Popover) Select shadcn-скина — вид триггера не зависит от того, есть ли поле поиска. Vue-эквивалент
 * React `select-common.tsx` (`@letar/forms-shadcn`).
 */
export const SELECT_TRIGGER_CLASS = cn(
  'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[placeholder]:text-muted-foreground',
)

/** Есть ли что рисовать второй строкой: пустая строка и `null` — нет */
export function hasDescription(description: UINode | undefined): boolean {
  return description !== undefined && description !== null && description !== ''
}
