'use client'

import { isCreateOptionValue, type UIKitSelectOption, type UIKitSelectProps } from '@letar/forms-core/uikit'
import { cn } from '@letar/tailwind-utils'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { hasDescription, resolveSelectValue, SELECT_TRIGGER_CLASS, type ShadcnSelectExtraProps } from './select-common'

type Option = UIKitSelectOption<ReactNode>

/** Пункт нельзя выбрать: заблокирован или ждёт подтверждения сервера (§16.7) */
const isInert = (opt: Option) => !!opt.disabled || !!opt.pending

/**
 * Select с полем поиска: кнопка-триггер и Popover, внутри — поле ввода и список (`role="listbox"`).
 * Фокус остаётся в поле поиска, подсвеченный пункт объявляется через `aria-activedescendant`.
 * Клавиатура: стрелки — подсветка, Enter — выбор, Escape — закрыть (Popover), F2 — правка записи (§16.5).
 * Радиксовского `<select>` тут нет, поэтому его дефекты (пустое значение от нативного `<select>`, неконтролируемый
 * режим при `value={undefined}`) не воспроизводятся.
 */
export function SearchableSelect(
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
    search,
    renderOptionActions,
    controlActions,
    listFooter,
    controlRef,
    onEditHotkey,
    editHotkeyHint,
    emptyContent,
    loading,
    loadingMessage,
    showUnknownValue,
    ...rest
  }: UIKitSelectProps<ReactNode> & ShadcnSelectExtraProps,
) {
  const [open, setOpenState] = useState(false)
  const openRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listId = useId()
  const hintId = useId()

  // Обработчики приложения — в ref: смена стрелки на рендере не должна пересоздавать `setOpen`
  const onBlurRef = useRef(onBlur)
  const onQueryChangeRef = useRef(search?.onQueryChange)
  useEffect(() => {
    onBlurRef.current = onBlur
    onQueryChangeRef.current = search?.onQueryChange
  })

  const setOpen = useCallback((next: boolean) => {
    if (next && (readOnly || disabled)) {
      return
    }
    if (openRef.current === next) {
      return
    }
    openRef.current = next
    setOpenState(next)
    if (!next) {
      // Строка поиска не переживает закрытие; «тронуто» — после закрытия, а не при переходе фокуса в поле поиска
      onQueryChangeRef.current?.('')
      onBlurRef.current?.()
    }
  }, [readOnly, disabled])

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
  }, [controlRef, setOpen])

  const { selectedOption, valueContent } = resolveSelectValue({
    value,
    options,
    renderValue,
    loading,
    loadingMessage,
    showUnknownValue,
  })

  const query = search?.query ?? ''
  const visible = search?.visibleValues
  // Список — по видимым значениям; «выбранное» и пустой вариант считаются по полному `options`. Служебный пункт
  // «+ Добавить…» фильтром не режется: поле само подписывает его текущим запросом
  const listOptions = useMemo(
    () => options.filter((opt) => isCreateOptionValue(opt.value) || !visible || visible.has(opt.value)),
    [options, visible],
  )
  const realCount = listOptions.filter((opt) => !isCreateOptionValue(opt.value)).length

  // Подсветка: при открытии — выбранный пункт, при вводе — первый подходящий (Enter берёт его)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const listOptionsRef = useRef(listOptions)
  listOptionsRef.current = listOptions
  useEffect(() => {
    if (!open) {
      setHighlighted(null)
      return
    }
    const list = listOptionsRef.current
    const selected = query === '' ? list.find((opt) => opt.value === value && !isInert(opt)) : undefined
    const first = list.find((opt) => !isInert(opt) && !isCreateOptionValue(opt.value))
    setHighlighted((selected ?? first)?.value ?? null)
    // Подсветка пересчитывается при открытии и при смене запроса, но не при каждом обновлении списка
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query])
  // Исчезнувшая из выдачи опция подсветку не удерживает. Функциональное обновление: в одном коммите с пересчётом
  // подсветки по запросу оно применяется поверх него и не затирает свежую подсветку
  useEffect(() => {
    setHighlighted((current) => current !== null && !listOptions.some((opt) => opt.value === current) ? null : current)
  }, [listOptions])

  const optionId = (index: number) => `${listId}-opt-${index}`
  const highlightedIndex = highlighted === null ? -1 : listOptions.findIndex((opt) => opt.value === highlighted)
  useEffect(() => {
    if (highlightedIndex >= 0) {
      document.getElementById(optionId(highlightedIndex))?.scrollIntoView?.({ block: 'nearest' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `optionId` производный от `listId`
  }, [highlightedIndex])

  const select = (opt: Option) => {
    if (isInert(opt)) {
      return
    }
    onValueChange(opt.value)
    setOpen(false)
  }

  /** Сдвиг подсветки на `step` по доступным пунктам (по кругу) */
  const moveHighlight = (step: 1 | -1) => {
    const enabled = listOptions.filter((opt) => !isInert(opt))
    if (enabled.length === 0) {
      return
    }
    const current = enabled.findIndex((opt) => opt.value === highlighted)
    const next = current === -1
      ? (step === 1 ? 0 : enabled.length - 1)
      : (current + step + enabled.length) % enabled.length
    setHighlighted(enabled[next]!.value)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      // Выбор пункта (или ничего), но не отправка формы из поля поиска
      event.preventDefault()
      const opt = highlightedIndex >= 0 ? listOptions[highlightedIndex] : undefined
      if (opt) {
        select(opt)
      }
    } else if (event.key === 'Tab') {
      // Radix Popover зацикливает фокус внутри списка, а в нём одно поле — Tab не уходил бы никуда. Закрываем и
      // возвращаем фокус на триггер (`onCloseAutoFocus`): следующий Tab продолжает обход страницы
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'F2' && onEditHotkey) {
      const opt = highlightedIndex >= 0 ? listOptions[highlightedIndex] : undefined
      if (opt && !isCreateOptionValue(opt.value)) {
        event.preventDefault()
        onEditHotkey(opt.value, 'option')
      }
    }
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    } else if (event.key === 'F2' && onEditHotkey && !open && value) {
      // Закрытый список: F2 правит выбранное значение
      event.preventDefault()
      onEditHotkey(value, 'value')
    }
  }

  const showClear = !!clearable && !!value && !disabled && !readOnly
  const sideButtons = showClear || !!controlActions

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      {label && <span className="mb-2 block text-sm leading-none font-medium">{label}</span>}
      <div className="relative">
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            data-slot="select-trigger"
            data-placeholder={valueContent === undefined ? '' : undefined}
            data-field-name={rest['data-field-name']}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
            aria-busy={selectedOption?.pending ? true : undefined}
            aria-keyshortcuts={onEditHotkey ? 'F2' : undefined}
            aria-describedby={[rest['aria-describedby'], onEditHotkey && editHotkeyHint ? hintId : undefined]
              .filter(Boolean)
              .join(' ') || undefined}
            disabled={disabled}
            onKeyDown={handleTriggerKeyDown}
            // Пока список открыт, фокус ушёл в поле поиска — это не «поле покинуто»
            onBlur={() => {
              if (!openRef.current) {
                onBlur?.()
              }
            }}
            className={cn(SELECT_TRIGGER_CLASS, sideButtons && 'pr-16')}
          >
            <span className="truncate text-left">{valueContent ?? placeholder}</span>
            {(loading || selectedOption?.pending) && (
              <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
            )}
            <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverPrimitive.Trigger>
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
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="select-content"
          // Фокус — в поле поиска, а не на первый фокусируемый элемент
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            searchRef.current?.focus()
          }}
          align="start"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-md border p-0 shadow-md',
          )}
        >
          <div className="border-b p-1">
            <input
              ref={searchRef}
              data-slot="select-search"
              type="text"
              role="searchbox"
              autoComplete="off"
              value={query}
              onChange={(event) => search?.onQueryChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={search?.placeholder}
              aria-label={search?.ariaLabel}
              aria-controls={listId}
              aria-activedescendant={highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined}
              className="placeholder:text-muted-foreground h-8 w-full rounded-sm bg-transparent px-2 text-sm outline-none"
            />
          </div>
          <div id={listId} role="listbox" aria-label={search?.ariaLabel} className="max-h-60 overflow-auto p-1">
            {loading && realCount === 0 && (
              <div className="text-muted-foreground px-2 py-1.5 text-sm">{loadingMessage ?? 'Загрузка...'}</div>
            )}
            {!loading && realCount === 0 && (
              <div className="text-muted-foreground px-2 py-1.5 text-sm">{emptyContent ?? 'Ничего не найдено'}</div>
            )}
            {listOptions.map((opt, index) => {
              const selected = opt.value === value
              const content = renderOption
                ? renderOption(opt, { selected, disabled: opt.disabled ?? false, pending: opt.pending ?? false })
                : opt.label
              return (
                <div
                  key={opt.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={isInert(opt) || undefined}
                  data-highlighted={index === highlightedIndex ? '' : undefined}
                  data-disabled={isInert(opt) || undefined}
                  data-pending={opt.pending ? '' : undefined}
                  onMouseMove={() => {
                    if (!isInert(opt) && highlighted !== opt.value) {
                      setHighlighted(opt.value)
                    }
                  }}
                  onClick={() => select(opt)}
                  className={cn(
                    'group/item relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                    'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  {renderOption || !hasDescription(opt.description)
                    ? content
                    : (
                      <div className="flex min-w-0 flex-1 flex-col">
                        {content}
                        <span data-slot="select-item-description" className="text-muted-foreground text-xs">
                          {opt.description}
                        </span>
                      </div>
                    )}
                  {opt.pending
                    ? <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
                    : renderOptionActions?.(opt)}
                  {selected && (
                    <span className="absolute right-2 flex size-3.5 items-center justify-center">
                      <Check className="size-4" aria-hidden />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {listFooter && <div className="border-t p-1">{listFooter}</div>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
