'use client'

import { getOptionText, type UIKitSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

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
    readOnly,
    clearable,
    renderOptionActions,
    controlActions,
    listFooter,
    controlRef,
    onEditHotkey,
    editHotkeyHint,
    ...rest
  }: UIKitSelectProps<ReactNode>,
) {
  // Управляемое открытие: поле закрывает список перед окном приложения (`controlRef.close`)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const hintId = useId()
  useEffect(() => {
    if (!controlRef) {
      return
    }
    controlRef.current = {
      close: () => setOpen(false),
      focusTrigger: () => triggerRef.current?.focus(),
    }
    return () => {
      controlRef.current = null
    }
  }, [controlRef])

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
      open={open}
      // Radix `readOnly` не знает: не даём открыть список сами
      onOpenChange={(next) => setOpen(next && !readOnly)}
    >
      {label && <span className="mb-2 block text-sm leading-none font-medium">{label}</span>}
      <div className="relative">
        <SelectPrimitive.Trigger
          ref={triggerRef}
          data-slot="select-trigger"
          onBlur={onBlur}
          data-field-name={rest['data-field-name']}
          aria-keyshortcuts={onEditHotkey ? 'F2' : undefined}
          aria-describedby={onEditHotkey && editHotkeyHint ? hintId : undefined}
          onKeyDown={onEditHotkey
            ? (event) => {
              // Закрытый список: F2 правит выбранное значение
              if (event.key === 'F2' && !open && value) {
                event.preventDefault()
                onEditHotkey(value, 'value')
              }
            }
            : undefined}
          className={cn(
            'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[placeholder]:text-muted-foreground',
            // Место под кнопки рядом со значением
            controlActions && 'pr-16',
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
        {controlActions && (
          // Соседом триггера, не внутри него: в `<button>` вложенная кнопка невалидна
          <div className="absolute inset-y-0 right-8 flex items-center">{controlActions}</div>
        )}
      </div>
      {onEditHotkey && editHotkeyHint && <span id={hintId} className="sr-only">{editHotkeyHint}</span>}
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
                onKeyDown={onEditHotkey
                  ? (event) => {
                    // Открытый список: F2 правит подсвеченный пункт
                    if (event.key === 'F2') {
                      event.preventDefault()
                      onEditHotkey(opt.value, 'option')
                    }
                  }
                  : undefined}
                className={cn(
                  'group/item relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                  'focus:bg-accent focus:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <SelectPrimitive.ItemText>
                  {renderOption
                    ? renderOption(opt, { selected: opt.value === value, disabled: opt.disabled ?? false })
                    : opt.label}
                </SelectPrimitive.ItemText>
                {renderOptionActions?.(opt)}
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          {listFooter && <div className="border-t p-1">{listFooter}</div>}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
