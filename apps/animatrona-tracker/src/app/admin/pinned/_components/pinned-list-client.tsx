'use client'

/**
 * Клиент страницы запиненных аниме
 *
 * Показывает список аниме, которые запинены на серверах,
 * с информацией о размере, серверах и количестве CID.
 */

import { formatFileSize } from '@/lib/ipfs'
import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import NextLink from 'next/link'
import { LuArrowLeft, LuPin, LuServer } from 'react-icons/lu'

/** Запиненное аниме (ответ API) */
interface PinnedAnime {
  anime: {
    id: string
    title: string
    coverUrl: string | null
    shikimoriId: number | null
  }
  totalSize: number
  servers: Array<{ id: string; name: string; status: string }>
  pinnedAt: string
  cidCount: number
  createdBy: { id: string; name: string | null }
}

interface PinnedResponse {
  data: PinnedAnime[]
  total: number
}

/** Загрузить список запиненных аниме */
async function fetchPinned(): Promise<PinnedResponse> {
  const res = await fetch('/api/admin/pinned')
  if (!res.ok) {
    throw new Error('Ошибка загрузки')
  }
  return res.json()
}

export function PinnedListClient() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'pinned'],
    queryFn: fetchPinned,
  })

  const items = data?.data ?? []

  return (
    <Box minH="100vh" bg="bg">
      {/* Header */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack gap={4}>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/admin?tab=pinjobs">
                  <Icon as={LuArrowLeft} mr={2} />
                  Админ-панель
                </NextLink>
              </Button>
              <Heading size="lg">
                <Icon as={LuPin} mr={2} />
                Запиненные аниме ({data?.total ?? 0})
              </Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        {isLoading
          ? (
            <Center py={12}>
              <Spinner size="lg" />
            </Center>
          )
          : isError
          ? (
            <Center py={12}>
              <VStack gap={2}>
                <Text color="red.500">Ошибка загрузки</Text>
                <Button size="sm" onClick={() => refetch()}>
                  Повторить
                </Button>
              </VStack>
            </Center>
          )
          : items.length === 0
          ? (
            <Center py={12}>
              <VStack gap={2}>
                <Icon as={LuPin} boxSize={12} color="fg.muted" />
                <Text color="fg.muted" fontSize="lg">
                  Нет запиненных аниме
                </Text>
              </VStack>
            </Center>
          )
          : (
            <VStack align="stretch" gap={4}>
              {/* Общий размер */}
              <Text fontSize="sm" color="fg.muted">
                Общий размер: {formatFileSize(items.reduce((sum, item) => sum + item.totalSize, 0))}
              </Text>

              {items.map((item) => (
                <Box key={item.anime.id} bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
                  <Flex justify="space-between" align="center" mb={2}>
                    <HStack gap={3}>
                      <Text fontWeight="semibold" fontSize="lg">
                        {item.anime.title}
                      </Text>
                      {item.anime.shikimoriId && (
                        <Badge colorPalette="purple" size="sm">
                          #{item.anime.shikimoriId}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {new Date(item.pinnedAt).toLocaleString('ru')}
                    </Text>
                  </Flex>

                  <HStack gap={4} flexWrap="wrap">
                    <Text fontSize="sm" color="fg.muted">
                      {formatFileSize(item.totalSize)}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {item.cidCount} CID
                    </Text>
                    {item.createdBy.name && (
                      <Text fontSize="sm" color="fg.muted">
                        Автор: {item.createdBy.name}
                      </Text>
                    )}
                  </HStack>

                  {/* Серверы */}
                  <HStack gap={2} mt={2}>
                    <Icon as={LuServer} color="fg.muted" boxSize={4} />
                    {item.servers.map((server) => (
                      <Badge key={server.id} colorPalette={server.status === 'ONLINE' ? 'green' : 'gray'} size="sm">
                        {server.name}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
      </Container>
    </Box>
  )
}
