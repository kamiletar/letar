'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Размер canvas
 */
export interface CanvasSize {
  width: number
  height: number
}

/**
 * Опции для useCanvasEffect
 */
export interface UseCanvasEffectOptions {
  /** Вариант размера canvas */
  sizeMode: 'fullscreen' | 'scaled' | 'centered'
  /** Масштаб для 'scaled' режима (default: 0.25) */
  scale?: number
  /** Функция рендера кадра */
  renderFrame: (ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => void
  /** Callback для инициализации (создать ImageData и т.д.) */
  onInit?: (ctx: CanvasRenderingContext2D, size: CanvasSize) => void
}

/**
 * Props для useCanvasEffect
 */
export interface UseCanvasEffectProps {
  mixBlendMode: string
  /** Плавный переход при смене эффекта (в мс) */
  transitionDuration?: number
  /** Скорость анимации в мс */
  gradientDuration?: number
  /** Множитель скорости анимации */
  speedMultiplier?: number
}

/**
 * Хук для создания анимированных canvas эффектов.
 * Объединяет общую логику: resize, transition, animation loop.
 *
 * @example
 * ```tsx
 * const { canvasRef, size, canvasStyle } = useCanvasEffect(props, {
 *   sizeMode: 'fullscreen',
 *   renderFrame: (ctx, time, size) => {
 *     ctx.clearRect(0, 0, size.width, size.height)
 *     // ... render logic
 *   },
 * })
 * ```
 */
/** Результат хука useCanvasEffect */
export interface UseCanvasEffectResult {
  canvasRef: RefObject<HTMLCanvasElement | null>
  size: CanvasSize
  isVisible: boolean
  canvasStyle: React.CSSProperties
  getContext: () => CanvasRenderingContext2D | null
}

export function useCanvasEffect(props: UseCanvasEffectProps, options: UseCanvasEffectOptions): UseCanvasEffectResult {
  const { mixBlendMode, transitionDuration = 300, speedMultiplier = 1 } = props
  const { sizeMode, scale = 0.25, renderFrame, onInit } = options

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 })
  const [isVisible, setIsVisible] = useState(true)

  // Refs для анимации
  const accumulatedTimeRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const speedMultiplierRef = useRef(speedMultiplier)
  const prevMixBlendModeRef = useRef(mixBlendMode)
  const renderFrameRef = useRef(renderFrame)
  const onInitRef = useRef(onInit)

  // Обновляем refs
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier
  }, [speedMultiplier])

  useEffect(() => {
    renderFrameRef.current = renderFrame
  }, [renderFrame])

  useEffect(() => {
    onInitRef.current = onInit
  }, [onInit])

  // Плавный переход при смене эффекта
  useEffect(() => {
    if (prevMixBlendModeRef.current !== mixBlendMode) {
      setIsVisible(false)
      const timeout = setTimeout(() => {
        prevMixBlendModeRef.current = mixBlendMode
        setIsVisible(true)
      }, transitionDuration / 2)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [mixBlendMode, transitionDuration])

  // Обновление размера canvas
  useEffect(() => {
    const updateSize = () => {
      let newSize: CanvasSize

      switch (sizeMode) {
        case 'fullscreen':
          newSize = {
            width: window.innerWidth,
            height: window.innerHeight,
          }
          break
        case 'scaled':
          newSize = {
            width: Math.floor(window.innerWidth * scale),
            height: Math.floor(window.innerHeight * scale),
          }
          break
        case 'centered': {
          const minDim = Math.min(window.innerHeight, window.innerWidth) * 1.5
          newSize = {
            width: minDim,
            height: minDim,
          }
          break
        }
      }

      setSize(newSize)
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [sizeMode, scale])

  // Анимация
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Инициализация (если нужна)
    onInitRef.current?.(ctx, size)

    let animationFrame: number
    lastFrameTimeRef.current = performance.now()

    const animationStep = () => {
      const now = performance.now()
      const deltaTime = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      accumulatedTimeRef.current += deltaTime * speedMultiplierRef.current

      const time = accumulatedTimeRef.current / 1000

      renderFrameRef.current(ctx, time, size)

      animationFrame = requestAnimationFrame(animationStep)
    }

    animationFrame = requestAnimationFrame(animationStep)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [size])

  // Стили canvas
  const canvasStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 3,
      mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode'],
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transition: `opacity ${transitionDuration / 2}ms ease-in-out`,
    }

    if (sizeMode === 'centered') {
      return {
        ...baseStyle,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    return {
      ...baseStyle,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    }
  }, [mixBlendMode, isVisible, transitionDuration, sizeMode])

  // Функция для получения контекста (для компонентов, которым нужен доступ к ctx вне renderFrame)
  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null
  }, [])

  return {
    canvasRef,
    size,
    isVisible,
    canvasStyle,
    getContext,
  }
}
