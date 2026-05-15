'use client'

/**
 * Хронологический список аниме франшизы
 *
 * Отображает аниме в порядке просмотра: топологическая сортировка
 * по связям sequel/prequel, корни сортируются по году.
 */

import { Badge, Card, HStack, Image, Text, VStack } from '@chakra-ui/react'
import type { FranchiseGraphDocument, FranchiseGraphNode } from '@letar/animatrona-types'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { LuCheck, LuLibrary } from 'react-icons/lu'

import { computeChronologicalOrder } from './compute-chronological-order'
import { useFranchiseGraphConfig } from './config'
import { KIND_LABELS } from './types'

export interface FranchiseListViewProps {
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

export function FranchiseListView({ graph, currentShikimoriId, libraryMap = new Map() }: FranchiseListViewProps) {
  const router = useRouter()
  const config = useFranchiseGraphConfig()

  /** Сортированный список с хронологическим порядком */
  const sortedNodes = useMemo(() => {
    const chronoOrder = computeChronologicalOrder(graph)
    return [...graph.nodes]
      .map(
        (node): EnrichedNode => ({
          ...node,
          order: chronoOrder.get(node.id) ?? 999,
          isInLibrary: libraryMap.has(node.id),
          librarySlug: libraryMap.get(node.id),
        })
      )
      .sort((a, b) => a.order - b.order)
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
    [router, currentShikimoriId]
  )

  return (
    <VStack align="stretch" p="4" gap="2" overflowY="auto" h="full">
      {sortedNodes.map((node) => {
        const isCurrent = node.id === currentShikimoriId

        return (
          <Card.Root
            key={node.id}
            variant="outline"
            size="sm"
            cursor="pointer"
            onClick={() => handleClick(node)}
            borderColor={isCurrent ? 'blue.500' : undefined}
            borderWidth={isCurrent ? '2px' : '1px'}
            _hover={{ bg: 'bg.muted' }}
            opacity={node.isInLibrary ? 1 : 0.7}
          >
            <Card.Body p="3">
              <HStack gap="3">
                {/* Порядковый номер */}
                <Badge
                  colorPalette={isCurrent ? 'blue' : 'gray'}
                  variant="solid"
                  minW="8"
                  textAlign="center"
                  flexShrink={0}
                >
                  #{node.order}
                </Badge>

                {/* Постер */}
                <Image
                  src={node.image_url}
                  alt={node.name}
                  boxSize="50px"
                  objectFit="cover"
                  borderRadius="md"
                  flexShrink={0}
                  filter={node.isInLibrary ? 'none' : 'grayscale(100%)'}
                />

                {/* Информация */}
                <VStack align="start" gap="0" flex="1" minW="0">
                  <Text fontWeight="medium" lineClamp={1}>
                    {node.name}
                  </Text>
                  <HStack gap="2" fontSize="sm" color="fg.muted">
                    <Text>{node.year || '—'}</Text>
                    <Badge size="sm" colorPalette="gray" variant="subtle">
                      {KIND_LABELS[node.kind] || node.kind}
                    </Badge>
                  </HStack>
                </VStack>

                {/* Статус */}
                <HStack gap="1" flexShrink={0}>
                  {isCurrent && (
                    <Badge colorPalette="blue" variant="solid" size="sm">
                      Текущее
                    </Badge>
                  )}
                  {node.isInLibrary && !isCurrent && (
                    <Badge colorPalette="green" variant="subtle" size="sm">
                      <LuLibrary size={12} />
                      {config.libraryLabel}
                    </Badge>
                  )}
                  {node.isInLibrary && <LuCheck size={14} color="var(--chakra-colors-green-500)" />}
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>
        )
      })}
    </VStack>
  )
}
