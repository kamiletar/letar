'use client'

import { isCreateOptionValue, type UIKitComboboxProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Loader2 } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'

/** Расширение контракта `UIKitComboboxProps` для зависимых полей: подсказка связывается с полем ввода */
export interface ShadcnComboboxExtraProps {
  /** Id элемента с подсказкой «Сначала выберите…» */
  'aria-describedby'?: string
}

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
    onEditHotkey,
    editHotkeyHint,
    emptyContent,
    loading,
    onOpenChange,
    placeholder,
    disabled,
    ...rest
  }: UIKitComboboxProps<ReactNode> & ShadcnComboboxExtraProps,
) {
  const [open, setOpenState] = useState(false)
  // Обработчик держим в ref: стрелка приложения не должна пересоздавать `setOpen` и перезапускать эффект ниже
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })
  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    onOpenChangeRef.current?.(next)
  }, [])
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
  }, [controlRef, setOpen])

  // Служебный пункт создания делает список непустым — «пусто» считаем по обычным опциям
  const realOptionsCount = options.filter((opt) => !isCreateOptionValue(opt.value)).length
  // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
  const selectedPending = value !== undefined && options.some((opt) => opt.value === value && opt.pending)
  const showSpinner = loading || selectedPending

  // Клавиатура: подсвеченный пункт (стрелки), Enter выбирает, Escape закрывает, F2 правит запись (§16.5)
  const listId = useId()
  const hintId = useId()
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const optionId = (index: number) => `${listId}-opt-${index}`
  const highlightedIndex = highlighted === null ? -1 : options.findIndex((opt) => opt.value === highlighted)
  // Подсветка не переживает закрытие списка и исчезнувшую из выдачи опцию
  useEffect(() => {
    if (!open) {
      setHighlighted(null)
    }
  }, [open])
  useEffect(() => {
    if (highlighted !== null && !options.some((opt) => opt.value === highlighted)) {
      setHighlighted(null)
    }
  }, [options, highlighted])
  useEffect(() => {
    if (highlightedIndex >= 0) {
      document.getElementById(optionId(highlightedIndex))?.scrollIntoView?.({ block: 'nearest' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `optionId` производный от `listId`
  }, [highlightedIndex])

  const select = (opt: (typeof options)[number]) => {
    if (opt.disabled) {
      return
    }
    onValueChange(opt.value)
    setOpen(false)
  }

  /** Сдвиг подсветки на `step` по не заблокированным пунктам (по кругу) */
  const moveHighlight = (step: 1 | -1) => {
    const enabled = options.filter((opt) => !opt.disabled)
    if (enabled.length === 0) {
      return
    }
    const current = enabled.findIndex((opt) => opt.value === highlighted)
    const next = current === -1
      ? (step === 1 ? 0 : enabled.length - 1)
      : (current + step + enabled.length) % enabled.length
    setHighlighted(enabled[next]!.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      const opt = open && highlightedIndex >= 0 ? options[highlightedIndex] : undefined
      if (opt) {
        // Выбор пункта, а не отправка формы
        event.preventDefault()
        select(opt)
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
      }
    } else if (event.key === 'F2' && onEditHotkey) {
      const opt = open && highlightedIndex >= 0 ? options[highlightedIndex] : undefined
      if (opt && !isCreateOptionValue(opt.value)) {
        event.preventDefault()
        onEditHotkey(opt.value, 'option')
      } else if (!open && value) {
        event.preventDefault()
        onEditHotkey(value, 'value')
      }
    }
  }

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
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined}
            aria-keyshortcuts={onEditHotkey ? 'F2' : undefined}
            aria-busy={selectedPending ? true : undefined}
            aria-describedby={[rest['aria-describedby'], onEditHotkey && editHotkeyHint ? hintId : undefined]
              .filter(Boolean)
              .join(' ') || undefined}
            onKeyDown={handleKeyDown}
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
              (controlActions || showSpinner) && 'pr-9',
            )}
          />
          {showSpinner && !controlActions && (
            <Loader2
              className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 my-auto size-4 animate-spin"
              aria-hidden
            />
          )}
          {controlActions && <div className="absolute inset-y-0 right-1.5 flex items-center">{controlActions}</div>}
          {onEditHotkey && editHotkeyHint && <span id={hintId} className="sr-only">{editHotkeyHint}</span>}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          id={listId}
          role="listbox"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
          align="start"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground z-50 max-h-60 w-[var(--radix-popover-trigger-width)] overflow-auto rounded-md border p-1 shadow-md',
          )}
        >
          {loading && realOptionsCount === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">Загрузка...</div>
          )}
          {!loading && realOptionsCount === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">{emptyContent ?? 'Ничего не найдено'}</div>
          )}
          {/* Прошлые результаты остаются на экране, пока идёт новый запрос (спиннер — в поле ввода) */}
          {options.map((opt, index) => (
            <div
              key={opt.value}
              id={optionId(index)}
              role="option"
              aria-selected={opt.value === value}
              data-highlighted={index === highlightedIndex ? '' : undefined}
              onMouseMove={() => {
                if (!opt.disabled && highlighted !== opt.value) {
                  setHighlighted(opt.value)
                }
              }}
              data-disabled={opt.disabled || undefined}
              data-pending={opt.pending ? '' : undefined}
              aria-disabled={opt.disabled || undefined}
              onClick={() => select(opt)}
              className={cn(
                'group/item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
                'hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              )}
            >
              {renderOption
                ? renderOption(opt, {
                  selected: opt.value === value,
                  disabled: opt.disabled ?? false,
                  pending: opt.pending ?? false,
                })
                : opt.label}
              {opt.pending
                ? <Loader2 className="text-muted-foreground ml-auto size-4 shrink-0 animate-spin" aria-hidden />
                : renderOptionActions?.(opt)}
            </div>
          ))}
          {listFooter && <div className="mt-1 border-t pt-1">{listFooter}</div>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
