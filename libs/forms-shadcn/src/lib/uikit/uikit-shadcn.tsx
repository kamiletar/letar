'use client'

import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'
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
type ImplementedExtendedPrimitives = 'ErrorFallback'

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
