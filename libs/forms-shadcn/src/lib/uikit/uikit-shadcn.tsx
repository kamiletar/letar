'use client'

import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { Check, ChevronDown, Circle, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '../utils/cn'

/**
 * shadcn-реализация `UIKit`-контракта из `forms-core` (Фаза 7.3, Шаг 5).
 *
 * Прямые Radix-примитивы + `cva`/`tailwind-merge`, не `shadcn` CLI — решение задокументировано
 * в `libs/forms/PLAN.md` (§7.3, Шаг 5). Композиционный слой (`createField`, `FieldWrapper`,
 * `FieldErrorBoundary`) не отличает, откуда пришёл UIKit — `@letar/forms-react`.
 *
 * Реализованы только core-примитивы + минимум extended, нужный `createFieldPrimitives`
 * (`ErrorFallback`) — beta покрывает 3 поля (String/Checkbox/Select), не весь контракт.
 */
type ImplementedExtendedPrimitives =
  | 'ErrorFallback'
  | 'NumberInput'
  | 'RadioGroup'
  | 'SegmentGroup'
  | 'NativeSelect'
  | 'Combobox'

export type ShadcnUIKit =
  & UIKitCorePrimitives<ReactNode>
  & Required<Pick<UIKitExtendedPrimitives<ReactNode>, ImplementedExtendedPrimitives>>

export const shadcnUIKit: ShadcnUIKit = {
  FieldRoot({ invalid, disabled, children }) {
    return (
      <div
        data-slot="field-root"
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className="space-y-2"
      >
        {children}
      </div>
    )
  },

  FieldLabel({ label, required, tooltip }) {
    if (!label) { return null }
    return (
      <LabelPrimitive.Root
        data-slot="field-label"
        className="flex items-center gap-1 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
        {tooltip && (
          <span className="text-muted-foreground cursor-help text-xs" title={tooltip.description}>
            (?)
          </span>
        )}
      </LabelPrimitive.Root>
    )
  },

  FieldError({ hasError, errorMessage, helperText }) {
    if (hasError && errorMessage) {
      return (
        <p data-slot="field-error" role="alert" className="text-destructive text-sm">
          {errorMessage}
        </p>
      )
    }
    if (helperText) {
      return (
        <p data-slot="field-helper" className="text-muted-foreground text-sm">
          {helperText}
        </p>
      )
    }
    return null
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
    ...rest
  }) {
    return (
      <input
        data-slot="input"
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
        data-field-name={rest['data-field-name']}
        className={cn(
          'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
      />
    )
  },

  Checkbox({ checked, onCheckedChange, onBlur, disabled, readOnly, label, ...rest }) {
    return (
      <label className="flex items-center gap-2">
        <CheckboxPrimitive.Root
          data-slot="checkbox"
          checked={checked}
          onCheckedChange={(state) => onCheckedChange(state === true)}
          onBlur={onBlur}
          disabled={disabled || readOnly}
          data-field-name={rest['data-field-name']}
          className={cn(
            'border-input peer size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-shadow',
            'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Check className="size-3.5" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && <span className="text-sm">{label}</span>}
      </label>
    )
  },

  Select({ value, onValueChange, onBlur, options, label, placeholder, disabled, clearable, ...rest }) {
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
          <SelectPrimitive.Value placeholder={placeholder} />
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
                  className={cn(
                    'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
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
  },

  NumberInput({ value, onChange, onBlur, min, max, step, disabled, readOnly, ...rest }) {
    return (
      <input
        data-slot="number-input"
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
        onBlur={onBlur}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        data-field-name={rest['data-field-name']}
        className={cn(
          'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
      />
    )
  },

  RadioGroup({ value, onValueChange, options, disabled, ...rest }) {
    return (
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        data-field-name={rest['data-field-name']}
        className="flex flex-col gap-2"
      >
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <RadioGroupPrimitive.Item
              value={opt.value}
              disabled={opt.disabled}
              className={cn(
                'border-input text-primary aspect-square size-4 shrink-0 rounded-full border shadow-xs outline-none',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                <Circle className="fill-primary size-2" />
              </RadioGroupPrimitive.Indicator>
            </RadioGroupPrimitive.Item>
            {opt.label}
          </label>
        ))}
      </RadioGroupPrimitive.Root>
    )
  },

  SegmentGroup({ value, onValueChange, options, disabled, ...rest }) {
    return (
      <ToggleGroupPrimitive.Root
        data-slot="segment-group"
        type="single"
        value={value}
        onValueChange={(next) => {
          // Radix ToggleGroup снимает выбор кликом по активному элементу — контракт SegmentGroup
          // это не предполагает (одно значение всегда выбрано), поэтому пустой next игнорируется.
          if (next) { onValueChange(next) }
        }}
        disabled={disabled}
        data-field-name={rest['data-field-name']}
        className="bg-muted inline-flex items-center gap-1 rounded-md p-1"
      >
        {options.map((opt) => (
          <ToggleGroupPrimitive.Item
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              'rounded-sm px-3 py-1 text-sm outline-none transition-colors',
              'data-[state=on]:bg-background data-[state=on]:shadow-xs',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {opt.label}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
    )
  },

  NativeSelect({ value, onChange, onBlur, options, placeholder, disabled, ...rest }) {
    return (
      <select
        data-slot="native-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        data-field-name={rest['data-field-name']}
        className={cn(
          'border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  },

  Combobox({ value, inputValue, onInputChange, onValueChange, options, loading, placeholder, disabled, ...rest }) {
    const [open, setOpen] = useState(false)

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <input
            data-slot="combobox-input"
            type="text"
            role="combobox"
            aria-expanded={open}
            value={inputValue}
            onChange={(e) => {
              onInputChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            data-field-name={rest['data-field-name']}
            className={cn(
              'border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
              'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
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
            {!loading && options.length === 0 && (
              <div className="text-muted-foreground px-2 py-1.5 text-sm">Ничего не найдено</div>
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
                  'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
                  'hover:bg-accent hover:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                {opt.label}
              </div>
            ))}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  },

  ErrorFallback({ fieldName, message }) {
    return (
      <div data-slot="field-error-fallback" className="border-destructive bg-destructive/10 rounded-md border p-3">
        <p className="text-destructive text-sm">
          Ошибка в поле &quot;{fieldName}&quot;: {message}
        </p>
      </div>
    )
  },
}
