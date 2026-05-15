'use client'

import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, Link, Text } from '@chakra-ui/react'
import { motion, useInView } from 'framer-motion'
import NextImage from 'next/image'
import { memo, useRef } from 'react'

const MotionBox = motion.create(Box)

/** Мандала с URL для отображения в карточке */
interface MandalaWithUrls {
  id: string
  slug: string
  name: string
  imageUrl: string
}

interface MandalaCardProps {
  /** Данные мандалы */
  mandala: MandalaWithUrls
  /** Индекс в списке для staggered анимации */
  index: number
}

/**
 * Интерактивная карточка мандалы с анимациями.
 * - Staggered появление при скролле
 * - Медленное вращение при hover
 * - Золотистое свечение по краям
 * - Постоянно видимое название с градиентом
 *
 * Мемоизирована для предотвращения ререндеров при обновлении родительского списка.
 */
export const MandalaCard = memo(function MandalaCard({ mandala, index }: MandalaCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <MotionBox
      ref={ref}
      position="relative"
      overflow="hidden"
      borderRadius="xl"
      cursor="pointer"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={
        isInView
          ? {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            }
          : {}
      }
      whileHover={{
        scale: 1.02,
        boxShadow: '0 0 30px rgba(202, 158, 103, 0.5), 0 0 60px rgba(202, 158, 103, 0.3)',
        transition: { duration: 0.3 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Link asChild display="block" _hover={{ textDecoration: 'none' }}>
        <LocalizedLink href={`/mandalas/${mandala.slug}`}>
          {/* Контейнер изображения с вращением */}
          <Box position="relative" overflow="hidden" aspectRatio={1} borderRadius="xl">
            {/* Изображение мандалы с эффектом вращения при hover */}
            <MotionBox
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              whileHover={{
                rotate: 10,
                transition: { duration: 3, ease: 'linear' },
              }}
            >
              <NextImage
                src={mandala.imageUrl}
                alt={mandala.name}
                fill
                sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
                loading="lazy"
              />
            </MotionBox>

            {/* Градиентный оверлей для названия (всегда видимый) */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              height="50%"
              background="linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)"
              pointerEvents="none"
            />

            {/* Название мандалы (всегда видимое) */}
            <Box position="absolute" bottom={0} left={0} right={0} p={3} textAlign="center">
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="semibold"
                color="white"
                textShadow="0 2px 4px rgba(0,0,0,0.5)"
                lineClamp={2}
              >
                {mandala.name}
              </Text>
            </Box>

            {/* Свечение по краям при hover */}
            <MotionBox
              position="absolute"
              inset={0}
              borderRadius="xl"
              border="2px solid transparent"
              pointerEvents="none"
              initial={{ opacity: 0 }}
              whileHover={{
                opacity: 1,
                borderColor: 'rgba(202, 158, 103, 0.6)',
                boxShadow: 'inset 0 0 20px rgba(202, 158, 103, 0.3)',
              }}
            />
          </Box>
        </LocalizedLink>
      </Link>
    </MotionBox>
  )
})
