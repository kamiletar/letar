'use client'

import { cn } from '@letar/tailwind-utils'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ReactElement } from 'react'
import { createField } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import type { SwitchFieldProps } from './types'

/**
 * Form.Field.Switch — shadcn-скин (`@radix-ui/react-switch`).
 *
 * Как и `Textarea`/`Date`, не входит в UIKit-контракт (нет `Switch` в
 * `UIKitExtendedPrimitives`) — рисуется напрямую внутри `FieldRoot`/`FieldError`, тот же
 * подход, что у Chakra-скина (`field-switch.tsx` там тоже не использует контракт).
 */
export const FieldSwitch = createField<SwitchFieldProps, boolean>({
  displayName: 'FieldSwitch',
  render: ({ field, fullPath, resolved, hasError, errorMessage }): ReactElement => (
    <shadcnUIKit.FieldRoot invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
      <label className="flex items-center gap-2">
        <SwitchPrimitive.Root
          data-slot="switch"
          checked={!!field.state.value}
          onCheckedChange={(checked) =>
            field.handleChange(checked)}
          onBlur={field.handleBlur}
          disabled={resolved.disabled}
          data-field-name={fullPath}
          className={cn(
            'bg-input focus-visible:ring-ring/50 peer inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors',
            'data-[state=checked]:bg-primary',
            'focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              'bg-background block size-4 rounded-full shadow-lg transition-transform',
              'translate-x-0.5 data-[state=checked]:translate-x-4',
            )}
          />
        </SwitchPrimitive.Root>
        {resolved.label && <span className="text-sm">{resolved.label}</span>}
      </label>
      <shadcnUIKit.FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
    </shadcnUIKit.FieldRoot>
  ),
})
