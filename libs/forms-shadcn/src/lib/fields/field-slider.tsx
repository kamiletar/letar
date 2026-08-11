'use client'

import * as SliderPrimitive from '@radix-ui/react-slider'
import type { ReactElement } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { cn } from '@letar/tailwind-utils'
import type { SliderFieldProps } from './types'

/**
 * Form.Field.Slider — shadcn-скин (`@radix-ui/react-slider`).
 *
 * Не входит в UIKit-контракт (нет `Slider` в `UIKitExtendedPrimitives`) — та же причина, что
 * у `Switch`: рисуется напрямую, не через примитив.
 */
export const FieldSlider = createField<SliderFieldProps, number>({
  displayName: 'FieldSlider',
  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps }): ReactElement => {
    const min = componentProps.min ?? 0
    const max = componentProps.max ?? 100
    const step = componentProps.step ?? 1
    const value = (field.state.value as number) ?? min

    return (
      <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
        <div className="flex items-center justify-between">
          <shadcnUIKit.FieldLabel label={resolved.label} required={resolved.required} tooltip={resolved.tooltip} />
          {componentProps.showValue && <span className="text-muted-foreground text-sm">{value}</span>}
        </div>
        <SliderPrimitive.Root
          data-slot="slider"
          value={[value]}
          onValueChange={([next]) => field.handleChange(next ?? min)}
          onValueCommit={() => field.handleBlur()}
          min={min}
          max={max}
          step={step}
          disabled={resolved.disabled}
          data-field-name={fullPath}
          className="relative flex h-4 w-full touch-none items-center select-none"
        >
          <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full">
            <SliderPrimitive.Range className="bg-primary absolute h-full" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              'border-primary bg-background block size-4 rounded-full border shadow transition-colors outline-none',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          />
        </SliderPrimitive.Root>
        <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
      </shadcnUIKit.FieldRoot>
    )
  },
})
