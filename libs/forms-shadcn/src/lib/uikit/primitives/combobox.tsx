'use client'

import { isCreateOptionValue, type UIKitComboboxProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export function Combobox(
  {
    value,
    inputValue,
    onInputChange,
    onValueChange,
    options,
    renderOption,
    renderOptionActions,
    controlActions,
    listFooter,
    controlRef,
    emptyContent,
    loading,
    placeholder,
    disabled,
    ...rest
  }: UIKitComboboxProps<ReactNode>,
) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Программный фокус (после окна приложения) не должен снова открывать список
  const skipOpenOnFocusRef = useRef(false)
  useEffect(() => {
    if (!controlRef) {
      return
    }
    controlRef.current = {
      close: () => setOpen(false),
      focusTrigger: () => {
        skipOpenOnFocusRef.current = true
        inputRef.current?.focus()
      },
    }
    return () => {
      controlRef.current = null
    }
  }, [controlRef])

  // Служебный пункт создания делает список непустым — «пусто» считаем по обычным опциям
  const realOptionsCount = options.filter((opt) => !isCreateOptionValue(opt.value)).length

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className="relative">
          <input
            ref={inputRef}
            data-slot="combobox-input"
            type="text"
            role="combobox"
            aria-expanded={open}
            value={inputValue}
            onChange={(e) => {
              onInputChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (skipOpenOnFocusRef.current) {
                skipOpenOnFocusRef.current = false
                return
              }
              setOpen(true)
            }}
            placeholder={placeholder}
            disabled={disabled}
            data-field-name={rest['data-field-name']}
            className={cn(
              'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              controlActions && 'pr-9',
            )}
          />
          {controlActions && <div className="absolute inset-y-0 right-1.5 flex items-center">{controlActions}</div>}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
          align="start"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground z-50 max-h-60 w-[var(--radix-popover-trigger-width)] overflow-auto rounded-md border p-1 shadow-md',
          )}
        >
          {loading && <div className="text-muted-foreground px-2 py-1.5 text-sm">Загрузка...</div>}
          {!loading && realOptionsCount === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">{emptyContent ?? 'Ничего не найдено'}</div>
          )}
          {!loading && options.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              data-disabled={opt.disabled || undefined}
              onClick={() => {
                if (opt.disabled) { return }
                onValueChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'group/item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
                'hover:bg-accent hover:text-accent-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              )}
            >
              {renderOption
                ? renderOption(opt, { selected: opt.value === value, disabled: opt.disabled ?? false })
                : opt.label}
              {renderOptionActions?.(opt)}
            </div>
          ))}
          {listFooter && <div className="mt-1 border-t pt-1">{listFooter}</div>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
