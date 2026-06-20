'use client'

import { Button, type ButtonProps } from '@chakra-ui/react'

import { RippleEl, useRipple } from './pressable'

export interface PressableButtonProps extends Omit<ButtonProps, 'asChild'> {
  children?: React.ReactNode
}

/**
 * Кнопка с position-aware ripple (десктоп) и CSS spring-анимацией (тач).
 * НЕ поддерживает asChild — для Link-кнопок используй AppLink (per-app компонент).
 *
 * @example
 * ```tsx
 * <PressableButton variant="solid" colorPalette="blue" onClick={handleClick}>
 *   Сохранить
 * </PressableButton>
 * ```
 */
export function PressableButton({
  children,
  onPointerDown: externalOnPointerDown,
  disabled,
  loading,
  ...props
}: PressableButtonProps) {
  const { onPointerDown, ripples } = useRipple()
  const isDisabled = disabled ?? loading

  return (
    <Button
      position="relative"
      overflow="hidden"
      data-pressable
      onPointerDown={
        isDisabled
          ? undefined
          : (e) => {
              onPointerDown(e)
              externalOnPointerDown?.(e)
            }
      }
      disabled={disabled}
      loading={loading}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <RippleEl key={r.id} x={r.x} y={r.y} size={r.size} />
      ))}
    </Button>
  )
}
