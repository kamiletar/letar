import { Badge, Box, Card, Container, Flex, Heading, HStack, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import NextLink from 'next/link'
import { LuBookOpen, LuFileText, LuGavel, LuScroll, LuShield } from 'react-icons/lu'

import { Footer } from './_components/footer'
import { Header } from './_components/header'
import { navData } from './_components/sidebar'

export default function HomePage() {
  return (
    <Flex direction="column" minH="100vh">
      <Header />

      {/* Hero секция */}
      <Box bg="brand.600" _dark={{ bg: 'brand.800' }} color="white" py={{ base: 12, md: 20 }} textAlign="center">
        <Container maxW="container.lg">
          <Image src="/het.svg" alt="Герб" width={96} height={96} style={{ margin: '0 auto 16px' }} />
          <Heading as="h1" size="2xl" mb={4}>
            Свод законов Российской Федерации
          </Heading>
          <Text fontSize="lg" opacity={0.9} maxW="600px" mx="auto">
            Полное собрание действующего законодательства: Конституция, кодексы, уставы и регламенты
          </Text>
          <HStack justify="center" mt={6} gap={4}>
            <Badge colorPalette="yellow" size="lg" px={3} py={1}>
              22 документа
            </Badge>
            <Badge colorPalette="green" size="lg" px={3} py={1}>
              Действующая редакция
            </Badge>
          </HStack>
        </Container>
      </Box>

      {/* Основные законы */}
      <Container maxW="container.lg" py={12}>
        <Heading as="h2" size="lg" mb={6} textAlign="center">
          Основные законы
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
          <Link asChild _hover={{ textDecoration: 'none' }}>
            <NextLink href="/constitution">
              <Card.Root
                p={6}
                _hover={{ shadow: 'lg', borderColor: 'brand.500' }}
                transition="all 0.2s"
                borderWidth="2px"
                borderColor="transparent"
              >
                <HStack mb={3}>
                  <Box color="brand.500" fontSize="2xl">
                    <LuScroll />
                  </Box>
                  <Heading size="md">Конституция</Heading>
                </HStack>
                <Text color="fg.muted" fontSize="sm">
                  Основной закон государства. Определяет государственный строй, права и обязанности граждан, сословную
                  систему и неприкосновенные Традиции.
                </Text>
              </Card.Root>
            </NextLink>
          </Link>

          <Link asChild _hover={{ textDecoration: 'none' }}>
            <NextLink href="/pravda">
              <Card.Root
                p={6}
                _hover={{ shadow: 'lg', borderColor: 'brand.500' }}
                transition="all 0.2s"
                borderWidth="2px"
                borderColor="transparent"
              >
                <HStack mb={3}>
                  <Box color="brand.500" fontSize="2xl">
                    <LuBookOpen />
                  </Box>
                  <Heading size="md">Русская Правда</Heading>
                </HStack>
                <Text color="fg.muted" fontSize="sm">
                  Свод законов России, продолжающий традиции Русской Правды 1016 года. Регулирует гражданские, уголовные
                  и сословные отношения.
                </Text>
              </Card.Root>
            </NextLink>
          </Link>
        </SimpleGrid>
      </Container>

      {/* Категории документов */}
      <Box bg="bg.subtle" py={12}>
        <Container maxW="container.lg">
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
            {/* Кодексы */}
            <VStack align="start">
              <HStack mb={2}>
                <Box color="brand.500" fontSize="xl">
                  <LuGavel />
                </Box>
                <Heading size="md">Кодексы</Heading>
                <Badge colorPalette="brand">{navData[1].items.length}</Badge>
              </HStack>
              <VStack align="start" gap={1}>
                {navData[1].items.slice(0, 5).map((item) => (
                  <Link asChild key={item.href} fontSize="sm" color="fg.muted" _hover={{ color: 'brand.600' }}>
                    <NextLink href={item.href}>{item.title}</NextLink>
                  </Link>
                ))}
                <Link asChild fontSize="sm" color="brand.600" fontWeight="medium">
                  <NextLink href="/codes">Все кодексы →</NextLink>
                </Link>
              </VStack>
            </VStack>

            {/* Уставы */}
            <VStack align="start">
              <HStack mb={2}>
                <Box color="brand.500" fontSize="xl">
                  <LuFileText />
                </Box>
                <Heading size="md">Уставы</Heading>
                <Badge colorPalette="brand">{navData[2].items.length}</Badge>
              </HStack>
              <VStack align="start" gap={1}>
                {navData[2].items.slice(0, 5).map((item) => (
                  <Link asChild key={item.href} fontSize="sm" color="fg.muted" _hover={{ color: 'brand.600' }}>
                    <NextLink href={item.href}>{item.title}</NextLink>
                  </Link>
                ))}
                <Link asChild fontSize="sm" color="brand.600" fontWeight="medium">
                  <NextLink href="/statutes">Все уставы →</NextLink>
                </Link>
              </VStack>
            </VStack>

            {/* Регламенты */}
            <VStack align="start">
              <HStack mb={2}>
                <Box color="brand.500" fontSize="xl">
                  <LuShield />
                </Box>
                <Heading size="md">Регламенты</Heading>
                <Badge colorPalette="brand">{navData[3].items.length}</Badge>
              </HStack>
              <VStack align="start" gap={1}>
                {navData[3].items.map((item) => (
                  <Link asChild key={item.href} fontSize="sm" color="fg.muted" _hover={{ color: 'brand.600' }}>
                    <NextLink href={item.href}>{item.title}</NextLink>
                  </Link>
                ))}
                <Link asChild fontSize="sm" color="brand.600" fontWeight="medium">
                  <NextLink href="/regulations">Все регламенты →</NextLink>
                </Link>
              </VStack>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Футер с дисклеймером */}
      <Footer />
    </Flex>
  )
}
