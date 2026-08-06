'use client'

import { Box, Card, Container, Heading, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import type { IconType } from 'react-icons'
import { LuCpu, LuFilm, LuFolderTree, LuGauge, LuMonitorPlay, LuSmartphone } from 'react-icons/lu'

interface Feature {
  icon: IconType
  title: string
  description: string
  details: string[]
  /** Главная фича — будет с gradient border */
  isMain?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: LuCpu,
    title: 'GPU-ускорение',
    description: 'Кодирование видео на видеокарте',
    details: ['AV1 и HEVC кодеки', 'Dual NVENC (RTX 5080)', '2x параллельных потока'],
    isMain: true,
  },
  {
    icon: LuGauge,
    title: 'Автоподбор VMAF',
    description: 'Оптимальное качество автоматически',
    details: ['Целевое качество 95+', 'Минимальный размер файла', 'Бинарный поиск CQ'],
  },
  {
    icon: LuFilm,
    title: 'Shikimori',
    description: 'Импорт метаданных из Shikimori',
    details: ['Постеры и описания', 'Жанры и рейтинги', 'Персонажи и сейю'],
  },
  {
    icon: LuMonitorPlay,
    title: 'Встроенный плеер',
    description: 'Просмотр с ASS субтитрами',
    details: ['10-bit HDR', 'Переключение дорожек', 'Главы и пропуск OP/ED'],
  },
  {
    icon: LuSmartphone,
    title: 'Экспорт MKV',
    description: 'Готовые файлы для устройств',
    details: ['Выбор аудиодорожек', 'Встраивание субтитров', 'Оптимизация размера'],
  },
  {
    icon: LuFolderTree,
    title: 'Франшизы',
    description: 'Группировка связанных аниме',
    details: ['Автоопределение связей', 'Порядок просмотра', 'Сезоны и спешлы'],
  },
]

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)
const MotionSimpleGrid = motion.create(SimpleGrid)

// Варианты анимации для контейнера
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Варианты анимации для карточек
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

interface FeatureCardProps {
  feature: Feature
}

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <MotionBox variants={cardVariants} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
      <Card.Root
        className="glass"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.3s ease"
        position="relative"
        h="full"
        borderWidth={feature.isMain ? '2px' : '1px'}
        borderColor={feature.isMain ? 'transparent' : 'gray.800'}
        // Gradient border для главной фичи
        _before={feature.isMain
          ? {
            content: '""',
            position: 'absolute',
            inset: '-2px',
            borderRadius: 'xl',
            padding: '2px',
            background:
              'linear-gradient(135deg, rgba(139, 61, 255, 0.8), rgba(192, 132, 252, 0.4), rgba(139, 61, 255, 0.8))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            zIndex: -1,
          }
          : undefined}
        _hover={{
          boxShadow: feature.isMain ? '0 0 40px rgba(139, 61, 255, 0.3)' : '0 0 30px rgba(139, 61, 255, 0.2)',
        }}
      >
        <Card.Body p={6}>
          <VStack align="start" gap={4}>
            {/* Иконка с анимацией */}
            <MotionBox
              p={3}
              borderRadius="lg"
              bg={feature.isMain ? 'brand.500/20' : 'brand.500/10'}
              color="brand.400"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon as={feature.icon} boxSize={6} />
            </MotionBox>

            {/* Заголовок и описание */}
            <VStack align="start" gap={1}>
              <Heading as="h3" size="md" color="white">
                {feature.title}
                {feature.isMain && (
                  <Text as="span" ml={2} fontSize="xs" color="brand.400" fontWeight="normal">
                    ★ Главное
                  </Text>
                )}
              </Heading>
              <Text color="gray.400" fontSize="sm">
                {feature.description}
              </Text>
            </VStack>

            {/* Детали */}
            <VStack align="start" gap={1} w="full">
              {feature.details.map((detail) => (
                <Text key={detail} fontSize="sm" color="gray.500" display="flex" alignItems="center" gap={2}>
                  <Box w={1} h={1} borderRadius="full" bg={feature.isMain ? 'brand.400' : 'brand.500'} />
                  {detail}
                </Text>
              ))}
            </VStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </MotionBox>
  )
}

export function FeaturesSection() {
  return (
    <Box as="section" id="features" py={{ base: 16, md: 24 }}>
      <Container maxW="container.xl">
        <VStack gap={12}>
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
              Возможности
            </Heading>
            <Text color="gray.400" fontSize="lg" maxW="2xl">
              Всё необходимое для управления аниме-коллекцией в одном приложении
            </Text>
          </MotionVStack>

          {/* Карточки с stagger анимацией */}
          <MotionSimpleGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            gap={6}
            w="full"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {FEATURES.map((feature) => <FeatureCard key={feature.title} feature={feature} />)}
          </MotionSimpleGrid>
        </VStack>
      </Container>
    </Box>
  )
}
