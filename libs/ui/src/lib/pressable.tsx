'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

interface RippleItem {
  id: number
  x: number
  y: number
  size: number
}

/**
 * Хук для ripple-эффекта от точки клика мышью.
 * На тач-устройствах ничего не делает — там работает CSS spring через data-pressable.
 */
export function useRipple() {
  const [ripples, setRipples] = useState<RippleItem[]>([])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // рипл только для мыши, на тач работает spring через CSS
    if (e.pointerType !== 'mouse') {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.5
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = Date.now()

    setRipples((prev) => [...prev, { id, x, y, size }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
  }, [])

  return { onPointerDown, ripples }
}

/**
 * Элемент ripple-анимации — абсолютно позиционированный круг.
 * Требует кейфрейм ripple-expand в теме (используй pressableConfig).
 */
export function RippleEl({ x, y, size }: Omit<RippleItem, 'id'>) {
  return (
    <Box
      position="absolute"
      borderRadius="full"
      pointerEvents="none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: 'rgba(255,255,255,0.2)',
        animation: 'ripple-expand 0.6s ease-out forwards',
      }}
    />
  )
}

export interface PressableProps extends BoxProps {
  children: React.ReactNode
}

/**
 * Box-обёртка с position-aware ripple (десктоп) и CSS spring-анимацией (тач).
 *
 * Требует pressableConfig в defineConfig() приложения.
 *
 * @example
 * ```tsx
 * <Pressable borderRadius="md" display="inline-flex">
 *   <Button asChild>
 *     <Link href="/about">О нас</Link>
 *   </Button>
 * </Pressable>
 * ```
 */
export function Pressable({ children, onPointerDown: externalOnPointerDown, ...props }: PressableProps) {
  const { onPointerDown, ripples } = useRipple()

  return (
    <Box
      position="relative"
      overflow="hidden"
      data-pressable
      onPointerDown={(e) => {
        onPointerDown(e)
        externalOnPointerDown?.(e)
      }}
      {...props}
    >
      {children}
      {ripples.map((r) => <RippleEl key={r.id} x={r.x} y={r.y} size={r.size} />)}
    </Box>
  )
}

/**
 * Конфиг для мержа в defineConfig() приложения.
 * Подключает кейфрейм ripple-expand и глобальные стили для [data-pressable].
 *
 * @example
 * ```ts
 * import { pressableConfig } from '@letar/ui'
 *
 * defineConfig({
 *   globalCss: { ...pressableConfig.globalCss },
 *   theme: { keyframes: { ...pressableConfig.keyframes } },
 * })
 * ```
 */
export const pressableConfig = {
  keyframes: {
    'ripple-expand': {
      from: { transform: 'scale(0)', opacity: '1' },
      to: { transform: 'scale(1)', opacity: '0' },
    },
  },
  globalCss: {
    '[data-pressable]': {
      touchAction: 'manipulation',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      _active: {
        transform: 'scale(0.93)',
        transition: 'transform 0.06s ease-out',
      },
    },
  },
} as const
