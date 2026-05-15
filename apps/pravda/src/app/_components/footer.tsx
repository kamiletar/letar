import { Box, Container, Flex, HStack, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { LuFileText, LuGavel, LuScroll, LuShield } from 'react-icons/lu'

import packageJson from '../../../package.json'
import { navData } from './sidebar/nav-data'

/** Иконки для категорий */
const CATEGORY_ICONS: Record<string, ReactNode> = {
  'Основные законы': <LuScroll aria-hidden="true" />,
  Кодексы: <LuGavel aria-hidden="true" />,
  Уставы: <LuFileText aria-hidden="true" />,
  Регламенты: <LuShield aria-hidden="true" />,
}

/** Короткие названия для категорий */
const CATEGORY_SHORT_NAMES: Record<string, string> = {
  'Основные законы': 'Основные',
  Кодексы: 'Кодексы',
  Уставы: 'Уставы',
  Регламенты: 'Регламенты',
}

/** Ссылки "Все ..." для категорий */
const CATEGORY_ALL_LINKS: Record<string, string> = {
  Кодексы: '/codes',
  Уставы: '/statutes',
  Регламенты: '/regulations',
}

/**
 * Футер с навигацией и дисклеймером.
 * Содержит ссылки на основные разделы и объясняет
 * литературно-юмористический характер проекта.
 * Использует navData для DRY.
 */
export function Footer() {
  return (
    <Box as="footer" role="contentinfo" bg="bg.subtle" mt="auto" data-print-hide>
      {/* Декоративный градиент-разделитель */}
      <Box h="2px" bgGradient="to-r" gradientFrom="brand.500" gradientVia="accent.500" gradientTo="brand.500" />

      {/* Навигация по разделам (генерируется из navData) */}
      <Container maxW="container.xl" py={8}>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={{ base: 6, md: 8 }} mb={8}>
          {navData.map((section) => (
            <VStack key={section.title} align="start" gap={2}>
              <HStack color="brand.500" mb={1}>
                {CATEGORY_ICONS[section.title]}
                <Text fontWeight="semibold" fontSize="sm">
                  {CATEGORY_SHORT_NAMES[section.title] || section.title}
                </Text>
              </HStack>

              {/* Первые 2 элемента */}
              {section.items.slice(0, 2).map((item) => (
                <Link key={item.href} asChild fontSize="sm" color="fg.muted" _hover={{ color: 'brand.600' }}>
                  <NextLink href={item.href}>{item.title}</NextLink>
                </Link>
              ))}

              {/* Ссылка "Все ..." если есть */}
              {CATEGORY_ALL_LINKS[section.title] && (
                <Link asChild fontSize="sm" color="brand.600" fontWeight="medium" _hover={{ color: 'brand.700' }}>
                  <NextLink href={CATEGORY_ALL_LINKS[section.title]}>Все {section.title.toLowerCase()}</NextLink>
                </Link>
              )}
            </VStack>
          ))}
        </SimpleGrid>

        {/* Разделитель */}
        <Box h="1px" bg="border" mb={6} />

        {/* Дисклеймер и копирайт */}
        <VStack gap={4} textAlign="center">
          <Text fontSize="sm" color="fg.muted" maxW="3xl" lineHeight="tall">
            Это литературно-юмористический проект, посвящённый законодательству страны из альтернативной вселенной, в
            которой сохранились традиции XI века. Все документы, персонажи и события являются вымышленными.
          </Text>

          <Flex
            direction={{ base: 'column', sm: 'row' }}
            gap={{ base: 2, sm: 6 }}
            align="center"
            justify="center"
            fontSize="xs"
            color="fg.subtle"
          >
            <Text>
              Лицензия{' '}
              <Link
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                color="brand.500"
                _hover={{ textDecoration: 'underline' }}
              >
                MIT
              </Link>
            </Text>
            <Text display={{ base: 'none', sm: 'block' }} aria-hidden="true">
              |
            </Text>
            <Text>© {new Date().getFullYear()} Pravda Project</Text>
            <Text display={{ base: 'none', sm: 'block' }} aria-hidden="true">
              |
            </Text>
            <Text>v{packageJson.version}</Text>
          </Flex>
        </VStack>
      </Container>
    </Box>
  )
}
