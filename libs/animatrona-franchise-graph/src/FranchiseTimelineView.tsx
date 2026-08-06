'use client'

/**
 * Таймлайн франшизы по годам
 *
 * Группирует аниме по году выхода. Горизонтальный скролл колонок,
 * внутри каждой колонки — карточки аниме с постерами.
 */

import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react'
import type { FranchiseGraphDocument, FranchiseGraphNode } from '@letar/animatrona-types'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { LuCheck } from 'react-icons/lu'

import { computeChronologicalOrder } from './compute-chronological-order'
import { KIND_LABELS } from './types'

export interface FranchiseTimelineViewProps {
  /** Граф франшизы из IPFS */
  graph: FranchiseGraphDocument
  /** Shikimori ID текущего аниме */
  currentShikimoriId?: number
  /** Маппинг shikimoriId → slug для навигации */
  libraryMap?: Map<number, string>
}

/** Узел с вычисленными данными */
interface EnrichedNode extends FranchiseGraphNode {
  order: number
  isInLibrary: boolean
  librarySlug?: string
}

/** Группа по году */
interface YearGroup {
  year: number | 'unknown'
  nodes: EnrichedNode[]
}

export function FranchiseTimelineView({
  graph,
  currentShikimoriId,
  libraryMap = new Map(),
}: FranchiseTimelineViewProps) {
  const router = useRouter()

  /** Группировка по годам, сортировка хронологически */
  const yearGroups = useMemo((): YearGroup[] => {
    const chronoOrder = computeChronologicalOrder(graph)
    const groups = new Map<number | 'unknown', EnrichedNode[]>()

    for (const node of graph.nodes) {
      const year: number | 'unknown' = node.year ?? 'unknown'
      if (!groups.has(year)) {
        groups.set(year, [])
      }

      groups.get(year)!.push({
        ...node,
        order: chronoOrder.get(node.id) ?? 999,
        isInLibrary: libraryMap.has(node.id),
        librarySlug: libraryMap.get(node.id),
      })
    }

    return [...groups.entries()]
      .sort((a, b) => {
        if (a[0] === 'unknown') {
          return 1
        }
        if (b[0] === 'unknown') {
          return -1
        }
        return (a[0] as number) - (b[0] as number)
      })
      .map(([year, nodes]) => ({
        year,
        nodes: nodes.sort((a, b) => a.order - b.order),
      }))
  }, [graph, libraryMap])

  /** Клик по карточке → навигация */
  const handleClick = useCallback(
    (node: EnrichedNode) => {
      if (node.id === currentShikimoriId) {
        return
      }
      if (node.librarySlug) {
        router.push(`/anime/${node.librarySlug}`)
      } else if (node.url) {
        window.open(node.url, '_blank', 'noopener,noreferrer')
      }
    },
    [router, currentShikimoriId],
  )

  return (
    <Box overflow="auto" h="full" p="3" pt="10">
      <HStack align="start" gap="4" w="max-content" pb="2">
        {yearGroups.map(({ year, nodes }) => (
          <VStack key={year} align="stretch" gap="1.5" w="140px" flexShrink={0}>
            {/* Заголовок года */}
            <HStack>
              <Box h="1px" flex="1" bg="border.muted" />
              <Badge colorPalette="purple" size="sm" px="2">
                {year === 'unknown' ? '?' : year}
              </Badge>
              <Box h="1px" flex="1" bg="border.muted" />
            </HStack>

            {/* Карточки аниме */}
            {nodes.map((node) => {
              const isCurrent = node.id === currentShikimoriId

              return (
                <Box
                  key={node.id}
                  cursor="pointer"
                  onClick={() => handleClick(node)}
                  borderRadius="md"
                  overflow="hidden"
                  borderWidth={isCurrent ? '2px' : '1px'}
                  borderColor={isCurrent ? 'blue.500' : 'border.muted'}
                  _hover={{ borderColor: 'blue.400', transform: 'scale(1.02)' }}
                  transition="all 0.15s"
                  opacity={node.isInLibrary ? 1 : 0.6}
                >
                  <Box position="relative">
                    <Image
                      src={node.image_url}
                      alt={node.name}
                      w="full"
                      h="80px"
                      objectFit="cover"
                      filter={node.isInLibrary ? 'none' : 'grayscale(100%)'}
                    />
                    <Badge
                      position="absolute"
                      top="1"
                      left="1"
                      colorPalette={isCurrent ? 'blue' : 'gray'}
                      variant="solid"
                      fontSize="2xs"
                    >
                      #{node.order}
                    </Badge>
                    {node.isInLibrary && (
                      <Box position="absolute" top="1" right="1" color="green.500">
                        <LuCheck size={12} />
                      </Box>
                    )}
                  </Box>
                  <Box px="1.5" py="1">
                    <Text fontSize="xs" fontWeight="medium" lineClamp={2} lineHeight="tight">
                      {node.name}
                    </Text>
                    <Text fontSize="2xs" color="fg.muted">
                      {KIND_LABELS[node.kind] || node.kind}
                    </Text>
                  </Box>
                </Box>
              )
            })}
          </VStack>
        ))}
      </HStack>
    </Box>
  )
}
