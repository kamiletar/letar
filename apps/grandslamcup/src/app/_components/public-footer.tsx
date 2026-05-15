'use client'

/**
 * Footer публичной части — city-aware ссылки.
 * Трёхколоночная раскладка на desktop, VStack на мобильных.
 * cityTelegramMap (slug -> url) передаётся из серверного layout.
 */

import { Box, Container, Flex, HStack, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuHeart, LuSend } from 'react-icons/lu'

/** Известные глобальные префиксы */
const GLOBAL_PREFIXES = ['news', 'rules', 'donate', 'admin', 'api', 'match', 'auth', 'coach']

function extractCitySlug(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const first = segments[0]
  if (!first || GLOBAL_PREFIXES.includes(first)) {
    return null
  }
  return first
}

interface PublicFooterProps {
  /** Маппинг citySlug -> telegramLink (передаётся из server layout) */
  cityTelegramMap?: Record<string, string>
}

export function PublicFooter({ cityTelegramMap }: PublicFooterProps) {
  const pathname = usePathname()
  const citySlug = extractCitySlug(pathname)
  const prefix = citySlug ? `/${citySlug}` : ''

  // На главной (выбор города) footer не показываем
  const isHome = pathname === '/'
  if (isHome) {
    return null
  }

  const telegramLink = citySlug ? cityTelegramMap?.[citySlug] : undefined

  /** Навигация по турниру */
  const tournamentLinks = [
    { href: `${prefix}/standings`, label: 'Таблица' },
    { href: `${prefix}/schedule`, label: 'Расписание' },
    { href: `${prefix}/bracket`, label: 'Сетка' },
    { href: `${prefix}/teams`, label: 'Команды' },
    { href: `${prefix}/players`, label: 'Поэты' },
    { href: `${prefix}/venues`, label: 'Стадионы' },
  ]

  /** Общие ссылки */
  const generalLinks = [
    { href: '/news', label: 'Новости' },
    { href: `${prefix}/rules`, label: 'Правила' },
    { href: `${prefix}/suspensions`, label: 'Дисциплина' },
    { href: '/donate', label: 'Поддержать' },
  ]

  return (
    <Box position="relative" asChild>
      <footer>
        {/* Градиентная линия сверху */}
        <Box h="2px" bgGradient="to-r" gradientFrom="brand.solid" gradientVia="brand.400" gradientTo="accent.solid" />

        <Box bg="gray.900" color="gray.400" py={{ base: 8, md: 10 }}>
          <Container maxW="container.xl">
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 8, md: 10 }}>
              {/* Колонка 1: Лого + описание */}
              <VStack align={{ base: 'center', md: 'flex-start' }} gap={3}>
                <Flex align="center" gap={2}>
                  <Image src="/logo.svg" alt="Grand Slam Cup" h={8} w="auto" />
                  <Text fontWeight="bold" fontSize="lg" color="white">
                    GrandSlam Cup
                  </Text>
                </Flex>
                <Text fontSize="sm" color="gray.500" textAlign={{ base: 'center', md: 'left' }}>
                  Первый в России командный поэтический турнир в формате poetry-clash
                </Text>
              </VStack>

              {/* Колонка 2: Нави��ация */}
              <SimpleGrid columns={2} gap={2}>
                <VStack align="flex-start" gap={2}>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Турнир
                  </Text>
                  {tournamentLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Text fontSize="sm" color="gray.400" _hover={{ color: 'white' }} transition="color 0.15s">
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </VStack>
                <VStack align="flex-start" gap={2}>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color="gray.500"
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    Ещё
                  </Text>
                  {generalLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Text fontSize="sm" color="gray.400" _hover={{ color: 'white' }} transition="color 0.15s">
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </VStack>
              </SimpleGrid>

              {/* Колонка 3: Социальные + copyright */}
              <VStack align={{ base: 'center', md: 'flex-end' }} gap={3}>
                <HStack gap={3}>
                  {telegramLink && (
                    <Link href={telegramLink} target="_blank" rel="noopener noreferrer">
                      <Flex
                        align="center"
                        gap={1.5}
                        px={3}
                        py={1.5}
                        borderRadius="md"
                        bg="gray.800"
                        fontSize="sm"
                        color="gray.300"
                        _hover={{ bg: 'gray.700', color: 'white' }}
                        transition="all 0.15s"
                      >
                        <LuSend size={14} />
                        Telegram
                      </Flex>
                    </Link>
                  )}
                  <Link href="/donate">
                    <Flex
                      align="center"
                      gap={1.5}
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      bg="gray.800"
                      fontSize="sm"
                      color="gray.300"
                      _hover={{ bg: 'gray.700', color: 'brand.400' }}
                      transition="all 0.15s"
                    >
                      <LuHeart size={14} />
                      Поддержать
                    </Flex>
                  </Link>
                </HStack>
                <Text fontSize="xs" color="gray.600">
                  Grand Slam Cup {new Date().getFullYear()}
                </Text>
              </VStack>
            </SimpleGrid>
          </Container>
        </Box>
      </footer>
    </Box>
  )
}
