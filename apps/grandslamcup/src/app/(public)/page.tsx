/**
 * Главная страница — лендинг с выбором города.
 *
 * Полноэкранный градиентный фон, glassmorphism-карточки городов,
 * staggered fade-in анимации.
 */

import { prisma } from '@/lib/db'
import { Box, Circle, Flex, Heading, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LuMapPin, LuTrophy, LuUsers } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Grand Slam Cup — Турнир поэтов',
  description: 'Кубок Большого Слэма — первый в России командный поэтический турнир',
  alternates: { canonical: '/' },
}

export default async function CitySelectorPage() {
  const cities = await prisma.city.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { teams: true, venues: true } },
      seasons: {
        where: { status: 'ACTIVE' },
        select: { name: true },
        take: 1,
      },
    },
  })

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="calc(100dvh - 64px)"
      mx={{ base: -4, md: -6 }}
      mt={-6}
      mb={-6}
      px={{ base: 4, md: 6 }}
      position="relative"
      overflow="hidden"
      bg="gray.900"
      bgGradient="to-b"
      gradientFrom="brand.950"
      gradientVia="gray.900"
      gradientTo="gray.950"
    >
      {/* Dot pattern overlay */}
      <Box
        position="absolute"
        inset={0}
        opacity={0.03}
        backgroundImage="radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)"
        backgroundSize="32px 32px"
        pointerEvents="none"
      />
      {/* Декоративные blurred-круги */}
      <Box
        position="absolute"
        top="-120px"
        right="-80px"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="brand.500"
        opacity={0.06}
        filter="blur(80px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-100px"
        left="-60px"
        w="300px"
        h="300px"
        borderRadius="full"
        bg="brand.600"
        opacity={0.04}
        filter="blur(60px)"
        pointerEvents="none"
      />
      {/* Третий декоративный круг — accent */}
      <Box
        position="absolute"
        top="40%"
        left="-120px"
        w="250px"
        h="250px"
        borderRadius="full"
        bg="accent.500"
        opacity={0.03}
        filter="blur(60px)"
        pointerEvents="none"
      />

      {/* Контент по центру */}
      <VStack gap={{ base: 8, md: 10 }} position="relative" maxW="700px" w="full" pt={{ base: 4, md: 0 }}>
        {/* Hero */}
        <VStack gap={4} textAlign="center" className="fade-in-up">
          <Image src="/logo.svg" alt="Grand Slam Cup" h={{ base: 16, md: 20 }} w="auto" />
          <Heading as="h1" size={{ base: '3xl', md: '5xl' }} color="white" letterSpacing="tight" lineHeight="1.1">
            Grand Slam{' '}
            <Box color="brand.400" display="inline">
              Cup
            </Box>
          </Heading>
          <Text fontSize={{ base: 'md', md: 'xl' }} color="whiteAlpha.700" maxW="500px" lineHeight="tall">
            Первый в России командный поэтический турнир
          </Text>
        </VStack>

        {/* Разделитель — подзаголовок */}
        <Text
          fontSize="xs"
          fontWeight="semibold"
          letterSpacing="widest"
          textTransform="uppercase"
          color="whiteAlpha.500"
          className="fade-in-up"
          style={{ animationDelay: '0.1s' }}
        >
          Выберите город
        </Text>

        {/* Карточки городов */}
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={5} w="full">
          {cities.map((city, index) => {
            const activeSeason = city.seasons[0]

            return (
              <Link key={city.id} href={`/${city.slug}`}>
                <Box
                  className="fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  bg="whiteAlpha.50"
                  backdropFilter="blur(8px)"
                  borderWidth="1px"
                  borderColor="whiteAlpha.100"
                  borderRadius="2xl"
                  p={{ base: 6, md: 8 }}
                  textAlign="center"
                  position="relative"
                  overflow="hidden"
                  transitionProperty="background-color, border-color, transform, box-shadow"
                  transitionDuration="0.3s"
                  transitionTimingFunction="ease"
                  cursor="pointer"
                  _hover={{
                    bg: 'whiteAlpha.100',
                    borderColor: 'brand.500/40',
                    transform: 'translateY(-4px)',
                    shadow: '0 0 30px rgba(255,0,0,0.15), 0 8px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Декоративная линия сверху */}
                  <Box
                    position="absolute"
                    top={0}
                    left="20%"
                    right="20%"
                    h="2px"
                    bgGradient="to-r"
                    gradientFrom="transparent"
                    gradientVia="brand.500"
                    gradientTo="transparent"
                    opacity={0.5}
                  />

                  <VStack gap={4}>
                    <Circle size={12} bg="brand.500/10" color="brand.400">
                      <LuMapPin size={24} />
                    </Circle>

                    <Heading size={{ base: 'xl', md: '2xl' }} color="white">
                      {city.name}
                    </Heading>

                    {activeSeason && (
                      <Box
                        px={3}
                        py={1}
                        bg="brand.500/15"
                        borderRadius="full"
                        fontSize="xs"
                        color="brand.300"
                        fontWeight="medium"
                      >
                        <LuTrophy size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {activeSeason.name}
                      </Box>
                    )}

                    <Text fontSize="sm" color="whiteAlpha.600">
                      <LuUsers size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {city._count.teams} команд · {city._count.venues} стадионов
                    </Text>
                  </VStack>
                </Box>
              </Link>
            )
          })}
        </SimpleGrid>

        {/* Нижний отступ для визуального баланса */}
        <Box h={4} />
      </VStack>
    </Flex>
  )
}
