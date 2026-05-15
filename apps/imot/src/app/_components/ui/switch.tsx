'use client'

import { Switch as ChakraSwitch } from '@chakra-ui/react'
import * as React from 'react'

export interface SwitchProps extends ChakraSwitch.RootProps {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  rootRef?: React.RefObject<HTMLLabelElement | null>
  trackLabel?: { on: React.ReactNode; off: React.ReactNode }
  thumbLabel?: { on: React.ReactNode; off: React.ReactNode }
}

/**
 * Switch component - переключатель для бинарных значений
 *
 * @example
 * // Базовое использование
 * <Switch defaultChecked>Включить уведомления</Switch>
 *
 * @example
 * // Контролируемый компонент
 * <Switch
 *   checked={isEnabled}
 *   onCheckedChange={(e) => setIsEnabled(e.checked)}
 * >
 *   Включить функцию
 * </Switch>
 *
 * @example
 * // С именем для формы
 * <Switch name="emailNotifications" defaultChecked={true}>
 *   Email уведомления
 * </Switch>
 */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(props, ref) {
  const { inputProps, children, rootRef, trackLabel, thumbLabel, ...rest } = props

  return (
    <ChakraSwitch.Root ref={rootRef} {...rest}>
      <ChakraSwitch.HiddenInput ref={ref} {...inputProps} />
      <ChakraSwitch.Control>
        <ChakraSwitch.Thumb>
          {thumbLabel && (
            <ChakraSwitch.ThumbIndicator fallback={thumbLabel?.off}>{thumbLabel?.on}</ChakraSwitch.ThumbIndicator>
          )}
        </ChakraSwitch.Thumb>
        {trackLabel && <ChakraSwitch.Indicator fallback={trackLabel.off}>{trackLabel.on}</ChakraSwitch.Indicator>}
      </ChakraSwitch.Control>
      {children !== null && <ChakraSwitch.Label>{children}</ChakraSwitch.Label>}
    </ChakraSwitch.Root>
  )
})
