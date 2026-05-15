'use client'

import { Badge, Box, Card, Container, Flex, Heading, HStack, Input, Link, Text, VStack } from '@chakra-ui/react'
import type { FuseResultMatch } from 'fuse.js'
import NextLink from 'next/link'
import { LuSearch } from 'react-icons/lu'

import { useSearch } from '@/hooks/use-search'
import { Footer } from '../_components/footer'
import { Header } from '../_components/header'
import { Highlight } from '../_components/highlight'

export default function SearchPage() {
  const { query, setQuery, groupedResults, hasResults, isSearching } = useSearch()

  return (
    <Flex direction="column" minH="100vh">
      <Header />

      <Container maxW="container.md" py={8} flex="1">
        <VStack align="stretch" gap={6}>
          <Heading as="h1" size="lg">
            Поиск по законодательству
          </Heading>

          {/* Поле поиска */}
          <Box position="relative">
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
              <LuSearch />
            </Box>
            <Input
              pl={10}
              size="lg"
              placeholder="Введите запрос (например: убийство, дуэль, сословие)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </Box>

          {/* Подсказка */}
          {!isSearching && (
            <Text color="fg.muted" fontSize="sm">
              Введите минимум 2 символа для поиска. Индекс содержит 1337 статей из 22 документов.
            </Text>
          )}

          {/* Результаты */}
          {isSearching && !hasResults && <Text color="fg.muted">Ничего не найдено по запросу «{query}»</Text>}

          {hasResults && (
            <VStack align="stretch" gap={6}>
              <Text color="fg.muted" fontSize="sm">
                Найдено {groupedResults.reduce((acc, g) => acc + g.items.length, 0)} результатов
              </Text>

              {groupedResults.map((group) => (
                <Card.Root key={group.title} p={4}>
                  <HStack mb={3}>
                    <Heading size="sm">{group.title}</Heading>
                    <Badge colorPalette="brand" size="sm">
                      {group.category}
                    </Badge>
                  </HStack>

                  <VStack align="stretch" gap={2}>
                    {group.items.map(({ item, matches }) => (
                      <Link asChild key={item.id} display="block" p={2} borderRadius="md" _hover={{ bg: 'bg.subtle' }}>
                        <NextLink href={item.href}>
                          <Text fontSize="sm">
                            {item.articleNumber && (
                              <Text as="span" fontWeight="semibold" color="brand.600">
                                Статья {item.articleNumber}.{' '}
                              </Text>
                            )}
                            <Text as="span" color="fg.muted">
                              <Highlight
                                text={item.content}
                                matches={matches as FuseResultMatch[]}
                                fieldKey="content"
                                maxLength={150}
                              />
                            </Text>
                          </Text>
                        </NextLink>
                      </Link>
                    ))}
                  </VStack>
                </Card.Root>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Футер с дисклеймером */}
      <Footer />
    </Flex>
  )
}
