'use client'

import { Field, For, HStack, Slider } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { createField, FieldError } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Slider mark definition
 */
export interface SliderMark {
  /** Value on the scale */
  value: number
  /** Mark text */
  label?: ReactNode
}

/**
 * Props for Slider field
 */
export interface SliderFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Minimum value (by default: 0) */
  min?: number
  /** Maximum value (by default: 100) */
  max?: number
  /** Step (by default: 1) */
  step?: number
  /** Show current value next to label */
  showValue?: boolean
  /** Orientation (by default: horizontal) */
  orientation?: 'horizontal' | 'vertical'
  /** Size (by default: md) */
  size?: 'sm' | 'md' | 'lg'
  /** Variant (by default: outline) */
  variant?: 'outline' | 'solid'
  /** Color palette */
  colorPalette?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'cyan' | 'purple' | 'pink'
  /** Marks on slider track */
  marks?: (number | SliderMark)[]
  /** Fill origin point (by default: start) */
  origin?: 'start' | 'center' | 'end'
  /** Callback on value change */
  onValueChange?: (value: number) => void
  /** Callback when drag ends */
  onValueChangeEnd?: (value: number) => void
}

/**
 * Form.Field.Slider - Slider field
 *
 * Renders Chakra Slider with automatic form integration.
 * Form value is stored as number.
 *
 * Automatically extracts from Zod schema:
 * - `min` from `z.number().min(1)` → min={1}
 * - `max` from `z.number().max(100)` → max={100}
 * - `step` from `z.number().int()` → step={1}, or `z.number().multipleOf(0.5)` → step={0.5}
 * - `helperText` automatically is generated from constraints ("From 1 to 100")
 *
 * Props always take priority over automatic values from schema.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.Slider name="volume" label="Volume" />
 * ```
 *
 * @example With automatic constraints from Zod
 * ```tsx
 * // In schema: z.object({ rating: z.number().min(1).max(10) })
 * <Form.Field.Slider name="rating" label="Rating" showValue />
 * // Automatically: min={1} max={10} helperText="From 1 to 10"
 * ```
 *
 * @example With marks
 * ```tsx
 * <Form.Field.Slider
 *   name="rating"
 *   label="Rating"
 *   min={0}
 *   max={100}
 *   marks={[0, 25, 50, 75, 100]}
 * />
 * ```
 */
export const FieldSlider = createField<SliderFieldProps, number>({
  displayName: 'FieldSlider',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { constraints } = resolved

    // Props take priority over constraints, then defaults
    const min = componentProps.min ?? constraints.number?.min ?? 0
    const max = componentProps.max ?? constraints.number?.max ?? 100
    const step = componentProps.step ?? constraints.number?.step ?? 1

    const {
      showValue,
      orientation = 'horizontal',
      size = 'md',
      variant = 'outline',
      colorPalette,
      marks,
      origin,
      onValueChange,
      onValueChangeEnd,
    } = componentProps

    // Normalize marks to array of objects
    const normalizedMarks = marks?.map((mark) => (typeof mark === 'number' ? { value: mark, label: undefined } : mark))

    // Convert number to array for Slider
    const numValue = (field.state.value as number) ?? min
    const arrayValue = [numValue]

    const handleValueChange = (details: { value: number[] }) => {
      const newValue = details.value[0] ?? min
      field.handleChange(newValue)
      onValueChange?.(newValue)
    }

    const handleValueChangeEnd = (details: { value: number[] }) => {
      const newValue = details.value[0] ?? min
      onValueChangeEnd?.(newValue)
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <Slider.Root
          value={arrayValue}
          onValueChange={handleValueChange}
          onValueChangeEnd={handleValueChangeEnd}
          min={min}
          max={max}
          step={step}
          orientation={orientation}
          size={size}
          variant={variant}
          colorPalette={colorPalette}
          origin={origin}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          invalid={hasError}
          thumbAlignment="center"
          onBlur={field.handleBlur}
          data-field-name={fullPath}
        >
          {resolved.label && !showValue && (
            <Slider.Label>
              {resolved.tooltip ? (
                <HStack gap={1}>
                  <span>{resolved.label}</span>
                  <FieldTooltip {...resolved.tooltip} />
                </HStack>
              ) : (
                resolved.label
              )}
            </Slider.Label>
          )}
          {resolved.label && showValue && (
            <HStack justify="space-between">
              <Slider.Label>
                {resolved.tooltip ? (
                  <HStack gap={1}>
                    <span>{resolved.label}</span>
                    <FieldTooltip {...resolved.tooltip} />
                  </HStack>
                ) : (
                  resolved.label
                )}
              </Slider.Label>
              <Slider.ValueText />
            </HStack>
          )}
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <For each={arrayValue}>
              {(_, index) => (
                <Slider.Thumb key={index} index={index}>
                  <Slider.HiddenInput />
                </Slider.Thumb>
              )}
            </For>
            {normalizedMarks && normalizedMarks.length > 0 && (
              <Slider.MarkerGroup>
                {normalizedMarks.map((mark, index) => (
                  <Slider.Marker key={index} value={mark.value}>
                    <Slider.MarkerIndicator />
                    {mark.label}
                  </Slider.Marker>
                ))}
              </Slider.MarkerGroup>
            )}
          </Slider.Control>
        </Slider.Root>
        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
