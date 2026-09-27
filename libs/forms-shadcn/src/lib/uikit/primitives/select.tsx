'use client'

import { getOptionText, type UIKitSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

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
function hasDescription(description: ReactNode): boolean {
  return description !== undefined && description !== null && description !== false && description !== ''
}

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
    loading,
    loadingMessage,
    showUnknownValue,
    ...rest
  }: UIKitSelectProps<ReactNode> & ShadcnSelectExtraProps,
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
  // Значение есть, а его опция ещё грузится: в триггере текст загрузки, а не пустой placeholder
  const showLoadingValue = !!loading && !!loadingMessage && !!value && !selectedOption
  const valueContent = selectedOption
    ? (hasCustomValue ? customValue : getOptionText(selectedOption))
    : showLoadingValue
    ? loadingMessage
    : showUnknownValue && value
    ? value
    : undefined

  // Кнопка очистки — настоящая кнопка рядом с триггером; недоступна, когда поле заблокировано или только для чтения
  const showClear = !!clearable && !!value && !disabled && !readOnly
  const sideButtons = showClear || !!controlActions

  return (
    <SelectPrimitive.Root
      // `undefined` переводит Radix в неконтролируемый режим — он продолжил бы показывать очищенное значение
      value={value ?? ''}
      // Radix сам зовёт `onValueChange('')`, когда его скрытый нативный `<select>` не находит опцию текущего значения
      // (ожидающая оптимистичная опция `disabled`, значение вне списка): выбор пользователя тут ни при чём, а форма
      // потеряла бы значение. Пустое значение легально приходит токеном пустой опции или кнопкой очистки
      onValueChange={(next) => {
        if (next !== '') {
          onValueChange(next)
        }
      }}
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
          // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
          aria-busy={selectedOption?.pending ? true : undefined}
          aria-keyshortcuts={onEditHotkey ? 'F2' : undefined}
          aria-describedby={[rest['aria-describedby'], onEditHotkey && editHotkeyHint ? hintId : undefined]
            .filter(Boolean)
            .join(' ') || undefined}
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
            sideButtons && 'pr-16',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>{valueContent}</SelectPrimitive.Value>
          {(loading || selectedOption?.pending) && (
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
          )}
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        {sideButtons && (
          // Соседом триггера, не внутри него: в `<button>` вложенная кнопка невалидна
          <div className="absolute inset-y-0 right-8 flex items-center gap-1">
            {showClear && (
              <button
                type="button"
                data-slot="select-clear"
                aria-label="Очистить"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
                onClick={() => {
                  onValueChange(undefined)
                  triggerRef.current?.focus()
                }}
              >
                <X className="size-4 opacity-50" aria-hidden />
              </button>
            )}
            {controlActions}
          </div>
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
            {loading && options.length === 0 && loadingMessage && (
              <div className="text-muted-foreground px-2 py-1.5 text-sm">{loadingMessage}</div>
            )}
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                // Опция в ожидании подтверждения (§16.7) не выбирается ни мышью, ни клавиатурой
                disabled={opt.disabled || opt.pending}
                data-pending={opt.pending ? '' : undefined}
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
                {(() => {
                  const text = (
                    <SelectPrimitive.ItemText>
                      {renderOption
                        ? renderOption(opt, {
                          selected: opt.value === value,
                          disabled: opt.disabled ?? false,
                          pending: opt.pending ?? false,
                        })
                        : opt.label}
                    </SelectPrimitive.ItemText>
                  )
                  // Вторая строка — сосед `ItemText`: подпись триггера берётся из него, описания там нет.
                  // Со своим `renderOption` пункт рисует приложение
                  if (renderOption || !hasDescription(opt.description)) {
                    return text
                  }
                  return (
                    <div className="flex min-w-0 flex-1 flex-col">
                      {text}
                      <span data-slot="select-item-description" className="text-muted-foreground text-xs">
                        {opt.description}
                      </span>
                    </div>
                  )
                })()}
                {opt.pending
                  ? <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
                  : renderOptionActions?.(opt)}
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
