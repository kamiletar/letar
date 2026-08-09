'use client'

import {
  Checkbox,
  createListCollection,
  Field,
  HStack,
  Input as ChakraInput,
  Portal,
  Select as ChakraSelect,
} from '@chakra-ui/react'
import type { UIKit } from '@letar/forms-core/uikit'
import type { ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'
import { FieldError } from './create-field'
import { FieldLabel } from './field-label'

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
export const chakraUIKit: UIKit<ReactNode> = {
  FieldRoot({ invalid, required, disabled, readOnly, children }) {
    return (
      <Field.Root invalid={invalid} required={required} disabled={disabled} readOnly={readOnly}>
        {children}
      </Field.Root>
    )
  },

  FieldLabel({ label, required }) {
    return <FieldLabel label={label} required={required} />
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
    label,
    placeholder,
    disabled,
    clearable,
    size,
    variant,
    ...rest
  }): ReactElement {
    const collection = useMemo(
      () =>
        createListCollection({
          items: options,
          itemToString: (item) => (typeof item.label === 'string' ? item.label : item.value),
          itemToValue: (item) => item.value,
        }),
      [options],
    )

    return (
      <ChakraSelect.Root
        collection={collection}
        size={(size as 'sm' | 'md' | 'lg') ?? 'md'}
        variant={(variant as 'outline' | 'subtle') ?? 'outline'}
        value={value ? [value] : []}
        onValueChange={(details) => onValueChange(details.value[0] as string | undefined)}
        onInteractOutside={onBlur}
        disabled={disabled}
        data-field-name={rest['data-field-name']}
      >
        <ChakraSelect.HiddenSelect />
        {label && (
          <ChakraSelect.Label>
            <HStack gap={1}>{label}</HStack>
          </ChakraSelect.Label>
        )}
        <ChakraSelect.Control>
          <ChakraSelect.Trigger>
            <ChakraSelect.ValueText placeholder={placeholder} />
          </ChakraSelect.Trigger>
          <ChakraSelect.IndicatorGroup>
            {clearable && <ChakraSelect.ClearTrigger />}
            <ChakraSelect.Indicator />
          </ChakraSelect.IndicatorGroup>
        </ChakraSelect.Control>
        <Portal>
          <ChakraSelect.Positioner>
            <ChakraSelect.Content>
              {options.map((opt) => (
                <ChakraSelect.Item item={opt} key={opt.value}>
                  {opt.label}
                  <ChakraSelect.ItemIndicator />
                </ChakraSelect.Item>
              ))}
            </ChakraSelect.Content>
          </ChakraSelect.Positioner>
        </Portal>
      </ChakraSelect.Root>
    )
  },
}
