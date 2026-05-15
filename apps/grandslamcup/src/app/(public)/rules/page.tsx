/**
 * Страница правил — выбор города
 */

import { Box, Card, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LuBookOpen } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Правила и регламент',
  description: 'Правила и регламент Кубка Большого Слэма по городам',
  alternates: { canonical: '/rules' },
}

export default function RulesIndexPage() {
  const cities = [
    {
      slug: 'moskva',
      name: 'Москва',
      season: 'Сезон 2026',
      description: 'Швейцарская система + Double Elimination плей-офф, 16 команд',
    },
    {
      slug: 'spb',
      name: 'Санкт-Петербург',
      season: 'Сезон 2025-2026',
      description: 'Round-robin, Высшая лига + Первая лига, 16 команд',
    },
  ]

  return (
    <VStack gap={8} align="stretch">
      <VStack gap={2}>
        <Heading as="h1" size="2xl">
          Правила и регламент
        </Heading>
        <Text color="fg.muted">Выберите город для просмотра правил</Text>
      </VStack>

      <Flex gap={6} wrap="wrap" justify="center">
        {cities.map((city) => (
          <Link key={city.slug} href={`/${city.slug}/rules`}>
            <Card.Root
              w="320px"
              _hover={{ shadow: 'lg', borderColor: 'brand.fg' }}
              transition="all 0.2s"
              cursor="pointer"
            >
              <Card.Body>
                <VStack gap={3} align="start">
                  <Flex align="center" gap={2}>
                    <Box color="brand.fg">
                      <LuBookOpen size={24} />
                    </Box>
                    <Heading size="lg">{city.name}</Heading>
                  </Flex>
                  <Text fontSize="sm" color="fg.muted">
                    {city.season}
                  </Text>
                  <Text fontSize="sm">{city.description}</Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </Flex>
    </VStack>
  )
}
