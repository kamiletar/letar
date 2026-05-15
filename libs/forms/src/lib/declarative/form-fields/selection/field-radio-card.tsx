'use client'

import { Field, RadioCard } from '@chakra-ui/react'
import { type KeyboardEvent, type ReactElement, useCallback } from 'react'
import type { BaseFieldProps, FieldSizeWithoutXs, FieldTooltipMeta, RichOption } from '../../types'
import { createField, FieldError, SelectionFieldLabel } from '../base'

/**
 * Props for RadioCard field
 */
export interface RadioCardFieldProps<T = string> extends Omit<BaseFieldProps, 'placeholder'> {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Options for cards */
  options: RichOption<T>[]
  /** Size (by default: md) */
  size?: FieldSizeWithoutXs
  /** Visual variant (by default: outline) */
  variant?: 'surface' | 'subtle' | 'outline' | 'solid'
  /** Color palette */
  colorPalette?: string
  /** Content alignment (by default: start) */
  align?: 'start' | 'end' | 'center'
  /** Orientation (by default: horizontal) */
  orientation?: 'horizontal' | 'vertical'
  /** Gap between cards (by default: 2) */
  gap?: number | string
  /** Enable enhanced keyboard navigation with cycling (by default: false) */
  keyboardNavigation?: boolean
}

/** State type for useFieldState */
interface RadioCardFieldState {
  enabledOptions: RichOption[]
  handleKeyDown: (
    e: KeyboardEvent<HTMLDivElement>,
    currentValue: string | undefined,
    handleChange: (value: string) => void
  ) => void
}

/**
 * Form.Field.RadioCard - Single selection as cards
 *
 * Renders a group of radio cards for selecting one option.
 * Each card can have a label, description and icon.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.RadioCard
 *   name="plan"
 *   label="Select plan"
 *   options={[
 *     { label: 'Free', value: 'free', description: 'Basic features' },
 *     { label: 'Pro', value: 'pro', description: 'All features' },
 *     { label: 'Enterprise', value: 'enterprise', description: 'Customization' },
 *   ]}
 * />
 * ```
 *
 * @example With icons
 * ```tsx
 * <Form.Field.RadioCard
 *   name="role"
 *   options={[
 *     { label: 'Admin', value: 'admin', icon: <ShieldIcon /> },
 *     { label: 'User', value: 'user', icon: <UserIcon /> },
 *   ]}
 *   align="center"
 * />
 * ```
 */
export const FieldRadioCard = createField<RadioCardFieldProps, string, RadioCardFieldState>({
  displayName: 'FieldRadioCard',
  useFieldState: (componentProps): RadioCardFieldState => {
    // Get only enabled options for keyboard navigation
    const enabledOptions = componentProps.options.filter((opt) => !opt.disabled)

    // Handle keyboard navigation with cycling
    const handleKeyDown = useCallback(
      (
        e: KeyboardEvent<HTMLDivElement>,
        currentValue: string | undefined,
        handleChange: (value: string) => void
      ): void => {
        if (!componentProps.keyboardNavigation || enabledOptions.length === 0) {
          return
        }

        const isHorizontal = (componentProps.orientation ?? 'horizontal') === 'horizontal'
        const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
        const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'

        if (e.key !== prevKey && e.key !== nextKey) {
          return
        }

        e.preventDefault()

        const currentIndex = currentValue ? enabledOptions.findIndex((opt) => opt.value === currentValue) : -1

        let newIndex: number

        if (e.key === nextKey) {
          // Forward (cycle to first if at end)
          newIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabledOptions.length
        } else {
          // Back (cycle to last if at beginning)
          newIndex =
            currentIndex === -1
              ? enabledOptions.length - 1
              : (currentIndex - 1 + enabledOptions.length) % enabledOptions.length
        }

        handleChange(enabledOptions[newIndex].value)
      },
      [componentProps.keyboardNavigation, enabledOptions, componentProps.orientation]
    )

    return { enabledOptions, handleKeyDown }
  },
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const currentValue = field.state.value as string | undefined

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <RadioCard.Root
          value={currentValue ?? ''}
          onValueChange={(details) => field.handleChange(details.value)}
          onKeyDown={
            componentProps.keyboardNavigation
              ? (e) => fieldState.handleKeyDown(e, currentValue, field.handleChange)
              : undefined
          }
          disabled={resolved.disabled}
          name={fullPath}
          size={componentProps.size ?? 'md'}
          variant={componentProps.variant ?? 'outline'}
          colorPalette={componentProps.colorPalette}
          align={componentProps.align ?? 'start'}
          orientation={componentProps.orientation ?? 'horizontal'}
          gap={componentProps.gap ?? 2}
        >
          {resolved.label && (
            <RadioCard.Label>
              <SelectionFieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
            </RadioCard.Label>
          )}

          {componentProps.options.map((opt) => (
            <RadioCard.Item key={opt.value} value={opt.value} disabled={opt.disabled}>
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  {opt.icon}
                  <RadioCard.ItemText>{opt.label}</RadioCard.ItemText>
                  {opt.description && <RadioCard.ItemDescription>{opt.description}</RadioCard.ItemDescription>}
                </RadioCard.ItemContent>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RadioCard.Item>
          ))}
        </RadioCard.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
