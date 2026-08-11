import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Стандартный shadcn-хелпер объединения классов: clsx для условной логики, twMerge для конфликтов Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
