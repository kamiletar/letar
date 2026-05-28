'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  addPoemToAlbumAction,
  removePoemFromAlbumAction,
  reorderAlbumPoemsAction,
} from '@/app/my/poems/_actions/album.action'
import type { PoemOption } from '@/app/my/poems/_types/album.types'
import { Badge, Flex, Grid, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuArrowDown, LuArrowUp, LuMinus, LuPlus } from 'react-icons/lu'

interface AlbumPoemSelectorProps {
  albumId: string
  initialAlbumPoems: PoemOption[]
  allPoems: PoemOption[]
}

export function AlbumPoemSelector({ albumId, initialAlbumPoems, allPoems }: AlbumPoemSelectorProps) {
  const [albumPoems, setAlbumPoems] = useState<PoemOption[]>(initialAlbumPoems)
  const [loading, setLoading] = useState<string | null>(null)

  const albumPoemIds = new Set(albumPoems.map((p) => p.id))
  const available = allPoems.filter((p) => !albumPoemIds.has(p.id))

  const handleAdd = async (poem: PoemOption) => {
    setLoading(poem.id)
    try {
      const result = await addPoemToAlbumAction({ albumId, poemId: poem.id })
      if ('error' in result && result.error) {
        toaster.error({ title: typeof result.error === 'string' ? result.error : 'Ошибка' })
        return
      }
      setAlbumPoems((prev) => [...prev, poem])
    } finally {
      setLoading(null)
    }
  }

  const handleRemove = async (poem: PoemOption) => {
    setLoading(poem.id)
    try {
      const result = await removePoemFromAlbumAction({ albumId, poemId: poem.id })
      if ('error' in result && result.error) {
        toaster.error({ title: typeof result.error === 'string' ? result.error : 'Ошибка' })
        return
      }
      setAlbumPoems((prev) => prev.filter((p) => p.id !== poem.id))
    } finally {
      setLoading(null)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const newOrder = [...albumPoems]
    const target = index + direction
    if (target < 0 || target >= newOrder.length) {
      return
    }
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setAlbumPoems(newOrder)
    await reorderAlbumPoemsAction({ albumId, poemIds: newOrder.map((p) => p.id) })
  }

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
      {/* Стихи в альбоме */}
      <VStack align="stretch" gap={3}>
        <Heading size="sm">В альбоме ({albumPoems.length})</Heading>
        {albumPoems.length === 0 ? (
          <Text color="fg.muted" fontSize="sm" py={4} textAlign="center">
            Добавьте стихи из правой колонки
          </Text>
        ) : (
          albumPoems.map((poem, i) => (
            <Flex
              key={poem.id}
              align="center"
              gap={2}
              p={2}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="lg"
              bg="bg.subtle"
            >
              <Text fontSize="xs" color="fg.subtle" w={5} textAlign="right" flexShrink={0}>
                {i + 1}
              </Text>
              <Text flex={1} fontSize="sm" fontWeight="medium" lineClamp={1}>
                {poem.title}
              </Text>
              {!poem.published && (
                <Badge size="xs" colorPalette="gray">
                  черновик
                </Badge>
              )}
              <HStack gap={0}>
                <IconButton
                  aria-label="Вверх"
                  size="xs"
                  variant="ghost"
                  disabled={i === 0 || loading === poem.id}
                  onClick={() => move(i, -1)}
                >
                  <LuArrowUp />
                </IconButton>
                <IconButton
                  aria-label="Вниз"
                  size="xs"
                  variant="ghost"
                  disabled={i === albumPoems.length - 1 || loading === poem.id}
                  onClick={() => move(i, 1)}
                >
                  <LuArrowDown />
                </IconButton>
                <IconButton
                  aria-label="Убрать из альбома"
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  disabled={loading === poem.id}
                  onClick={() => handleRemove(poem)}
                >
                  <LuMinus />
                </IconButton>
              </HStack>
            </Flex>
          ))
        )}
      </VStack>

      {/* Доступные стихи */}
      <VStack align="stretch" gap={3}>
        <Heading size="sm">Все стихи ({available.length})</Heading>
        {available.length === 0 ? (
          <Text color="fg.muted" fontSize="sm" py={4} textAlign="center">
            Все стихи уже в альбоме
          </Text>
        ) : (
          available.map((poem) => (
            <Flex
              key={poem.id}
              align="center"
              gap={2}
              p={2}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="lg"
            >
              <Text flex={1} fontSize="sm" lineClamp={1}>
                {poem.title}
              </Text>
              {!poem.published && (
                <Badge size="xs" colorPalette="gray">
                  черновик
                </Badge>
              )}
              <IconButton
                aria-label="Добавить в альбом"
                size="xs"
                variant="ghost"
                colorPalette="green"
                disabled={loading === poem.id}
                onClick={() => handleAdd(poem)}
              >
                <LuPlus />
              </IconButton>
            </Flex>
          ))
        )}
      </VStack>
    </Grid>
  )
}
