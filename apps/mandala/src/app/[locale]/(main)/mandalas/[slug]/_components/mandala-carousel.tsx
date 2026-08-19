'use client'

import { Box, Text } from '@chakra-ui/react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect } from 'react'

const MotionBox = motion.create(Box)

interface MandalaItem {
  slug: string
  name: string
  imageUrl: string
}

interface MandalaCarouselProps {
  /** Список мандал */
  mandalas: MandalaItem[]
  /** Индекс текущей мандалы */
  currentIndex: number
  /** Callback при выборе мандалы */
  onSelect: (slug: string) => void
  /** Видимость карусели */
  visible: boolean
  /** Callback при закрытии */
  onClose?: () => void
}

/**
 * 3D карусель для переключения между мандалами в fullscreen режиме.
 *
 * Особенности:
 * - Перспективный эффект: текущая мандала в центре, соседние по бокам
 * - Плавные переходы с rotateY трансформацией
 * - Клик на боковую мандалу переключает на неё
 * - Swipe gesture для пролистывания (TODO)
 */
export function MandalaCarousel({ mandalas, currentIndex, onSelect, visible, onClose }: MandalaCarouselProps) {
  // Получаем соседние мандалы (с циклическим переходом)
  const getPrevIndex = (idx: number) => (idx - 1 + mandalas.length) % mandalas.length
  const getNextIndex = (idx: number) => (idx + 1) % mandalas.length

  const prevIndex = getPrevIndex(currentIndex)
  const nextIndex = getNextIndex(currentIndex)

  // Варианты анимации для карточек
  const cardVariants: Variants = {
    center: {
      x: 0,
      rotateY: 0,
      scale: 1,
      opacity: 1,
      zIndex: 3,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    left: {
      x: '-120%',
      rotateY: 35,
      scale: 0.7,
      opacity: 0.7,
      zIndex: 2,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    right: {
      x: '120%',
      rotateY: -35,
      scale: 0.7,
      opacity: 0.7,
      zIndex: 2,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    hidden: {
      scale: 0.5,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  /**
   * Переключение на предыдущую мандалу
   */
  const handlePrev = useCallback(() => {
    onSelect(mandalas[prevIndex].slug)
  }, [mandalas, prevIndex, onSelect])

  /**
   * Переключение на следующую мандалу
   */
  const handleNext = useCallback(() => {
    onSelect(mandalas[nextIndex].slug)
  }, [mandalas, nextIndex, onSelect])

  // Обработка клавиатуры
  useEffect(() => {
    if (!visible) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, handlePrev, handleNext, onClose])

  // Не рендерим если менее 3 мандал
  if (mandalas.length < 3) {
    return null
  }

  return (
    <AnimatePresence>
      {visible && (
        <MotionBox
          position="fixed"
          inset={0}
          zIndex={10003}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          style={{ perspective: '1000px' }}
        >
          {/* Контейнер карусели */}
          <Box
            position="relative"
            w="100%"
            maxW="800px"
            h="60vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={{ transformStyle: 'preserve-3d' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Предыдущая мандала */}
            <MotionBox
              position="absolute"
              w={{ base: '150px', md: '200px' }}
              h={{ base: '150px', md: '200px' }}
              variants={cardVariants}
              animate="left"
              cursor="pointer"
              onClick={handlePrev}
              whileHover={{ scale: 0.75, opacity: 0.85 }}
            >
              <Box
                borderRadius="lg"
                overflow="hidden"
                boxShadow="0 10px 40px rgba(0, 0, 0, 0.5)"
                border="2px solid"
                borderColor="whiteAlpha.200"
                transitionProperty="border-color, box-shadow"
                transitionDuration="0.2s"
              >
                <Image
                  src={mandalas[prevIndex].imageUrl}
                  alt={mandalas[prevIndex].name}
                  width={200}
                  height={200}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </Box>
              <Text
                textAlign="center"
                color="whiteAlpha.700"
                fontSize="sm"
                mt={2}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {mandalas[prevIndex].name}
              </Text>
            </MotionBox>

            {/* Текущая мандала */}
            <MotionBox
              position="relative"
              w={{ base: '250px', md: '350px' }}
              h={{ base: '250px', md: '350px' }}
              variants={cardVariants}
              animate="center"
            >
              <Box
                borderRadius="xl"
                overflow="hidden"
                boxShadow="0 25px 80px rgba(202, 158, 103, 0.3), 0 15px 40px rgba(0, 0, 0, 0.5)"
                border="3px solid"
                borderColor="brand.400"
              >
                <Image
                  src={mandalas[currentIndex].imageUrl}
                  alt={mandalas[currentIndex].name}
                  width={350}
                  height={350}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  priority
                />
              </Box>
              <Text textAlign="center" color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold" mt={4}>
                {mandalas[currentIndex].name}
              </Text>
            </MotionBox>

            {/* Следующая мандала */}
            <MotionBox
              position="absolute"
              w={{ base: '150px', md: '200px' }}
              h={{ base: '150px', md: '200px' }}
              variants={cardVariants}
              animate="right"
              cursor="pointer"
              onClick={handleNext}
              whileHover={{ scale: 0.75, opacity: 0.85 }}
            >
              <Box
                borderRadius="lg"
                overflow="hidden"
                boxShadow="0 10px 40px rgba(0, 0, 0, 0.5)"
                border="2px solid"
                borderColor="whiteAlpha.200"
                transitionProperty="border-color, box-shadow"
                transitionDuration="0.2s"
              >
                <Image
                  src={mandalas[nextIndex].imageUrl}
                  alt={mandalas[nextIndex].name}
                  width={200}
                  height={200}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </Box>
              <Text
                textAlign="center"
                color="whiteAlpha.700"
                fontSize="sm"
                mt={2}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {mandalas[nextIndex].name}
              </Text>
            </MotionBox>
          </Box>

          {/* Индикатор прогресса */}
          <Box position="absolute" bottom={8} left="50%" transform="translateX(-50%)">
            <Text color="whiteAlpha.600" fontSize="sm">
              {currentIndex + 1} / {mandalas.length}
            </Text>
          </Box>

          {/* Подсказка */}
          <Box position="absolute" bottom={4} left="50%" transform="translateX(-50%)">
            <Text color="whiteAlpha.400" fontSize="xs">
              ← → для навигации • ESC для закрытия
            </Text>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
