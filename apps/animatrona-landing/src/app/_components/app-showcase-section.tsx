'use client'

/**
 * Секция "Приложение в деле" — Bento Grid
 * Показывает 4 скриншота в асимметричной сетке
 */

import { Box, Container, Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useState } from 'react'

interface ShowcaseItem {
  image: string
  title: string
  description: string
  /** Занимает 2 колонки на desktop */
  wide?: boolean
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    image: '/screenshots/anime.png',
    title: 'Страница аниме',
    description: 'Постер, описание, жанры и список эпизодов',
    wide: true,
  },
  {
    image: '/screenshots/player.png',
    title: 'Встроенный плеер',
    description: 'ASS субтитры, переключение дорожек, главы',
  },
  {
    image: '/screenshots/transcode.png',
    title: 'Очередь транскодирования',
    description: 'Прогресс обработки и статистика',
  },
  {
    image: '/screenshots/encode.png',
    title: 'Настройки кодирования',
    description: 'VMAF, кодеки, параметры качества',
    wide: true,
  },
]

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)
const MotionGridItem = motion.create(GridItem)

/**
 * Карточка скриншота
 */
function ShowcaseCard({ item, index }: { item: ShowcaseItem; index: number }) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  return (
    <MotionGridItem
      colSpan={{ base: 1, lg: item.wide ? 2 : 1 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <MotionBox
        className="glass"
        borderRadius="xl"
        overflow="hidden"
        h="full"
        whileHover={{
          y: -8,
          boxShadow: '0 0 40px rgba(139, 61, 255, 0.25)',
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Скриншот */}
        <Box position="relative" aspectRatio={16 / 10} bg="gray.900">
          {imageError
            ? (
              <VStack h="full" justify="center" color="gray.600">
                <Text>Изображение недоступно</Text>
              </VStack>
            )
            : (
              <Image
                src={item.image}
                alt={item.title}
                fill
                style={{ objectFit: 'cover' }}
                onError={handleImageError}
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            )}
        </Box>

        {/* Подпись */}
        <Box p={4}>
          <Text fontWeight="semibold" color="white" mb={1}>
            {item.title}
          </Text>
          <Text fontSize="sm" color="gray.500">
            {item.description}
          </Text>
        </Box>
      </MotionBox>
    </MotionGridItem>
  )
}

export function AppShowcaseSection() {
  return (
    <Box as="section" id="showcase" py={{ base: 16, md: 24 }} bg="gray.900/30">
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
              Приложение в деле
            </Heading>
            <Text color="gray.400" fontSize="lg" maxW="2xl">
              Современный интерфейс для комфортной работы с аниме-коллекцией
            </Text>
          </MotionVStack>

          {/* Bento Grid */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6} w="full">
            {SHOWCASE_ITEMS.map((item, index) => <ShowcaseCard key={item.title} item={item} index={index} />)}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
