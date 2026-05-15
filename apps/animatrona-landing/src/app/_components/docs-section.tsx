'use client'

import { Box, Container, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import type { IconType } from 'react-icons'
import { LuArrowRight, LuDownload, LuFolderOpen, LuPlay, LuSearch } from 'react-icons/lu'

interface Step {
  icon: IconType
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    icon: LuDownload,
    title: 'Установка',
    description: 'Скачайте и установите приложение для вашей операционной системы',
  },
  {
    icon: LuFolderOpen,
    title: 'Добавление аниме',
    description: 'Откройте папку с аниме через File → Import или перетащите в окно',
  },
  {
    icon: LuSearch,
    title: 'Импорт метаданных',
    description: 'Нажмите «Найти на Shikimori» для автозаполнения информации',
  },
  {
    icon: LuPlay,
    title: 'Просмотр',
    description: 'Выберите эпизод и наслаждайтесь просмотром с субтитрами',
  },
]

export function DocsSection() {
  return (
    <Box as="section" id="docs" py={{ base: 16, md: 24 }}>
      <Container maxW="container.lg">
        <VStack gap={12}>
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
              Быстрый старт
            </Heading>
            <Text color="gray.400" fontSize="lg">
              Начните использовать Animatrona за 4 простых шага
            </Text>
          </VStack>

          {/* Timeline */}
          <VStack gap={0} w="full" position="relative">
            {/* Вертикальная линия */}
            <Box
              position="absolute"
              left={{ base: '24px', md: '50%' }}
              top={0}
              bottom={0}
              width="2px"
              bg="gray.800"
              transform={{ md: 'translateX(-50%)' }}
            />

            {STEPS.map((step, index) => (
              <HStack
                key={step.title}
                w="full"
                gap={{ base: 4, md: 8 }}
                py={6}
                flexDirection={{
                  base: 'row',
                  md: index % 2 === 0 ? 'row' : 'row-reverse',
                }}
              >
                {/* Контент */}
                <Box flex={1} textAlign={{ base: 'left', md: index % 2 === 0 ? 'right' : 'left' }}>
                  <VStack align={{ base: 'start', md: index % 2 === 0 ? 'end' : 'start' }} gap={2}>
                    <Heading as="h3" size="md" color="white">
                      {step.title}
                    </Heading>
                    <Text color="gray.400" fontSize="sm" maxW="xs">
                      {step.description}
                    </Text>
                  </VStack>
                </Box>

                {/* Иконка (центр) */}
                <Box
                  position="relative"
                  zIndex={1}
                  p={3}
                  borderRadius="full"
                  bg="gray.900"
                  border="2px solid"
                  borderColor="brand.500"
                  color="brand.400"
                  flexShrink={0}
                >
                  <Icon as={step.icon} boxSize={5} />
                </Box>

                {/* Номер шага */}
                <Box flex={1} display={{ base: 'none', md: 'block' }} textAlign={index % 2 === 0 ? 'left' : 'right'}>
                  <Text fontSize="6xl" fontWeight="bold" color="gray.900" lineHeight={1}>
                    {index + 1}
                  </Text>
                </Box>
              </HStack>
            ))}
          </VStack>

          {/* Ссылка на документацию */}
          <Link href="/docs" color="brand.400" fontSize="sm" transition="color 0.2s" _hover={{ color: 'brand.300' }}>
            <HStack>
              <Text>Подробнее в документации</Text>
              <Icon as={LuArrowRight} />
            </HStack>
          </Link>
        </VStack>
      </Container>
    </Box>
  )
}
