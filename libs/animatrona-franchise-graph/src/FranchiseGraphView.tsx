'use client'

/**
 * Интерактивный граф франшизы с переключателем видов
 *
 * Три режима отображения:
 * - graph: React Flow + Dagre (интерактивный граф)
 * - list: хронологический список
 * - timeline: таймлайн по годам
 */

import { Badge, Box, ButtonGroup, HStack, IconButton, Text } from '@chakra-ui/react'
import type { FranchiseGraphDocument } from '@letar/animatrona-types'
import { Background, Controls, MiniMap, type NodeMouseHandler, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { LuClock, LuLayoutGrid, LuLibrary, LuList, LuTv } from 'react-icons/lu'

import { AnimeNode } from './AnimeNode'
import { type FranchiseGraphConfig, FranchiseGraphConfigContext, useFranchiseGraphConfig } from './config'
import './franchise-graph.css'
import { FranchiseListView } from './FranchiseListView'
import { FranchiseTimelineView } from './FranchiseTimelineView'
import { RelationEdge } from './RelationEdge'
import type { AnimeNodeData } from './types'
import { useFranchiseGraph } from './use-franchise-graph'

export interface FranchiseGraphViewProps {
  /** Граф франшизы из IPFS */
  graph: FranchiseGraphDocument
  /** Shikimori ID текущего аниме */
  currentShikimoriId?: number
  /** Маппинг shikimoriId → slug для навигации */
  libraryMap?: Map<number, string>
  /** Высота контейнера */
  height?: string | number
  /** Конфигурация текстовых меток (для параметризации tracker/web) */
  config?: FranchiseGraphConfig
}

type ViewMode = 'graph' | 'list' | 'timeline'

/** Регистрация кастомных типов узлов и рёбер */
const nodeTypes = { anime: AnimeNode }
const edgeTypes = { relation: RelationEdge }

/**
 * Главный компонент франшизы с переключением видов.
 */
export function FranchiseGraphView({
  graph,
  currentShikimoriId,
  libraryMap,
  height = '500px',
  config,
}: FranchiseGraphViewProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const { nodes, edges } = useFranchiseGraph({ graph, currentShikimoriId, libraryMap })
  const currentConfig = useFranchiseGraphConfig()
  const effectiveConfig = config ?? currentConfig

  /** Клик по узлу → навигация */
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as AnimeNodeData
      if (data.isCurrent) {
        return
      }
      if (data.librarySlug) {
        router.push(`/anime/${data.librarySlug}`)
        return
      }
      if (data.shikimoriUrl) {
        window.open(data.shikimoriUrl, '_blank', 'noopener,noreferrer')
      }
    },
    [router]
  )

  /** SVG-маркер стрелки для рёбер */
  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: { type: 'arrow' as const, width: 16, height: 16 },
    }),
    []
  )

  /** Статистика по узлам */
  const stats = useMemo(() => {
    const total = graph.nodes?.length ?? 0
    const inLibrary = libraryMap ? graph.nodes.filter((n: { id: number }) => libraryMap.has(n.id)).length : 0
    return { total, inLibrary }
  }, [graph, libraryMap])

  /** Resolved цвета для MiniMap (canvas не поддерживает CSS-переменные) */
  const resolvedColors = useMemo(() => {
    if (typeof document === 'undefined') {
      return { blue: '#3b82f6', green: '#22c55e', gray: '#71717a', bgMuted: '#27272a' }
    }
    const s = getComputedStyle(document.documentElement)
    return {
      blue: s.getPropertyValue('--chakra-colors-blue-500').trim() || '#3b82f6',
      green: s.getPropertyValue('--chakra-colors-green-500').trim() || '#22c55e',
      gray: s.getPropertyValue('--chakra-colors-gray-500').trim() || '#71717a',
      bgMuted: s.getPropertyValue('--chakra-colors-bg-muted').trim() || '#27272a',
    }
  }, [])

  /** Цвет узла для MiniMap */
  const miniMapNodeColor = useCallback(
    (node: { data: Record<string, unknown> }) => {
      const data = node.data as AnimeNodeData
      if (data.isCurrent) {
        return resolvedColors.blue
      }
      if (data.isInLibrary) {
        return resolvedColors.green
      }
      return resolvedColors.gray
    },
    [resolvedColors]
  )

  // Пустой граф
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color="fg.subtle">Граф франшизы пуст</Text>
      </Box>
    )
  }

  const content = (
    <Box>
      <Box
        h={height}
        borderRadius="lg"
        overflow={viewMode === 'graph' ? 'hidden' : 'auto'}
        border="1px"
        borderColor="border.subtle"
        position="relative"
      >
        {/* Панель статистики + переключатель видов */}
        <HStack
          position="absolute"
          top="3"
          right="3"
          zIndex="10"
          bg="bg.panel/80"
          backdropFilter="blur(8px)"
          borderRadius="lg"
          px="3"
          py="1.5"
          gap="3"
          border="1px solid"
          borderColor="border.muted"
          boxShadow="md"
        >
          {/* Статистика */}
          <HStack gap="2">
            <Badge colorPalette="gray" variant="subtle" size="sm">
              <LuTv />
              {stats.total} аниме
            </Badge>
            {stats.inLibrary > 0 && (
              <Badge colorPalette="blue" variant="subtle" size="sm">
                <LuLibrary />
                {stats.inLibrary} {effectiveConfig.libraryLabel.toLowerCase()}
              </Badge>
            )}
          </HStack>

          {/* Переключатель видов */}
          <ButtonGroup size="xs" variant="ghost" attached>
            <IconButton
              aria-label="Граф"
              onClick={() => setViewMode('graph')}
              colorPalette={viewMode === 'graph' ? 'blue' : 'gray'}
              variant={viewMode === 'graph' ? 'solid' : 'ghost'}
            >
              <LuLayoutGrid />
            </IconButton>
            <IconButton
              aria-label="Список"
              onClick={() => setViewMode('list')}
              colorPalette={viewMode === 'list' ? 'blue' : 'gray'}
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
            >
              <LuList />
            </IconButton>
            <IconButton
              aria-label="Таймлайн"
              onClick={() => setViewMode('timeline')}
              colorPalette={viewMode === 'timeline' ? 'blue' : 'gray'}
              variant={viewMode === 'timeline' ? 'solid' : 'ghost'}
            >
              <LuClock />
            </IconButton>
          </ButtonGroup>
        </HStack>

        {/* Граф */}
        {viewMode === 'graph' && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            minZoom={0.05}
            maxZoom={1.5}
            panOnDrag
            zoomOnScroll
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={miniMapNodeColor} maskColor={`${resolvedColors.bgMuted}cc`} />
          </ReactFlow>
        )}

        {/* Список */}
        {viewMode === 'list' && (
          <FranchiseListView graph={graph} currentShikimoriId={currentShikimoriId} libraryMap={libraryMap} />
        )}

        {/* Таймлайн */}
        {viewMode === 'timeline' && (
          <FranchiseTimelineView graph={graph} currentShikimoriId={currentShikimoriId} libraryMap={libraryMap} />
        )}
      </Box>

      <Text fontSize="xs" color="fg.subtle" mt={2}>
        {viewMode === 'graph'
          ? 'Перетаскивание мышью для навигации, колёсико для масштабирования. Клик по аниме для перехода.'
          : `Клик по аниме для перехода. Аниме ${effectiveConfig.libraryNavLabel} — внутренняя навигация, остальные — Shikimori.`}
      </Text>
    </Box>
  )

  // Оборачиваем в провайдер конфига только если передан кастомный
  if (config) {
    return <FranchiseGraphConfigContext value={config}>{content}</FranchiseGraphConfigContext>
  }

  return content
}
