'use client'

import { getOptionText, type UIKitSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Select(
  {
    value,
    onValueChange,
    onBlur,
    options,
    renderOption,
    renderValue,
    label,
    placeholder,
    disabled,
    clearable,
    ...rest
  }: UIKitSelectProps<ReactNode>,
) {
  // Подпись триггера Radix копирует порталом из ItemText, если у `Value` нет children — тогда
  // туда попал бы узел из `label`/`renderOption`. Поэтому при найденной выбранной опции children
  // задаём всегда: `renderValue` (пустой результат — строка опции). Нет выбора — placeholder
  const selectedOption = value !== undefined ? options.find((opt) => opt.value === value) : undefined
  const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
  const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== false
    && customValue !== ''
  const valueContent = selectedOption ? (hasCustomValue ? customValue : getOptionText(selectedOption)) : undefined

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      {label && <span className="mb-2 block text-sm leading-none font-medium">{label}</span>}
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        onBlur={onBlur}
        data-field-name={rest['data-field-name']}
        className={cn(
          'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[placeholder]:text-muted-foreground',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder}>{valueContent}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          {clearable && value
            ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange(undefined)
                }}
              >
                <X className="size-4 opacity-50" />
              </span>
            )
            : <ChevronDown className="size-4 opacity-50" />}
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          data-slot="select-content"
          position="popper"
          className={cn(
            'bg-popover text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                textValue={getOptionText(opt)}
                className={cn(
                  'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                  'focus:bg-accent focus:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <SelectPrimitive.ItemText>
                  {renderOption
                    ? renderOption(opt, { selected: opt.value === value, disabled: opt.disabled ?? false })
                    : opt.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
