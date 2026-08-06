'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface MandalaCanvasProps {
  /** URL основного изображения мандалы */
  imageUrl: string
  /** URL центрального слоя (для двуслойных мандал) */
  centerImageUrl?: string | null
  /** Квадратная мандала: вращается центр, фон статичен. Иначе наоборот */
  isSquare?: boolean
  /** Длительность полного оборота в секундах */
  spinDuration: number
  /** Пауза анимации */
  isPaused: boolean
  /** Обратное направление вращения */
  isReverse: boolean
  /** Множитель скорости от аудио-синхронизации (0.7-1.3) */
  spinSpeedMultiplier?: number
  /** Масштаб (дыхание или бит) */
  beatScale?: number
  /** Длительность crossfade при смене мандалы в секундах (0.2-10) */
  crossfadeDuration?: number
  /** Угол hue-rotate эффекта в градусах (0-360) */
  hueAngle?: number
}

/** Данные слоя для crossfade */
interface LayerData {
  bgImage: HTMLImageElement | null
  centerImage: HTMLImageElement | null
  isSquare: boolean
}

/**
 * Canvas-компонент для рендеринга вращающейся мандалы.
 * Использует requestAnimationFrame для плавной анимации.
 * Поддерживает crossfade при смене мандалы.
 */
export function MandalaCanvas({
  imageUrl,
  centerImageUrl,
  isSquare = false,
  spinDuration,
  isPaused,
  isReverse,
  spinSpeedMultiplier = 1,
  beatScale = 1,
  crossfadeDuration = 3.14,
  hueAngle = 0,
}: MandalaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Текущий и предыдущий слои для crossfade
  const currentLayerRef = useRef<LayerData>({
    bgImage: null,
    centerImage: null,
    isSquare: false,
  })
  const prevLayerRef = useRef<LayerData | null>(null)

  // Прогресс crossfade анимации (0 = prev, 1 = current)
  const crossfadeProgressRef = useRef(1)
  const crossfadeStartTimeRef = useRef<number | null>(null)

  // Текущий угол вращения (в радианах)
  const rotationRef = useRef(0)
  const lastTimestampRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number>(0)

  // Флаг для перерисовки
  const [, forceUpdate] = useState(0)

  // Загрузка основного изображения с crossfade
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Сохраняем текущий слой как предыдущий (для crossfade)
      if (currentLayerRef.current.bgImage) {
        prevLayerRef.current = { ...currentLayerRef.current }
        crossfadeProgressRef.current = 0
        crossfadeStartTimeRef.current = performance.now()
      }
      currentLayerRef.current = {
        ...currentLayerRef.current,
        bgImage: img,
        isSquare,
      }
      forceUpdate((n) => n + 1)
    }
    img.src = imageUrl
  }, [imageUrl, isSquare])

  // Загрузка центрального изображения
  useEffect(() => {
    if (centerImageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        currentLayerRef.current = {
          ...currentLayerRef.current,
          centerImage: img,
        }
        forceUpdate((n) => n + 1)
      }
      img.src = centerImageUrl
    } else {
      currentLayerRef.current = {
        ...currentLayerRef.current,
        centerImage: null,
      }
      forceUpdate((n) => n + 1)
    }
  }, [centerImageUrl])

  // Ресайз canvas под размер контейнера
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  // Функция рисования одного слоя мандалы
  const drawLayer = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      layer: LayerData,
      rotation: number,
      scale: number,
      opacity: number,
      width: number,
      height: number,
    ) => {
      if (!layer.bgImage) {
        return
      }

      const centerX = width / 2
      const centerY = height / 2

      // Вычисляем размер изображения (contain)
      const imgAspect = layer.bgImage.width / layer.bgImage.height
      const canvasAspect = width / height
      let drawWidth: number
      let drawHeight: number

      if (imgAspect > canvasAspect) {
        drawWidth = width
        drawHeight = width / imgAspect
      } else {
        drawHeight = height
        drawWidth = height * imgAspect
      }

      // Определяем что вращается
      // Для square мандал без центра: фон вращается (он же "центр")
      // Для square мандал с центром: фон статичен, центр вращается
      // Для обычных мандал: фон всегда вращается, центр статичен
      const hasCenterLayer = !!layer.centerImage
      const rotateBackground = layer.isSquare ? !hasCenterLayer : true
      const rotateCenter = hasCenterLayer && layer.isSquare

      ctx.save()
      ctx.globalAlpha = opacity

      // Рисуем фоновый слой
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.scale(scale, scale)
      if (rotateBackground) {
        ctx.rotate(rotation)
      }
      ctx.drawImage(layer.bgImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      ctx.restore()

      // Рисуем центральный слой (если есть)
      if (layer.centerImage) {
        const centerAspect = layer.centerImage.width / layer.centerImage.height
        let centerDrawWidth: number
        let centerDrawHeight: number

        if (centerAspect > canvasAspect) {
          centerDrawWidth = width
          centerDrawHeight = width / centerAspect
        } else {
          centerDrawHeight = height
          centerDrawWidth = height * centerAspect
        }

        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.scale(scale, scale)
        if (rotateCenter) {
          ctx.rotate(rotation)
        }
        // Центр чуть больше и с тенью
        ctx.scale(1.05, 1.05)
        ctx.shadowColor = 'rgba(38, 38, 38, 0.87)'
        ctx.shadowBlur = 3
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.drawImage(layer.centerImage, -centerDrawWidth / 2, -centerDrawHeight / 2, centerDrawWidth, centerDrawHeight)
        ctx.restore()
      }

      ctx.restore()
    },
    [],
  )

  // Анимационный цикл
  useEffect(() => {
    const animate = (timestamp: number) => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      // Delta time для вращения
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
      }
      const delta = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp

      // Обновление угла вращения
      if (!isPaused && spinDuration > 0) {
        const radiansPerMs = (2 * Math.PI) / (spinDuration * 1000)
        const direction = isReverse ? -1 : 1
        rotationRef.current += radiansPerMs * delta * spinSpeedMultiplier * direction
      }

      // Обновление crossfade
      if (crossfadeStartTimeRef.current !== null) {
        const elapsed = timestamp - crossfadeStartTimeRef.current
        crossfadeProgressRef.current = Math.min(elapsed / (crossfadeDuration * 1000), 1)
        if (crossfadeProgressRef.current >= 1) {
          crossfadeStartTimeRef.current = null
          prevLayerRef.current = null
        }
      }

      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // Очистка
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpr, dpr)

      const rotation = rotationRef.current
      const crossfadeProgress = crossfadeProgressRef.current

      // Рисуем предыдущий слой (fade out)
      if (prevLayerRef.current && crossfadeProgress < 1) {
        drawLayer(ctx, prevLayerRef.current, rotation, beatScale, 1 - crossfadeProgress, width, height)
      }

      // Рисуем текущий слой (fade in)
      if (currentLayerRef.current.bgImage) {
        const currentOpacity = prevLayerRef.current ? crossfadeProgress : 1
        drawLayer(ctx, currentLayerRef.current, rotation, beatScale, currentOpacity, width, height)
      }

      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPaused, isReverse, spinDuration, spinSpeedMultiplier, beatScale, drawLayer, crossfadeDuration])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'black',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          filter: hueAngle > 0 ? `hue-rotate(${hueAngle}deg)` : 'none',
          transition: 'filter 0.05s ease-out',
        }}
      />
    </div>
  )
}
