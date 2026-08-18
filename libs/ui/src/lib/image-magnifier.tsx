'use client'

import { Box, type BoxProps, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Точка траектории автопоказа в долях размера изображения (0..1) */
export type MagnifierPoint = readonly [x: number, y: number]

/**
 * Props для ImageMagnifier
 */
export interface ImageMagnifierProps extends Omit<BoxProps, 'onClick'> {
  /** Полное изображение 1:1 — именно его показывает лупа */
  src: string
  /** Лёгкая версия для мгновенной первой отрисовки, пока грузится полная */
  placeholderSrc?: string
  /** Натуральная ширина `src` в пикселях */
  naturalWidth: number
  /** Натуральная высота `src` в пикселях */
  naturalHeight: number
  /** Описание изображения */
  alt: string
  /** Диаметр лупы в CSS-пикселях (по умолчанию 240) */
  lensSize?: number
  /** Подсказка поверх изображения до первого взаимодействия */
  hint?: string
  /** Бейдж в углу — например «Фрагмент реального постера» */
  badge?: string
  /** Запускать автопоказ при появлении в зоне видимости (по умолчанию true) */
  autoDemo?: boolean
  /** Траектория автопоказа в долях 0..1 (по умолчанию проход по центру) */
  demoPath?: readonly MagnifierPoint[]
  /** Длительность автопоказа в миллисекундах (по умолчанию 4200) */
  demoDuration?: number
  /**
   * Вызывается один раз при первом РЕАЛЬНОМ взаимодействии пользователя (мышь/тач/клавиатура).
   * Автопоказ (`autoDemo`) не считается — он срабатывает сам, без участия пользователя.
   */
  onInteract?: () => void
}

const DEFAULT_DEMO_PATH: readonly MagnifierPoint[] = [
  [0.2, 0.3],
  [0.42, 0.52],
  [0.68, 0.34],
]

/** Плавное ускорение-замедление, чтобы движение лупы не выглядело механическим */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** Позиция на ломаной траектории по прогрессу 0..1 */
function pointAt(path: readonly MagnifierPoint[], progress: number): MagnifierPoint {
  if (path.length === 1) {
    return path[0]!
  }
  const segments = path.length - 1
  const scaled = Math.min(progress, 0.999_999) * segments
  const index = Math.floor(scaled)
  const local = scaled - index
  const from = path[index]!
  const to = path[index + 1]!
  return [from[0] + (to[0] - from[0]) * local, from[1] + (to[1] - from[1]) * local]
}

/**
 * Изображение с лупой: под курсором показывается участок в натуральном
 * разрешении 1:1, вокруг — то же изображение, ужатое до размеров контейнера.
 *
 * Задуман для случая, когда мелкая деталь физически теряется при уменьшении
 * и её надо показать, не обманывая зрителя монтажом: лупа берёт пиксели из
 * того же файла, просто без масштабирования.
 *
 * Управление: мышь — лупа следует за курсором, клик закрепляет её на месте;
 * касание — лупа встаёт в точку тапа (скролл страницы не блокируется);
 * клавиатура — стрелки двигают, Enter/Space закрепляет.
 *
 * @example
 * ```tsx
 * <ImageMagnifier
 *   src="/demo/poster-fragment.webp"
 *   placeholderSrc="/demo/poster-fragment-far.webp"
 *   naturalWidth={3200}
 *   naturalHeight={2200}
 *   alt="Фрагмент постера: вблизи проступают слова"
 *   hint="Наведите — как будто подошли ближе"
 * />
 * ```
 */
export function ImageMagnifier({
  src,
  placeholderSrc,
  naturalWidth,
  naturalHeight,
  alt,
  lensSize = 240,
  hint,
  badge,
  autoDemo = true,
  demoPath = DEFAULT_DEMO_PATH,
  demoDuration = 4200,
  onInteract,
  ...boxProps
}: ImageMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<number>(0)
  const interactedRef = useRef(false)

  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [touched, setTouched] = useState(false)
  const [demoDone, setDemoDone] = useState(false)

  // Из кэша картинка успевает загрузиться до гидратации — событие load
  // тогда уже не придёт, и без этой проверки лупа не включится никогда
  useEffect(() => {
    if (imageRef.current?.complete) {
      setLoaded(true)
    }
  }, [])

  // `touched` выставляется только реальным взаимодействием (мышь/тач/клавиатура),
  // автопоказ его не трогает — поэтому переход в true здесь и есть момент,
  // когда пользователь САМ подвинул лупу (§D.2 PLAN_MARKETING.md у aboi). `interactedRef`
  // страхует от повторного вызова, если `onInteract` у вызывающего кода не мемоизирован.
  useEffect(() => {
    if (touched && !interactedRef.current) {
      interactedRef.current = true
      onInteract?.()
    }
  }, [touched, onInteract])

  /** Перевод точки в долях изображения в CSS-координаты контейнера */
  const toLocal = useCallback((point: MagnifierPoint) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      return null
    }
    return { x: point[0] * rect.width, y: point[1] * rect.height }
  }, [])

  // Автопоказ: пользователь может не догадаться навести мышь — показываем сами
  useEffect(() => {
    const node = containerRef.current
    if (!node || !autoDemo || !loaded || demoDone || touched) {
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) {
          return
        }
        observer.disconnect()

        if (reduceMotion) {
          const middle = toLocal(pointAt(demoPath, 0.5))
          if (middle) {
            setLens(middle)
          }
          setDemoDone(true)
          return
        }

        const start = performance.now()
        const step = (now: number) => {
          const progress = Math.min((now - start) / demoDuration, 1)
          const local = toLocal(pointAt(demoPath, easeInOut(progress)))
          if (local) {
            setLens(local)
          }
          if (progress < 1) {
            frameRef.current = requestAnimationFrame(step)
            return
          }
          setLens(null)
          setDemoDone(true)
        }
        frameRef.current = requestAnimationFrame(step)
      },
      { threshold: 0.5 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [autoDemo, loaded, demoDone, touched, demoPath, demoDuration, toLocal])

  const stopDemo = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    setDemoDone(true)
  }, [])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!loaded) {
        return
      }
      stopDemo()
      const rect = event.currentTarget.getBoundingClientRect()
      setLens({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      setTouched(true)
    },
    [loaded, stopDemo],
  )

  // Тап ставит лупу в точку и оставляет её там: водить пальцем нельзя,
  // иначе пришлось бы блокировать скролл страницы под картинкой
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!loaded) {
        return
      }
      stopDemo()
      const touch = event.touches[0]
      if (!touch) {
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      setLens({ x: touch.clientX - rect.left, y: touch.clientY - rect.top })
      setPinned(true)
      setTouched(true)
    },
    [loaded, stopDemo],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!loaded) {
        return
      }
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const stepPx = rect.width / 12
      const current = lens ?? { x: rect.width / 2, y: rect.height / 2 }
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-stepPx, 0],
        ArrowRight: [stepPx, 0],
        ArrowUp: [0, -stepPx],
        ArrowDown: [0, stepPx],
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        stopDemo()
        setTouched(true)
        setLens(current)
        setPinned((prev) => !prev)
        return
      }

      const move = moves[event.key]
      if (!move) {
        return
      }
      event.preventDefault()
      stopDemo()
      setTouched(true)
      setPinned(true)
      setLens({
        x: Math.max(0, Math.min(rect.width, current.x + move[0])),
        y: Math.max(0, Math.min(rect.height, current.y + move[1])),
      })
    },
    [lens, loaded, stopDemo],
  )

  const handleMouseLeave = useCallback(() => {
    if (!pinned) {
      setLens(null)
    }
  }, [pinned])

  // Пиксели берутся из того же файла без масштабирования, поэтому
  // достаточно перевести координаты курсора в натуральные
  const rect = containerRef.current?.getBoundingClientRect()
  const scale = rect && rect.width > 0 ? naturalWidth / rect.width : 1
  // Весь эффект держится на контрасте «вокруг мелко — внутри крупно»: если лупа
  // закрывает почти весь кадр, сравнивать не с чем. На узких экранах ужимаем её
  const effectiveLensSize = rect ? Math.min(lensSize, rect.width * 0.5, rect.height * 0.6) : lensSize
  const half = effectiveLensSize / 2

  return (
    <Box
      ref={containerRef}
      position="relative"
      overflow="hidden"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="border"
      bg="bg.subtle"
      cursor={lens ? 'none' : 'crosshair'}
      aspectRatio={`${naturalWidth} / ${naturalHeight}`}
      backgroundImage={placeholderSrc ? `url(${placeholderSrc})` : undefined}
      backgroundSize="cover"
      tabIndex={0}
      role="img"
      aria-label={alt}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setPinned((prev) => !prev)}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.solid', outlineOffset: '2px' }}
      {...boxProps}
    >
      {
        /* unoptimized обязателен: лупа берёт фон по тому же URL и считает позицию
          от натуральных размеров. Через /_next/image пришла бы масштабированная
          копия — координаты разъехались бы, а буквы потеряли бы резкость */
      }
      <Box asChild opacity={loaded ? 1 : 0} transition="opacity 0.4s ease" userSelect="none">
        <Image
          ref={imageRef}
          src={src}
          alt=""
          fill
          unoptimized
          draggable={false}
          style={{ objectFit: 'cover' }}
          onLoad={() => setLoaded(true)}
        />
      </Box>

      {lens && (
        <Box
          position="absolute"
          pointerEvents="none"
          left={`${lens.x - half}px`}
          top={`${lens.y - half}px`}
          w={`${effectiveLensSize}px`}
          h={`${effectiveLensSize}px`}
          borderRadius="full"
          borderWidth="3px"
          borderColor="whiteAlpha.800"
          boxShadow="0 0 0 1px rgba(0,0,0,0.25), 0 12px 32px rgba(0,0,0,0.35)"
          backgroundImage={`url(${src})`}
          backgroundRepeat="no-repeat"
          backgroundSize={`${naturalWidth}px ${naturalHeight}px`}
          backgroundPosition={`${-(lens.x * scale - half)}px ${-(lens.y * scale - half)}px`}
        />
      )}

      {badge && (
        <Box
          position="absolute"
          top={3}
          left={3}
          px={3}
          py={1}
          borderRadius="full"
          bg="blackAlpha.600"
          backdropFilter="blur(4px)"
          pointerEvents="none"
        >
          <Text fontSize="xs" color="white" fontWeight="medium">
            {badge}
          </Text>
        </Box>
      )}

      {hint && (
        <Box
          position="absolute"
          bottom={3}
          left="50%"
          transform="translateX(-50%)"
          px={4}
          py={2}
          borderRadius="full"
          bg="blackAlpha.700"
          backdropFilter="blur(4px)"
          opacity={touched ? 0 : 1}
          transition="opacity 0.4s ease"
          pointerEvents="none"
          maxW="90%"
        >
          <Text fontSize="sm" color="white" textAlign="center">
            {hint}
          </Text>
        </Box>
      )}
    </Box>
  )
}
