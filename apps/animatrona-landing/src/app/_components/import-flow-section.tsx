'use client'

/**
 * Секция "Как работает импорт" — Stepped Carousel
 * Показывает 6 шагов импорта аниме с автопереключением
 */

import { Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

interface ImportStep {
  image: string
  title: string
  description: string
}

const IMPORT_STEPS: ImportStep[] = [
  {
    image: '/screenshots/import1.png',
    title: 'Выбор папки',
    description: 'Выберите папку с аниме или перетащите её в окно приложения',
  },
  {
    image: '/screenshots/import2.png',
    title: 'Поиск на Shikimori',
    description: 'Автоматический поиск метаданных: постеры, описания, жанры',
  },
  {
    image: '/screenshots/import3.png',
    title: 'Сканирование файлов',
    description: 'Распознавание эпизодов, аудиодорожек и субтитров',
  },
  {
    image: '/screenshots/import4.png',
    title: 'Выбор донора',
    description: 'Опциональный выбор источника для синхронизации субтитров',
  },
  {
    image: '/screenshots/import5.png',
    title: 'Калибровка',
    description: 'Точная синхронизация аудио и субтитров с видео',
  },
  {
    image: '/screenshots/import6.png',
    title: 'Предпросмотр',
    description: 'Финальная проверка настроек и добавление в очередь',
  },
]

const AUTO_PLAY_INTERVAL = 5000 // 5 секунд

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)

/**
 * Индикатор шага (точка)
 */
function StepIndicator({ index, isActive, onClick }: { index: number; isActive: boolean; onClick: () => void }) {
  return (
    <Box
      as="button"
      w={isActive ? 8 : 3}
      h={3}
      borderRadius="full"
      bg={isActive ? 'brand.500' : 'gray.700'}
      transition="all 0.3s ease"
      cursor="pointer"
      onClick={onClick}
      aria-label={`Шаг ${index + 1}`}
      _hover={{ bg: isActive ? 'brand.400' : 'gray.600' }}
    />
  )
}

export function ImportFlowSection() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  // Автопереключение
  useEffect(() => {
    if (isPaused) {
      return
    }

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % IMPORT_STEPS.length)
    }, AUTO_PLAY_INTERVAL)

    return () => clearInterval(timer)
  }, [isPaused])

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index)
  }, [])

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }))
  }, [])

  const step = IMPORT_STEPS[currentStep]

  return (
    <Box as="section" id="import-flow" py={{ base: 16, md: 24 }}>
      <Container maxW="container.xl">
        <VStack gap={{ base: 8, md: 12 }}>
          {/* Заголовок */}
          <MotionVStack
            gap={4}
            textAlign="center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
              Импорт за 6 шагов
            </Heading>
            <Text color="gray.400" fontSize="lg" maxW="2xl">
              Добавьте аниме в библиотеку с автоматическим поиском метаданных и настройкой транскодирования
            </Text>
          </MotionVStack>

          {/* Индикаторы */}
          <HStack gap={2}>
            {IMPORT_STEPS.map((_, index) => (
              <StepIndicator
                key={index}
                index={index}
                isActive={index === currentStep}
                onClick={() => goToStep(index)}
              />
            ))}
          </HStack>

          {/* Скриншот */}
          <MotionBox
            className="glass"
            borderRadius="2xl"
            overflow="hidden"
            w="full"
            maxW="900px"
            boxShadow="0 0 60px rgba(139, 61, 255, 0.15)"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Box position="relative" aspectRatio={16 / 10} bg="gray.900">
              <AnimatePresence mode="wait">
                <MotionBox
                  key={currentStep}
                  position="absolute"
                  inset={0}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {imageErrors[currentStep] ? (
                    <VStack h="full" justify="center" color="gray.600">
                      <Text>Изображение недоступно</Text>
                    </VStack>
                  ) : (
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      onError={() => handleImageError(currentStep)}
                      sizes="(max-width: 768px) 100vw, 900px"
                    />
                  )}
                </MotionBox>
              </AnimatePresence>

              {/* Номер шага */}
              <Box
                position="absolute"
                top={4}
                left={4}
                bg="brand.500"
                color="white"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
              >
                {currentStep + 1} / {IMPORT_STEPS.length}
              </Box>
            </Box>
          </MotionBox>

          {/* Название и описание шага */}
          <AnimatePresence mode="wait">
            <MotionVStack
              key={currentStep}
              gap={2}
              textAlign="center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Heading as="h3" size="lg" color="white">
                {step.title}
              </Heading>
              <Text color="gray.400" fontSize="md" maxW="lg">
                {step.description}
              </Text>
            </MotionVStack>
          </AnimatePresence>

          {/* Подсказка */}
          <Text color="gray.600" fontSize="sm">
            {isPaused ? 'Автопереключение приостановлено' : 'Наведите для паузы • Кликните на точку для перехода'}
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}
