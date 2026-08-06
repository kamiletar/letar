'use client'

import {
  Box,
  Button,
  Card,
  Container,
  EmptyState,
  Flex,
  Heading,
  HStack,
  IconButton,
  Link,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuBookmark, LuExternalLink, LuTrash2 } from 'react-icons/lu'

import { useBookmarks } from '@/hooks/use-bookmarks'
import { Footer } from '../_components/footer'
import { Header } from '../_components/header'

/**
 * Страница закладок пользователя.
 * Показывает сохранённые статьи с возможностью перехода и удаления.
 */
export default function BookmarksPage() {
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks()

  // Группируем закладки по категориям
  const groupedBookmarks = bookmarks.reduce(
    (acc, bookmark) => {
      const category = bookmark.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(bookmark)
      return acc
    },
    {} as Record<string, typeof bookmarks>,
  )

  const categories = Object.keys(groupedBookmarks)

  return (
    <Flex direction="column" minH="100vh">
      <Header />
      <Container maxW="container.lg" py={8} flex="1">
        <VStack align="stretch" gap={6}>
          {/* Заголовок */}
          <Flex justify="space-between" align="center">
            <Heading as="h1" size="xl">
              <HStack gap={2}>
                <LuBookmark />
                <span>Закладки</span>
              </HStack>
            </Heading>
            {bookmarks.length > 0 && (
              <Button variant="ghost" colorPalette="red" size="sm" onClick={clearBookmarks}>
                <LuTrash2 />
                Очистить все
              </Button>
            )}
          </Flex>

          {/* Пустое состояние */}
          {bookmarks.length === 0 && (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <LuBookmark />
                </EmptyState.Indicator>
                <EmptyState.Title>Нет закладок</EmptyState.Title>
                <EmptyState.Description>
                  Добавляйте статьи в закладки, чтобы быстро находить их здесь
                </EmptyState.Description>
              </EmptyState.Content>
            </EmptyState.Root>
          )}

          {/* Закладки по категориям */}
          {categories.map((category) => (
            <Box key={category}>
              <Heading size="md" mb={3} color="fg.muted">
                {category}
              </Heading>
              <Stack gap={2}>
                {groupedBookmarks[category].map((bookmark) => (
                  <Card.Root key={bookmark.id} size="sm" variant="outline">
                    <Card.Body py={3}>
                      <Flex justify="space-between" align="center" gap={4}>
                        <Box flex="1" minW={0}>
                          <HStack gap={2}>
                            <Text fontWeight="bold" color="brand.600" _dark={{ color: 'brand.400' }}>
                              Статья {bookmark.articleNumber}
                            </Text>
                            <Text color="fg.muted">—</Text>
                            <Text color="fg.muted" truncate>
                              {bookmark.title}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="fg.subtle">
                            Добавлено: {new Date(bookmark.addedAt).toLocaleDateString('ru-RU')}
                          </Text>
                        </Box>
                        <HStack gap={1}>
                          <Link asChild>
                            <NextLink href={bookmark.href}>
                              <IconButton
                                aria-label="Перейти к статье"
                                title="Перейти к статье"
                                variant="ghost"
                                size="sm"
                              >
                                <LuExternalLink />
                              </IconButton>
                            </NextLink>
                          </Link>
                          <IconButton
                            aria-label="Удалить закладку"
                            title="Удалить закладку"
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            onClick={() => removeBookmark(bookmark.id)}
                          >
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Flex>
                    </Card.Body>
                  </Card.Root>
                ))}
              </Stack>
            </Box>
          ))}

          {/* Ссылка на главную */}
          {bookmarks.length > 0 && (
            <Box textAlign="center" pt={4}>
              <Link asChild color="brand.500">
                <NextLink href="/">← Вернуться к документам</NextLink>
              </Link>
            </Box>
          )}
        </VStack>
      </Container>

      {/* Футер с дисклеймером */}
      <Footer />
    </Flex>
  )
}
