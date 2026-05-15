'use client'

import { Box, Button, Collapsible, Flex, HStack, IconButton, Spinner, Stack, Text } from '@chakra-ui/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useTransition } from 'react'
import { LuCalendar, LuChevronDown, LuHistory, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { Tooltip } from '@letar/ui'

import { type CustomBreakData, deleteCustomBreak, getPastBreaks } from '../_actions/custom-breaks.action'

interface PastBreaksListProps {
  onDelete?: (id: string) => void
}

export function PastBreaksList({ onDelete }: PastBreaksListProps) {
  const [isPending, startTransition] = useTransition()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['past-breaks'],
    queryFn: async ({ pageParam }) => {
      return getPastBreaks(pageParam, 10)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Intersection Observer для infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCustomBreak(id)
      if (result.success) {
        onDelete?.(id)
        refetch()
        toaster.success({ title: 'Перерыв удалён' })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  const allBreaks = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  if (isLoading) {
    return (
      <Box py={4} textAlign="center">
        <Spinner size="sm" />
      </Box>
    )
  }

  if (totalCount === 0) {
    return null
  }

  return (
    <Collapsible.Root>
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="sm" width="full" justifyContent="space-between" mt={4}>
          <HStack gap={2}>
            <LuHistory />
            <Text>Прошедшие перерывы ({totalCount})</Text>
          </HStack>
          <Collapsible.Indicator transition="transform 0.2s" _open={{ transform: 'rotate(180deg)' }}>
            <LuChevronDown />
          </Collapsible.Indicator>
        </Button>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <Stack gap={2} mt={2} maxH="300px" overflowY="auto">
          {allBreaks.map((breakItem) => (
            <PastBreakCard key={breakItem.id} breakItem={breakItem} onDelete={handleDelete} isPending={isPending} />
          ))}

          {/* Элемент для Intersection Observer */}
          <Box ref={loadMoreRef} h="1px" />

          {isFetchingNextPage && (
            <Box py={2} textAlign="center">
              <Spinner size="sm" />
            </Box>
          )}

          {!hasNextPage && allBreaks.length > 0 && (
            <Text fontSize="xs" color="fg.muted" textAlign="center" py={2}>
              Показаны все {totalCount} перерывов
            </Text>
          )}
        </Stack>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

interface PastBreakCardProps {
  breakItem: CustomBreakData
  onDelete: (id: string) => void
  isPending: boolean
}

function PastBreakCard({ breakItem, onDelete, isPending }: PastBreakCardProps) {
  return (
    <Flex align="center" justify="space-between" p={2} bg="bg.muted" borderRadius="md" opacity={0.7}>
      <HStack gap={2}>
        <Tooltip content="Прошедший перерыв">
          <Box color="fg.muted">
            <LuCalendar size={14} />
          </Box>
        </Tooltip>
        <Box>
          <Text fontSize="sm">
            {breakItem.reason || 'Перерыв'}{' '}
            <Text as="span" color="fg.muted">
              {breakItem.startTime} - {breakItem.endTime}
            </Text>
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {breakItem.specificDate
              ? new Date(breakItem.specificDate).toLocaleDateString('ru-RU', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Дата не указана'}
          </Text>
        </Box>
      </HStack>
      <Tooltip content="Удалить из истории">
        <IconButton
          aria-label="Удалить"
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={() => onDelete(breakItem.id)}
          disabled={isPending}
        >
          <LuTrash2 size={14} />
        </IconButton>
      </Tooltip>
    </Flex>
  )
}
