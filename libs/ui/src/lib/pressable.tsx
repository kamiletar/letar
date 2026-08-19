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

export interface PressableCtaProps extends PressableProps {
  /**
   * Радиус обёртки — обязан совпадать с реальным радиусом кнопки внутри, иначе `overflow: hidden`
   * обрежет её либо квадратными, либо слишком скруглёнными углами относительно самой кнопки.
   * Дефолта нет намеренно: значение зависит от рецепта кнопки конкретного приложения.
   */
  borderRadius: BoxProps['borderRadius']
  /** Токен цвета focus ring — должен совпадать с тем, что использует сама кнопка. */
  focusRingColorToken?: string
}

/**
 * Обёртка основной CTA-кнопки: добавляет position-aware ripple от точки клика мышью.
 *
 * Ripple — отдельный канал обратной связи: он показывает, ГДЕ нажали, тогда как `scale`
 * у кнопки показывает только САМ факт нажатия. Глубину обёртка не трогает — за неё отвечает
 * рецепт кнопки приложения.
 *
 * Применять только к кнопкам с тёмной заливкой (`colorPalette="brand"` или аналог): ripple
 * захардкожен белым полупрозрачным, на светлых поверхностях (`variant="inverted"`, `outline`)
 * он не виден. И только там, где кнопка доступна на десктопе — на тач-устройствах
 * `useRipple` не срабатывает вовсе.
 *
 * `Pressable` отсекает ripple по своим границам (`overflow: hidden`), а focus ring Chakra
 * рисуется СНАРУЖИ кнопки (`outline-offset: 2px`) — и обрезался бы целиком, потому что
 * обёртка совпадает с кнопкой по прямоугольнику. Собственный outline элемента его же
 * `overflow` не режет, поэтому ring дублируется на обёртке — теми же 2px/2px и тем же цветом,
 * что у кнопки, так что визуально он неотличим от необёрнутой. `:has(:focus-visible)`, а не
 * `_focusWithin` — иначе ring вылезал бы и на клик мышью.
 *
 * @example
 * ```tsx
 * <PressableCta borderRadius="full">
 *   <Button asChild colorPalette="brand" borderRadius="full">
 *     <NextLink href="/houses/">Посмотреть проекты</NextLink>
 *   </Button>
 * </PressableCta>
 * ```
 */
export function PressableCta(
  { children, borderRadius, focusRingColorToken = 'focus.ring', css, ...props }: PressableCtaProps,
) {
  return (
    <Pressable
      display="inline-flex"
      borderRadius={borderRadius}
      css={{
        '&:has(:focus-visible)': {
          outline: '2px solid',
          outlineColor: focusRingColorToken,
          outlineOffset: '2px',
        },
        ...css,
      }}
      {...props}
    >
      {children}
    </Pressable>
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
