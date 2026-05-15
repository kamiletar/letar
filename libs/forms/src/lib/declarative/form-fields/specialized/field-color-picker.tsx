'use client'

import { ColorPicker, Field, HStack, parseColor, Portal } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { createField, FieldError } from '../base'
import { FieldTooltip } from '../base/field-tooltip'

/**
 * Props for ColorPicker field
 */
export interface ColorPickerFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  /** Tooltip for field label */
  tooltip?: FieldTooltipMeta
  /** Color palette for quick selection */
  swatches?: string[]
  /** Size (by default: md) */
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Show area picker (saturation/brightness) (by default: true) */
  showArea?: boolean
  /** Show eyedropper button (by default: true) */
  showEyeDropper?: boolean
  /** Show hue/alpha sliders (by default: true) */
  showSliders?: boolean
  /** Show hex input (by default: true) */
  showInput?: boolean
}

/**
 * Default palette
 */
const defaultSwatches = [
  '#000000',
  '#4A5568',
  '#F56565',
  '#ED64A6',
  '#9F7AEA',
  '#6B46C1',
  '#4299E1',
  '#0BC5EA',
  '#38B2AC',
  '#48BB78',
  '#ECC94B',
  '#DD6B20',
]

/**
 * Form.Field.ColorPicker - Color selection with picker
 *
 * Renders color picker with optional palette, area picker,
 * sliders and hex input.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.ColorPicker
 *   name="color"
 *   label="Select color"
 * />
 * ```
 *
 * @example With custom palette
 * ```tsx
 * <Form.Field.ColorPicker
 *   name="brandColor"
 *   label="Brand color"
 *   swatches={['#FF0000', '#00FF00', '#0000FF']}
 * />
 * ```
 *
 * @example Minimal (palette only)
 * ```tsx
 * <Form.Field.ColorPicker
 *   name="accent"
 *   showArea={false}
 *   showSliders={false}
 *   showInput={false}
 *   swatches={['#FF0000', '#00FF00', '#0000FF', '#FFFF00']}
 * />
 * ```
 */
export const FieldColorPicker = createField<ColorPickerFieldProps, string>({
  displayName: 'FieldColorPicker',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const {
      swatches = defaultSwatches,
      size = 'md',
      showArea = true,
      showEyeDropper = true,
      showSliders = true,
      showInput = true,
    } = componentProps

    const currentValue = (field.state.value as string) || '#000000'

    // Parse color safely
    let parsedColor
    try {
      parsedColor = parseColor(currentValue)
    } catch {
      parsedColor = parseColor('#000000')
    }

    return (
      <Field.Root
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
      >
        <ColorPicker.Root
          value={parsedColor}
          onValueChange={(details) => {
            // Use valueAsString which is already in correct format
            field.handleChange(details.valueAsString)
          }}
          disabled={resolved.disabled}
          readOnly={resolved.readOnly}
          size={size}
        >
          <ColorPicker.HiddenInput name={fullPath} />

          {resolved.label && (
            <ColorPicker.Label>
              {resolved.tooltip ? (
                <HStack gap={1}>
                  <span>{resolved.label}</span>
                  <FieldTooltip {...resolved.tooltip} />
                </HStack>
              ) : (
                resolved.label
              )}
              {resolved.required && <Field.RequiredIndicator />}
            </ColorPicker.Label>
          )}

          <ColorPicker.Control>
            {showInput && <ColorPicker.ChannelInput channel="hex" />}
            <ColorPicker.Trigger />
          </ColorPicker.Control>

          <Portal>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                {showArea && <ColorPicker.Area />}

                {(showEyeDropper || showSliders) && (
                  <HStack>
                    {showEyeDropper && <ColorPicker.EyeDropper size="xs" variant="outline" />}
                    {showSliders && <ColorPicker.Sliders />}
                  </HStack>
                )}

                {swatches.length > 0 && (
                  <ColorPicker.SwatchGroup>
                    {swatches.map((swatch) => (
                      <ColorPicker.SwatchTrigger key={swatch} value={swatch}>
                        <ColorPicker.Swatch value={swatch} boxSize="4.5" />
                      </ColorPicker.SwatchTrigger>
                    ))}
                  </ColorPicker.SwatchGroup>
                )}
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </Portal>
        </ColorPicker.Root>

        <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </Field.Root>
    )
  },
})
