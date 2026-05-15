import { Badge, Box, Button, Container, Heading, HStack, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

export default function HomePage() {
  return (
    <Box bg="bg" color="fg" minH="100dvh">
      {/* Hero */}
      <Box
        as="section"
        bgGradient="to-br"
        gradientFrom="brand.500"
        gradientTo="accent.600"
        color="white"
        py={{ base: 20, md: 32 }}
      >
        <Container maxW="6xl">
          <VStack gap={6} align="flex-start">
            <Badge bg="whiteAlpha.200" color="white" fontSize="sm" px={3} py={1} borderRadius="full">
              Обои нового поколения
            </Badge>
            <Heading as="h1" size={{ base: '3xl', md: '5xl' }} lineHeight="1.1" maxW="4xl">
              Обои с зашитыми аффирмациями
            </Heading>
            <Text fontSize={{ base: 'lg', md: 'xl' }} maxW="3xl" opacity={0.92}>
              Эстетичный паттерн снаружи, мотивирующий смысл внутри. Дизайнерская графика с зашитыми словами — здоровье,
              сила, энергия, гармония — становится частью среды, в которой вы живёте.
            </Text>
            <HStack gap={4} pt={4} flexWrap="wrap">
              <Button bg="white" color="brand.700" size="lg" _hover={{ bg: 'gray.100' }} asChild>
                <NextLink href="/catalog">Каталог</NextLink>
              </Button>
              <Button
                variant="outline"
                color="white"
                borderColor="whiteAlpha.500"
                size="lg"
                _hover={{ bg: 'whiteAlpha.200' }}
                disabled
              >
                О бренде (скоро)
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Концепция */}
      <Box as="section" py={{ base: 16, md: 24 }}>
        <Container maxW="6xl">
          <VStack gap={4} align="flex-start" mb={12}>
            <Text color="brand.solid" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
              Что это
            </Text>
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }} maxW="3xl">
              Фон, который работает
            </Heading>
            <Text fontSize="lg" color="fg.muted" maxW="3xl">
              Обычные обои — это просто фон. НейроАбоИ — фон с задачей. То, что вы видите каждый день, формирует то, как
              вы думаете. Мы вплетаем в дизайнерскую графику слова и образы — здоровье, сила, энергия, гармония, любовь,
              успех — так, что глаз их не «читает», но мозг считывает.
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
            <Stack gap={3}>
              <Box
                w={12}
                h={12}
                borderRadius="lg"
                bg="brand.subtle"
                color="brand.solid"
                display="grid"
                placeItems="center"
                fontSize="2xl"
                fontWeight="bold"
              >
                1
              </Box>
              <Heading as="h3" size="lg">
                Дизайнерский паттерн
              </Heading>
              <Text color="fg.muted">Художник создаёт визуальный ритм — текстуру, орнамент, абстракцию.</Text>
            </Stack>
            <Stack gap={3}>
              <Box
                w={12}
                h={12}
                borderRadius="lg"
                bg="accent.subtle"
                color="accent.solid"
                display="grid"
                placeItems="center"
                fontSize="2xl"
                fontWeight="bold"
              >
                2
              </Box>
              <Heading as="h3" size="lg">
                Зашитая аффирмация
              </Heading>
              <Text color="fg.muted">
                В графику вплетаются слова и символы — так, что глаз их не «читает», а мозг считывает.
              </Text>
            </Stack>
            <Stack gap={3}>
              <Box
                w={12}
                h={12}
                borderRadius="lg"
                bg="brand.subtle"
                color="brand.solid"
                display="grid"
                placeItems="center"
                fontSize="2xl"
                fontWeight="bold"
              >
                3
              </Box>
              <Heading as="h3" size="lg">
                Эффект среды
              </Heading>
              <Text color="fg.muted">
                Пространство подсознательно поддерживает выбранное состояние — концентрацию, спокойствие, оптимизм.
              </Text>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Тех. характеристики */}
      <Box as="section" py={{ base: 16, md: 24 }} bg="bg.subtle">
        <Container maxW="6xl">
          <Stack direction={{ base: 'column', md: 'row' }} gap={12} align="flex-start">
            <VStack gap={4} align="flex-start" flex="1">
              <Text color="accent.solid" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                Технические характеристики
              </Text>
              <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
                Печатаем под заказ, отправляем на следующий день
              </Heading>
              <Text fontSize="lg" color="fg.muted">
                Флизелиновая основа, ширина рулона 1.07 м, продаём погонным метром. Печать на широкоформатном струйном
                принтере прямо в нашей студии.
              </Text>
            </VStack>

            <SimpleGrid columns={2} gap={6} flex="1">
              <SpecCard label="Основа" value="Флизелин" />
              <SpecCard label="Ширина рулона" value="1.07 м" />
              <SpecCard label="Продажа" value="От 1 пог. м" />
              <SpecCard label="Доставка" value="РФ, РБ, КЗ" />
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Дисклеймер */}
      <Box as="footer" py={10} borderTopWidth="1px" borderColor="border">
        <Container maxW="6xl">
          <Text fontSize="sm" color="fg.subtle" textAlign="center">
            НейроАбоИ — декоративный продукт. Не является медицинским изделием. Не предназначен для диагностики, лечения
            или профилактики заболеваний.
          </Text>
        </Container>
      </Box>
    </Box>
  )
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <Box bg="bg.surface" borderRadius="xl" p={5} borderWidth="1px" borderColor="border">
      <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={1}>
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="semibold">
        {value}
      </Text>
    </Box>
  )
}
