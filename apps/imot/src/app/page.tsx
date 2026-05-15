import { ImotLogo } from '@/app/_components/imot-logo'
import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { getSession } from '@/lib/auth'
import { imotColors, type ImotLevel } from '@/lib/theme/imot-colors'
import { Box, Button, Container, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuBrain, LuCalculator, LuHeart, LuPalette, LuZap } from 'react-icons/lu'

const levels: Array<{
  key: ImotLevel
  icon: React.ElementType
  description: string
}> = [
  {
    key: 'numerology',
    icon: LuCalculator,
    description: 'Матрица судьбы, таланты, предназначение через числа',
  },
  {
    key: 'neuroPsych',
    icon: LuBrain,
    description: 'Паттерны поведения, когнитивные особенности',
  },
  {
    key: 'energy',
    icon: LuZap,
    description: '7 чакр, энергетические блоки и потоки',
  },
  {
    key: 'body',
    icon: LuHeart,
    description: 'Карта зажимов, психосоматика тела',
  },
  {
    key: 'style',
    icon: LuPalette,
    description: 'Цветотип, архетип, самовыражение',
  },
]

export default async function HomePage() {
  const session = await getSession()

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
      {/* Header */}
      <Box as="header" py={4} borderBottomWidth="1px" bg="white" _dark={{ bg: 'gray.800' }}>
        <Container maxW="7xl">
          <Flex justify="space-between" align="center">
            <ImotLogo size="sm" animated={false} />
            <HStack gap={3}>
              <ColorModeButton />

              {/* Условный рендеринг для авторизованных/неавторизованных */}
              {session ? (
                <>
                  <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                    Здравствуйте, {session.user?.name?.split(' ')[0]}!
                  </Text>
                  <Button asChild colorPalette="fg" size="sm">
                    <NextLink href="/dashboard">Личный кабинет</NextLink>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <NextLink href="/sign-in">Вход</NextLink>
                  </Button>
                  <Button asChild colorPalette="fg" size="sm">
                    <NextLink href="/sign-up">Регистрация</NextLink>
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        py={{ base: 16, md: 24 }}
        bgGradient="to-br"
        gradientFrom="purple.50"
        gradientTo="pink.50"
        _dark={{
          gradientFrom: 'purple.900/20',
          gradientTo: 'pink.900/20',
        }}
      >
        <Container maxW="5xl">
          <VStack gap={8} textAlign="center">
            <ImotLogo size="xl" animated />

            <Heading size={{ base: 'xl', md: '2xl' }} maxW="3xl" lineHeight="shorter">
              Интегративная методология для глубокой
              <Text as="span" color="purple.600" _dark={{ color: 'purple.400' }}>
                {' '}
                трансформации личности
              </Text>
            </Heading>

            <Text fontSize={{ base: 'lg', md: 'xl' }} color="gray.600" _dark={{ color: 'gray.400' }} maxW="2xl">
              Авторская терапевтическая коучинговая методология Елены Рос, объединяющая 5 уровней диагностики для
              целостного понимания себя
            </Text>

            <HStack gap={4} mt={4}>
              {session ? (
                <Button asChild colorPalette="fg" size="lg">
                  <NextLink href="/dashboard">Перейти в личный кабинет</NextLink>
                </Button>
              ) : (
                <>
                  <Button asChild colorPalette="fg" size="lg">
                    <NextLink href="/sign-up">Начать трансформацию</NextLink>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <NextLink href="/sign-in">Войти в личный кабинет</NextLink>
                  </Button>
                </>
              )}
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* 5 Levels Section */}
      <Box py={{ base: 16, md: 24 }}>
        <Container maxW="7xl">
          <VStack gap={12}>
            <VStack gap={4} textAlign="center">
              <Heading size={{ base: 'lg', md: 'xl' }}>5 уровней диагностики</Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600" _dark={{ color: 'gray.400' }} maxW="2xl">
                Комплексный подход к изучению личности через интеграцию различных методологий и практик
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6} w="full">
              {levels.map((level) => {
                const colorConfig = imotColors[level.key]
                const Icon = level.icon

                return (
                  <Box
                    key={level.key}
                    p={6}
                    borderWidth="2px"
                    borderRadius="xl"
                    borderColor={colorConfig.primary}
                    bg="white"
                    _dark={{ bg: 'gray.800' }}
                    transition="all 0.3s"
                    _hover={{
                      transform: 'translateY(-4px)',
                      shadow: 'xl',
                    }}
                  >
                    <VStack align="start" gap={4}>
                      <Box p={3} borderRadius="lg" bg={colorConfig.bg} color={colorConfig.text}>
                        <Icon size={28} />
                      </Box>

                      <VStack align="start" gap={2}>
                        <Heading size="md" color={colorConfig.text}>
                          {colorConfig.name}
                        </Heading>
                        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                          {level.description}
                        </Text>
                      </VStack>
                    </VStack>
                  </Box>
                )
              })}

              {/* Integration Card */}
              <Box
                p={6}
                borderWidth="2px"
                borderRadius="xl"
                borderColor={imotColors.integration.primary}
                bg="white"
                bgGradient="to-br"
                gradientFrom="purple.50"
                gradientTo="pink.50"
                _dark={{
                  bg: 'gray.800',
                  gradientFrom: 'purple.900/20',
                  gradientTo: 'pink.900/20',
                }}
                transition="all 0.3s"
                _hover={{
                  transform: 'translateY(-4px)',
                  shadow: 'xl',
                }}
              >
                <VStack align="start" gap={4}>
                  <Box p={3} borderRadius="lg" bg={imotColors.integration.bg} color={imotColors.integration.text}>
                    <LuZap size={28} />
                  </Box>

                  <VStack align="start" gap={2}>
                    <Heading size="md" color={imotColors.integration.text}>
                      Интеграция
                    </Heading>
                    <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                      Синтез всех уровней для целостного понимания и трансформации
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={{ base: 16, md: 24 }} bg="white" _dark={{ bg: 'gray.800' }}>
        <Container maxW="7xl">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 12, md: 16 }}>
            <VStack align="start" gap={6}>
              <Heading size={{ base: 'lg', md: 'xl' }}>Для специалистов</Heading>
              <VStack align="start" gap={4}>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Управление клиентами и профилями
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Проведение сессий с заметками
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Создание планов трансформации
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Назначение практик и отслеживание прогресса
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Аналитика и экспорт в PDF
                </Text>
              </VStack>
            </VStack>

            <VStack align="start" gap={6}>
              <Heading size={{ base: 'lg', md: 'xl' }}>Для клиентов</Heading>
              <VStack align="start" gap={4}>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Доступ к своим профилям диагностики
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Просмотр плана трансформации
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Выполнение практик и ведение дневника
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Отслеживание своего прогресса
                </Text>
                <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
                  ✓ Экспорт результатов в PDF
                </Text>
              </VStack>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={{ base: 16, md: 24 }} bgGradient="to-br" gradientFrom="purple.600" gradientTo="pink.600" color="white">
        <Container maxW="5xl">
          <VStack gap={8} textAlign="center">
            {session ? (
              <>
                <Heading size={{ base: 'lg', md: 'xl' }}>
                  Добро пожаловать, {session.user?.name?.split(' ')[0]}!
                </Heading>
                <Text fontSize={{ base: 'md', md: 'lg' }} maxW="2xl" opacity={0.9}>
                  Продолжайте свой путь трансформации в личном кабинете
                </Text>
                <Button asChild size="lg" variant="solid" bg="white" color="purple.600" _hover={{ bg: 'gray.50' }}>
                  <NextLink href="/dashboard">Перейти в личный кабинет</NextLink>
                </Button>
              </>
            ) : (
              <>
                <Heading size={{ base: 'lg', md: 'xl' }}>Готовы начать трансформацию?</Heading>
                <Text fontSize={{ base: 'md', md: 'lg' }} maxW="2xl" opacity={0.9}>
                  Зарегистрируйтесь сейчас и получите доступ к комплексной методологии осознанной трансформации
                </Text>
                <Button asChild size="lg" variant="solid" bg="white" color="purple.600" _hover={{ bg: 'gray.50' }}>
                  <NextLink href="/sign-up">Создать аккаунт</NextLink>
                </Button>
              </>
            )}
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box as="footer" py={8} borderTopWidth="1px" bg="white" _dark={{ bg: 'gray.800' }}>
        <Container maxW="7xl">
          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" gap={4}>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              © 2025 ИМОТ. Все права защищены.
            </Text>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              Методология Елены Рос
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  )
}
