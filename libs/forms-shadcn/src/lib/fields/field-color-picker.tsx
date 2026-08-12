'use client'

import { cn } from '@letar/tailwind-utils'
import type { ReactElement } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import type { ColorPickerFieldProps } from './types'

const DEFAULT_SWATCHES = [
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
 * Form.Field.ColorPicker — shadcn-скин.
 *
 * Beta-упрощение: нативный `<input type="color">` (системный color picker браузера) + свотчи
 * + hex-инпут, а не полный Ark UI `ColorPicker.Root` с областью насыщенности/яркости,
 * hue/alpha-слайдерами и eyedropper — портировать компаунд-компонент такого объёма под
 * Radix/tailwind не в скоупе этого захода. `showArea`/`showEyeDropper`/`showSliders` из
 * Chakra-версии не имеют эквивалента здесь: системный picker браузера уже даёт то же самое
 * (область + eyedropper на большинстве платформ), просто не кастомизируемое по частям.
 */
export const FieldColorPicker = createField<ColorPickerFieldProps, string>({
  displayName: 'FieldColorPicker',

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const { swatches = DEFAULT_SWATCHES, showInput = true } = componentProps
    const currentValue = (field.state.value as string) || '#000000'

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={currentValue}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            disabled={resolved.disabled || resolved.readOnly}
            data-field-name={fullPath}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
          />
          {showInput && (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              disabled={resolved.disabled}
              readOnly={resolved.readOnly}
              className={cn(
                'border-input flex h-9 w-28 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              )}
            />
          )}
        </div>
        {swatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {swatches.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={currentValue.toLowerCase() === swatch.toLowerCase()}
                disabled={resolved.disabled || resolved.readOnly}
                onClick={() => field.handleChange(swatch)}
                style={{ backgroundColor: swatch }}
                className={cn(
                  'size-6 rounded-full border outline-none',
                  currentValue.toLowerCase() === swatch.toLowerCase()
                    ? 'ring-ring ring-2 ring-offset-1'
                    : 'border-input',
                )}
              />
            ))}
          </div>
        )}
      </FieldWrapper>
    )
  },
})
