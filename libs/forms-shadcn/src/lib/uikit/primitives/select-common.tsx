import { getOptionText, type UIKitSelectOption } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'

/**
 * Расширение контракта `UIKitSelectProps`, нужное зависимым полям (§18.10): подсказка «Сначала выберите…»
 * связывается с триггером, а значение вне загруженных опций показывается как есть.
 */
export interface ShadcnSelectExtraProps {
  /** Id элемента с подсказкой; дописывается к `aria-describedby` триггера */
  'aria-describedby'?: string
  /**
   * Значение есть, а записи с таким `value` в списке нет (несогласованные данные): в триггере показать само
   * значение, а не пустое место. Идущая загрузка («Загрузка...») сильнее.
   */
  showUnknownValue?: boolean
}

/** Есть ли что рисовать второй строкой: пустая строка и пустой узел — нет */
export function hasDescription(description: ReactNode): boolean {
  return description !== undefined && description !== null && description !== false && description !== ''
}

/** Классы триггера: общие у Radix Select и у Select с поиском (Popover) — вид не зависит от того, есть ли поиск */
export const SELECT_TRIGGER_CLASS = [
  'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[placeholder]:text-muted-foreground',
].join(' ')

interface ResolveValueInput {
  value: string | undefined
  options: UIKitSelectOption<ReactNode>[]
  renderValue?: (option: UIKitSelectOption<ReactNode>) => ReactNode
  loading?: boolean
  loadingMessage?: string
  showUnknownValue?: boolean
}

/**
 * Что показать в триггере вместо placeholder: выбранная опция (`renderValue`, иначе её текст), «Загрузка...» пока
 * опция ещё грузится, значение вне списка как есть. `undefined` — показывается placeholder
 */
export function resolveSelectValue(
  { value, options, renderValue, loading, loadingMessage, showUnknownValue }: ResolveValueInput,
): { selectedOption: UIKitSelectOption<ReactNode> | undefined; valueContent: ReactNode } {
  const selectedOption = value !== undefined ? options.find((opt) => opt.value === value) : undefined
  const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
  const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== false
    && customValue !== ''
  // Значение есть, а его опция ещё грузится: в триггере текст загрузки, а не пустой placeholder
  const showLoadingValue = !!loading && !!loadingMessage && !!value && !selectedOption
  const valueContent = selectedOption
    ? (hasCustomValue ? customValue : getOptionText(selectedOption))
    : showLoadingValue
    ? loadingMessage
    : showUnknownValue && value
    ? value
    : undefined
  return { selectedOption, valueContent }
}
