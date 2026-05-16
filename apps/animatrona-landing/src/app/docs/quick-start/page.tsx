'use client'

import { Box, Card, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { LuDownload, LuExternalLink, LuFolderOpen, LuPlay, LuSearch } from 'react-icons/lu'

const STEPS = [
  {
    icon: LuDownload,
    title: '1. Установка приложения',
    description: 'Скачайте установщик для вашей операционной системы со страницы релизов на GitHub.',
    details: [
      'Windows: запустите .exe файл и следуйте инструкциям',
      'macOS: откройте .dmg и перетащите приложение в Applications',
      'Linux: сделайте .AppImage исполняемым и запустите',
    ],
  },
  {
    icon: LuFolderOpen,
    title: '2. Добавление аниме в библиотеку',
    description: 'Откройте папку с аниме через меню или перетащите её прямо в окно приложения.',
    details: [
      'File → Import Folder — выбор папки',
      'Drag & Drop — перетащите папку в окно',
      'Поддерживаются форматы: MKV, MP4, AVI, WEBM',
    ],
  },
  {
    icon: LuSearch,
    title: '3. Импорт метаданных',
    description: 'Нажмите «Найти на Shikimori» для автоматического заполнения информации об аниме.',
    details: [
      'Название, описание, жанры загружаются автоматически',
      'Постеры и обложки скачиваются в высоком качестве',
      'Можно редактировать метаданные вручную',
    ],
  },
  {
    icon: LuPlay,
    title: '4. Просмотр контента',
    description: 'Выберите эпизод и наслаждайтесь просмотром с поддержкой субтитров.',
    details: [
      'Встроенный плеер с аппаратным ускорением',
      'Поддержка ASS/SSA субтитров с сохранением стилей',
      'Запоминание позиции просмотра',
    ],
  },
]

export default function QuickStartPage() {
  return (
    <VStack align="stretch" gap={8}>
      <Box>
        <Heading as="h1" size="xl" mb={4}>
          Быстрый старт
        </Heading>
        <Text color="gray.400" fontSize="lg">
          Начните использовать Animatrona за 4 простых шага
        </Text>
      </Box>

      {/* Шаги */}
      <VStack align="stretch" gap={6}>
        {STEPS.map((step) => (
          <Card.Root key={step.title} className="glass" borderRadius="xl">
            <Card.Body p={6}>
              <HStack align="start" gap={4}>
                <Box p={3} borderRadius="lg" bg="brand.500/20" color="brand.400" flexShrink={0}>
                  <Icon as={step.icon} boxSize={6} />
                </Box>
                <Box flex={1}>
                  <Heading as="h2" size="md" mb={2}>
                    {step.title}
                  </Heading>
                  <Text color="gray.300" mb={3}>
                    {step.description}
                  </Text>
                  <VStack align="start" gap={1}>
                    {step.details.map((detail) => (
                      <Text key={detail} fontSize="sm" color="gray.500">
                        • {detail}
                      </Text>
                    ))}
                  </VStack>
                </Box>
              </HStack>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>

      {/* Полезные ссылки */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading as="h3" size="md" mb={4}>
            Полезные ссылки
          </Heading>
          <HStack gap={4} wrap="wrap">
            <Link
              href="https://github.com/kamiletar/letar/releases"
              target="_blank"
              rel="noopener noreferrer"
              color="brand.400"
              fontSize="sm"
              display="flex"
              alignItems="center"
              gap={1}
              _hover={{ color: 'brand.300' }}
            >
              <Icon as={LuExternalLink} />
              Страница релизов
            </Link>
            <Link
              href="https://shikimori.one"
              target="_blank"
              rel="noopener noreferrer"
              color="brand.400"
              fontSize="sm"
              display="flex"
              alignItems="center"
              gap={1}
              _hover={{ color: 'brand.300' }}
            >
              <Icon as={LuExternalLink} />
              Shikimori
            </Link>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
