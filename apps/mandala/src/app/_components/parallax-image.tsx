'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import NextImage from 'next/image'
import { useRef } from 'react'

const MotionBox = motion.create(Box)

interface ParallaxImageProps extends Omit<BoxProps, 'children'> {
  /** URL изображения */
  src: string
  /** Alt текст */
  alt: string
  /** Скорость параллакса: -1 (обратное движение) до 1 (быстрое движение), 0.5 по умолчанию */
  speed?: number
  /** Эффект масштабирования при скролле */
  scaleOnScroll?: boolean
}

/**
 * Изображение с эффектом параллакса.
 * Движется с разной скоростью относительно скролла страницы.
 */
export function ParallaxImage({ src, alt, speed = 0.5, scaleOnScroll = false, ...boxProps }: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Преобразование прогресса скролла в смещение
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed])

  // Опциональный эффект масштабирования
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, scaleOnScroll ? 1.1 : 1, 1])

  return (
    <Box ref={ref} position="relative" overflow="hidden" {...boxProps}>
      <MotionBox style={{ y, scale }} position="absolute" inset={5}>
        <NextImage
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          style={{ objectFit: 'contain' }}
          loading="lazy"
        />
      </MotionBox>
    </Box>
  )
}
