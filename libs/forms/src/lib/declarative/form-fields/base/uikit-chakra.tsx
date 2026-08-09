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
  Text,
} from '@chakra-ui/react'
import type { UIKitCorePrimitives, UIKitExtendedPrimitives, UIKitTone } from '@letar/forms-core/uikit'
import type { ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'
import { FieldError } from './field-error'
import { FieldLabel } from './field-label'
import { FieldTooltip } from './field-tooltip'

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
