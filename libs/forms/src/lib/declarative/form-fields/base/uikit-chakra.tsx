'use client'

import {
  Box,
  Button as ChakraButton,
  Checkbox,
  createListCollection,
  Field,
  HStack,
  IconButton as ChakraIconButton,
  Input as ChakraInput,
  Portal,
  Select as ChakraSelect,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { getOptionText, groupOptions } from '@letar/forms-core/uikit'
import type { UIKitCorePrimitives, UIKitExtendedPrimitives, UIKitTone } from '@letar/forms-core/uikit'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FieldError } from './field-error'
import { FieldLabel } from './field-label'
import { FieldTooltip } from './field-tooltip'
import { SelectSearchField } from './select-search-field'

/**
 * Maps the contract's semantic tone onto Chakra's colour system. The contract deliberately
 * says *what the button means* (`danger`), not what colour it is — shadcn maps the same tone
 * to `variant="destructive"` instead.
 */
function toneToColorPalette(tone: UIKitTone | undefined): string | undefined {
  return tone === 'danger' ? 'red' : undefined
}

/**
 * Chakra implementation of the `UIKit` contract from `forms-core`.
 *
 * This is the DIP inversion point (Фаза 7.1, Этап 4): fields import the `UIKit` *type* from
 * `forms-core` and consume an instance of it — they don't import Chakra directly. This file is
 * the only place that wires the contract to a concrete UI library; a `forms-shadcn` adapter
 * would provide the same shape without touching field code.
 *
 * Only the core primitives (see `UIKitCorePrimitives` in forms-core) are implemented — this is
 * a proof of the seam on 3 fields (String, Checkbox, Select), not a rewrite of all 56.
 */

/**
 * Extended primitives this adapter actually implements. Listed explicitly (instead of typing the
 * whole object as `UIKit`, whose extended half is `Partial`) so consumers can render them as
 * plain JSX — `<chakraUIKit.Button>` rather than `chakraUIKit.Button?.({...})`. Calling a
 * component as a function skips its fiber, which silently breaks the moment an implementation
 * needs a hook; the narrower type keeps callers on the JSX path.
 */
type ImplementedExtendedPrimitives = 'Tooltip' | 'RequiredIndicator' | 'ErrorFallback' | 'Button' | 'IconButton'

export type ChakraUIKit =
  & UIKitCorePrimitives<ReactNode>
  & Required<Pick<UIKitExtendedPrimitives<ReactNode>, ImplementedExtendedPrimitives>>

export const chakraUIKit: ChakraUIKit = {
  FieldRoot({ invalid, required, disabled, readOnly, validating, children }) {
    return (
      <Field.Root
        invalid={invalid}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        data-validating={validating || undefined}
        css={validating
          ? { '& input, & textarea, & select': { borderColor: 'blue.200', _focus: { borderColor: 'blue.400' } } }
          : undefined}
      >
        {children}
      </Field.Root>
    )
  },

  FieldLabel({ label, required, tooltip }) {
    return <FieldLabel label={label} required={required} tooltip={tooltip} />
  },

  FieldError({ hasError, errorMessage, helperText, isValidating }) {
    return (
      <FieldError
        hasError={hasError}
        errorMessage={errorMessage ?? ''}
        helperText={helperText}
        isValidating={isValidating}
      />
    )
  },

  Input({
    value,
    onChange,
    onBlur,
    type,
    inputMode,
    placeholder,
    maxLength,
    minLength,
    pattern,
    autoComplete,
    disabled,
    readOnly,
    size,
    ...rest
  }) {
    return (
      <ChakraInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        type={type}
        inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
        placeholder={placeholder}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        autoComplete={autoComplete}
        disabled={disabled}
        readOnly={readOnly}
        size={(size as 'xs' | 'sm' | 'md' | 'lg') ?? 'md'}
        data-field-name={rest['data-field-name']}
      />
    )
  },

  Checkbox({ checked, onCheckedChange, onBlur, disabled, readOnly, label, colorPalette, size, ...rest }) {
    return (
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(e) => onCheckedChange(!!e.checked)}
        colorPalette={colorPalette ?? 'brand'}
        size={(size as 'sm' | 'md' | 'lg') ?? 'md'}
        disabled={disabled}
        readOnly={readOnly}
        // WCAG 2.5.5 — минимум 44×44 CSS px кликабельной области, Checkbox.Root без
        // этого рендерит ~20px (высота самого квадратика)
        minH="2.75rem"
        alignItems="center"
        data-field-name={rest['data-field-name']}
      >
        <Checkbox.HiddenInput onBlur={onBlur} />
        <Checkbox.Control />
        {label && <Checkbox.Label>{label}</Checkbox.Label>}
      </Checkbox.Root>
    )
  },

  Select({
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
    size,
    variant,
    readOnly,
    renderOptionActions,
    controlActions,
    listFooter,
    controlRef,
    onEditHotkey,
    editHotkeyHint,
    emptyContent,
    search,
    loading,
    loadingMessage,
    ...rest
  }): ReactElement {
    // Управляемое открытие: поле закрывает список перед окном приложения (`controlRef.close`)
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const highlightedRef = useRef<string | null>(null)
    const hintId = useId()
    const listId = useId()
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
    // Закрытие сбрасывает поиск (любым путём: выбор, Escape, клик снаружи, `controlRef.close`)
    useEffect(() => {
      if (!open && search && search.query !== '') {
        search.onQueryChange('')
      }
    }, [open, search])
    // Группировка — та же framework-free логика, что использует `useGroupedOptions` для
    // Combobox/Listbox (`use-grouped-options.ts`) — вынесена в `@letar/forms-core/uikit`.
    // Здесь остаётся только Chakra-специфичная обвязка (`createListCollection`).
    // Поиск: `options` — полный список (по нему `selected`, «пустой вариант», подпись в триггере),
    // в списке и коллекции — только прошедшие фильтр; группы строятся из оставшихся
    const visibleOptions = useMemo(
      () => (search ? options.filter((opt) => search.visibleValues.has(String(opt.value))) : options),
      [options, search],
    )
    const groups = useMemo(() => groupOptions(visibleOptions), [visibleOptions])
    // Первая доступная опция в порядке отображения — её подсвечивает поле поиска
    const firstVisibleValue = useMemo(() => {
      const ordered = groups ? Array.from(groups.values()).flat() : visibleOptions
      return ordered.find((opt) => !opt.disabled && !opt.pending)?.value
    }, [groups, visibleOptions])

    // `''` — «ничего не выбрано», если такой опции нет, и настоящее значение, если есть
    // («Все категории» в фильтрах). Прежнее `value ? [value] : []` превращало его в `[]`, и
    // селект оставался пустым при выбранной опции.
    const hasEmptyOption = options.some((opt) => opt.value === '')
    const selected = value !== undefined && value !== null && (value !== '' || hasEmptyOption) ? [value] : []

    const collection = useMemo(
      () =>
        createListCollection({
          items: visibleOptions,
          itemToString: (item: (typeof options)[number]) => getOptionText(item),
          itemToValue: (item: (typeof options)[number]) => item.value,
          // Опция в ожидании подтверждения (§16.7) не выбирается ни мышью, ни клавиатурой, ни typeahead
          isItemDisabled: (item: (typeof options)[number]) => !!(item.disabled || item.pending),
          ...(groups && { groupBy: (item: (typeof options)[number]) => item.group ?? '' }),
        }),
      [visibleOptions, groups],
    )

    // Содержимое пункта: своё (`renderOption`) или label как есть (узел не сплющивается в строку)
    const renderItemContent = (opt: (typeof options)[number]) =>
      renderOption
        ? renderOption(opt, {
          selected: selected[0] === opt.value,
          disabled: opt.disabled ?? false,
          pending: opt.pending ?? false,
        })
        : opt.label

    // Подпись выбранного в триггере: `renderValue`; пустой результат — откат к строке опции
    const selectedOption = selected.length > 0 ? options.find((opt) => opt.value === selected[0]) : undefined
    const customValue = selectedOption && renderValue ? renderValue(selectedOption) : undefined
    const hasCustomValue = customValue !== undefined && customValue !== null && customValue !== false
      && customValue !== ''
    // Значение уже есть, а его опция ещё грузится: в триггере — текст загрузки, а не пустой placeholder
    const showLoadingValue = !!loading && !!loadingMessage && selected.length > 0 && !selectedOption

    // Пункты списка (с группами или плоские); в режиме поиска — внутри `Select.List`
    const itemsContent = groups
      ? Array.from(groups.entries()).map(([groupName, groupItems]) => (
        <ChakraSelect.ItemGroup key={groupName}>
          {groupName && <ChakraSelect.ItemGroupLabel>{groupName}</ChakraSelect.ItemGroupLabel>}
          {groupItems.map((opt) => (
            <ChakraSelect.Item item={opt} key={opt.value} data-pending={opt.pending ? '' : undefined}>
              <ChakraSelect.ItemText>{renderItemContent(opt)}</ChakraSelect.ItemText>
              {opt.pending ? <Spinner size="xs" /> : renderOptionActions?.(opt)}
              <ChakraSelect.ItemIndicator />
            </ChakraSelect.Item>
          ))}
        </ChakraSelect.ItemGroup>
      ))
      : visibleOptions.map((opt) => (
        <ChakraSelect.Item item={opt} key={opt.value} data-pending={opt.pending ? '' : undefined}>
          <ChakraSelect.ItemText>{renderItemContent(opt)}</ChakraSelect.ItemText>
          {opt.pending ? <Spinner size="xs" /> : renderOptionActions?.(opt)}
          <ChakraSelect.ItemIndicator />
        </ChakraSelect.Item>
      ))

    return (
      <ChakraSelect.Root
        collection={collection}
        size={(size as 'sm' | 'md' | 'lg') ?? 'md'}
        variant={(variant as 'outline' | 'subtle') ?? 'outline'}
        value={selected}
        onValueChange={(details) => onValueChange(details.value[0] as string | undefined)}
        onInteractOutside={onBlur}
        disabled={disabled}
        readOnly={readOnly}
        open={open}
        // С полем поиска фокус остаётся в нём: listbox переезжает с Content на `Select.List`
        composite={search ? false : undefined}
        onOpenChange={(details) => setOpen(details.open)}
        onHighlightChange={(details) => {
          highlightedRef.current = details.highlightedValue
        }}
        data-field-name={rest['data-field-name']}
      >
        <ChakraSelect.HiddenSelect />
        {label && (
          <ChakraSelect.Label>
            <HStack gap={1}>{label}</HStack>
          </ChakraSelect.Label>
        )}
        <ChakraSelect.Control>
          <ChakraSelect.Trigger
            ref={triggerRef}
            pe={controlActions ? (clearable ? '5.5rem' : '4rem') : undefined}
            // Выбранное значение ждёт сервера (§16.7): подпись уже новая, спиннер рядом
            aria-busy={selectedOption?.pending ? true : undefined}
            aria-keyshortcuts={onEditHotkey ? 'F2' : undefined}
            aria-describedby={onEditHotkey && editHotkeyHint ? hintId : undefined}
            onKeyDown={onEditHotkey
              ? (event) => {
                // Закрытый список: F2 правит выбранное значение
                if (event.key === 'F2' && !open && selected[0] !== undefined && selected[0] !== '') {
                  event.preventDefault()
                  onEditHotkey(String(selected[0]), 'value')
                }
              }
              : undefined}
          >
            <ChakraSelect.ValueText placeholder={placeholder}>
              {/* В режиме поиска выбранной опции может не быть в отфильтрованной коллекции: подпись даём сами */}
              {hasCustomValue
                ? customValue
                : showLoadingValue
                ? loadingMessage
                : search && selectedOption
                ? getOptionText(selectedOption)
                : undefined}
            </ChakraSelect.ValueText>
          </ChakraSelect.Trigger>
          <ChakraSelect.IndicatorGroup>
            {(loading || selectedOption?.pending) && <Spinner size="xs" />}
            {clearable && <ChakraSelect.ClearTrigger />}
            {controlActions && (
              // IndicatorGroup не принимает клики (pointer-events: none) — кнопке возвращаем их
              <Box display="flex" alignItems="center" pointerEvents="auto">{controlActions}</Box>
            )}
            <ChakraSelect.Indicator />
          </ChakraSelect.IndicatorGroup>
        </ChakraSelect.Control>
        {onEditHotkey && editHotkeyHint && <Box id={hintId} srOnly>{editHotkeyHint}</Box>}
        <Portal>
          <ChakraSelect.Positioner>
            <ChakraSelect.Content
              // Роль dialog (composite: false) получает имя от метки; без метки — своё
              aria-label={search && !label ? search.ariaLabel : undefined}
              onKeyDown={onEditHotkey
                ? (event) => {
                  // Открытый список: F2 правит подсвеченный пункт
                  const value = highlightedRef.current
                  if (event.key === 'F2' && value) {
                    event.preventDefault()
                    onEditHotkey(value, 'option')
                  }
                }
                : undefined}
            >
              {search && <SelectSearchField search={search} listId={listId} firstValue={firstVisibleValue} />}
              {loading && visibleOptions.length === 0 && loadingMessage && (
                <Box px={3} py={2} color="fg.muted" fontSize="sm">{loadingMessage}</Box>
              )}
              {search && emptyContent}
              {search
                ? (
                  // tabIndex={-1}: иначе Tab из поля поиска остановится на самом списке
                  <ChakraSelect.List id={listId} tabIndex={-1}>{itemsContent}</ChakraSelect.List>
                )
                : itemsContent}
              {listFooter && (
                <Box position="sticky" bottom={0} bg="bg.panel" borderTopWidth="1px" mt={1} pt={1}>{listFooter}</Box>
              )}
            </ChakraSelect.Content>
          </ChakraSelect.Positioner>
        </Portal>
      </ChakraSelect.Root>
    )
  },

  // === Extended primitives (Фаза 7.3) ===
  // Added when the composition-layer audit found Chakra wired in below the field level:
  // error boundaries, list buttons and tooltips all reached for Chakra directly, bypassing
  // the contract established in Этап 4.

  Tooltip(props) {
    return <FieldTooltip {...props} />
  },

  RequiredIndicator() {
    return <Field.RequiredIndicator />
  },

  ErrorFallback({ fieldName, message }) {
    return (
      <Box p={3} borderWidth="1px" borderColor="red.500" borderRadius="md" bg="red.50" _dark={{ bg: 'red.950' }}>
        <Text color="red.600" _dark={{ color: 'red.300' }} fontSize="sm">
          Ошибка в поле &quot;{fieldName}&quot;: {message}
        </Text>
      </Box>
    )
  },

  Button({ children, onClick, disabled, loading, type, variant, size, tone }) {
    return (
      <ChakraButton
        type={type ?? 'button'}
        onClick={onClick}
        disabled={disabled}
        loading={loading}
        variant={(variant as 'outline' | 'solid' | 'ghost' | 'subtle') ?? 'outline'}
        size={(size as 'xs' | 'sm' | 'md' | 'lg') ?? 'sm'}
        colorPalette={toneToColorPalette(tone)}
      >
        {children}
      </ChakraButton>
    )
  },

  IconButton({ children, onClick, disabled, type, variant, size, tone, ...rest }) {
    return (
      <ChakraIconButton
        type={type ?? 'button'}
        onClick={onClick}
        disabled={disabled}
        variant={(variant as 'outline' | 'solid' | 'ghost' | 'subtle') ?? 'outline'}
        size={(size as 'xs' | 'sm' | 'md' | 'lg') ?? 'sm'}
        colorPalette={toneToColorPalette(tone)}
        aria-label={rest['aria-label']}
      >
        {children}
      </ChakraIconButton>
    )
  },
}
