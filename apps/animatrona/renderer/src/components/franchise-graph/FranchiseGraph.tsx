'use client'

/**
 * Главный компонент интерактивного графа франшизы
 * Использует React Flow для визуализации связей между аниме
 */

import {
  Background,
  Controls,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './franchise-graph.css'

import {
  Badge,
  Box,
  ButtonGroup,
  Card,
  HStack,
  IconButton,
  Image,
  Portal,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuCheck, LuClock, LuLayoutGrid, LuList, LuPlay, LuRefreshCw } from 'react-icons/lu'

import { computeChronologicalOrder } from '@/lib/franchise'
import type { ShikimoriFranchiseNode } from '@/types/electron.d'
import { FranchiseClickContext } from './context'
import { RelationEdge as RelationEdgeComponent } from './edges/RelationEdge'
import { useAutoLayout } from './hooks/useAutoLayout'
import { useFranchiseGraph } from './hooks/useFranchiseGraph'
import { AnimeNode as AnimeNodeComponent } from './nodes/AnimeNode'
import type { AnimeNodeData, FranchiseGraphProps, ViewMode } from './types'

/** Расширенный тип узла для таймлайна с доп. полями сортировки и статуса */
interface TimelineNode extends ShikimoriFranchiseNode {
  order: number
  isInLibrary: boolean
  watchStatus?: { status: string; progress: number }
}

/** Регистрируем кастомные типы узлов */

const nodeTypes: NodeTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React Flow требует приведение типов для кастомных node components
  anime: AnimeNodeComponent as any,
}

/** Регистрируем кастомные типы связей */

const edgeTypes: EdgeTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React Flow требует приведение типов для кастомных edge components
  relation: RelationEdgeComponent as any,
}

/** Настройки по умолчанию для React Flow */
const defaultEdgeOptions = {
  type: 'relation',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
}

/**
 * Внутренний компонент графа (требует ReactFlowProvider)
 */
function FranchiseGraphInner({
  graph,
  currentAnimeId,
  libraryAnimeIds,
  watchStatuses,
  onNodeClick,
}: Omit<FranchiseGraphProps, 'initialViewMode' | 'height'>) {
  // Конвертируем данные API в формат React Flow
  const { nodes: initialNodes, edges: initialEdges } = useFranchiseGraph({
    graph,
    currentAnimeId,
    libraryAnimeIds,
    watchStatuses,
  })

  // Состояние узлов и связей
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, , onNodesChange] = useNodesState(initialNodes as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, , onEdgesChange] = useEdgesState(initialEdges as any)

  // Автоматический layout
  const { runLayout } = useAutoLayout({ direction: 'LR' })

  // Обработчик клика по узлу
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node: Node) => {
      if (onNodeClick) {
        const data = node.data as AnimeNodeData
        onNodeClick(data.shikimoriId)
      }
    },
    [onNodeClick]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.1}
      maxZoom={2}
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
    >
      {/* Сетка фона */}
      <Background color="var(--chakra-colors-border-muted)" gap={20} />

      {/* Стандартные контролы */}
      <Controls
        showInteractive={false}
        style={{
          background: 'var(--chakra-colors-bg-panel)',
          borderColor: 'var(--chakra-colors-border-muted)',
          borderRadius: '8px',
        }}
      >
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <IconButton aria-label="Пересчитать layout" onClick={() => runLayout()} size="sm" variant="ghost">
              <LuRefreshCw />
            </IconButton>
          </Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner>
              <Tooltip.Content>Пересчитать layout</Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      </Controls>

      {/* Миникарта */}
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as AnimeNodeData
          if (data.isCurrent) {
            return 'var(--chakra-colors-blue-500)'
          }
          if (data.isInLibrary) {
            return 'var(--chakra-colors-green-500)'
          }
          return 'var(--chakra-colors-gray-400)'
        }}
        maskColor="var(--chakra-colors-bg-muted/80)"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}

/**
 * Компонент списка аниме франшизы
 */
function ListView({
  graph,
  currentAnimeId,
  libraryAnimeIds,
  watchStatuses,
  onNodeClick,
}: Omit<FranchiseGraphProps, 'initialViewMode' | 'height'>) {
  // Вычисляем хронологический порядок и сортируем
  const sortedNodes = useMemo(() => {
    const chronoOrder = computeChronologicalOrder(graph)
    return [...graph.nodes]
      .map((node) => ({
        ...node,
        order: chronoOrder.get(node.id) ?? 999,
        isInLibrary: libraryAnimeIds?.has(node.id) ?? false,
        watchStatus: watchStatuses?.get(node.id),
      }))
      .sort((a, b) => a.order - b.order)
  }, [graph, libraryAnimeIds, watchStatuses])

  return (
    <VStack align="stretch" p="4" gap="2" overflowY="auto" h="full">
      {sortedNodes.map((node) => (
        <Card.Root
          key={node.id}
          variant="outline"
          size="sm"
          cursor="pointer"
          onClick={() => onNodeClick?.(node.id)}
          borderColor={node.id === currentAnimeId ? 'blue.500' : undefined}
          borderWidth={node.id === currentAnimeId ? '2px' : '1px'}
          _hover={{ bg: 'bg.muted' }}
        >
          <Card.Body p="3">
            <HStack gap="3">
              {/* Порядковый номер */}
              <Badge
                colorPalette={node.id === currentAnimeId ? 'blue' : 'gray'}
                variant="solid"
                minW="8"
                textAlign="center"
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
              />

              {/* Информация */}
              <VStack align="start" gap="0" flex="1" minW="0">
                <Text fontWeight="medium" lineClamp={1}>
                  {node.name}
                </Text>
                <HStack gap="2" fontSize="sm" color="fg.muted">
                  <Text>{node.year || '—'}</Text>
                  <Badge size="sm" colorPalette="gray">
                    {node.kind.toUpperCase()}
                  </Badge>
                </HStack>
              </VStack>

              {/* Статус */}
              <HStack gap="1" flexShrink={0}>
                {node.isInLibrary && (
                  <Badge colorPalette="green" size="sm">
                    В библиотеке
                  </Badge>
                )}
                {node.watchStatus?.status === 'completed' && (
                  <Box color="green.500">
                    <LuCheck />
                  </Box>
                )}
                {node.watchStatus?.status === 'watching' && (
                  <Box color="blue.500">
                    <LuPlay />
                  </Box>
                )}
              </HStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      ))}
    </VStack>
  )
}

/**
 * Компонент таймлайна по годам
 */
function TimelineView({
  graph,
  currentAnimeId,
  libraryAnimeIds,
  watchStatuses,
  onNodeClick,
}: Omit<FranchiseGraphProps, 'initialViewMode' | 'height'>) {
  // Группируем по годам и сортируем хронологически внутри года
  const groupedByYear = useMemo(() => {
    const chronoOrder = computeChronologicalOrder(graph)
    const groups = new Map<number | 'unknown', TimelineNode[]>()

    for (const node of graph.nodes) {
      const year = node.year ?? 'unknown'
      if (!groups.has(year)) {
        groups.set(year, [])
      }
      groups.get(year)!.push({
        ...node,
        order: chronoOrder.get(node.id) ?? 999,
        isInLibrary: libraryAnimeIds?.has(node.id) ?? false,
        watchStatus: watchStatuses?.get(node.id),
      })
    }

    // Сортируем года и аниме внутри года
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
  }, [graph, libraryAnimeIds, watchStatuses])

  return (
    <Box overflowY="auto" h="full" p="4">
      <HStack align="start" gap="6" overflowX="auto" pb="4">
        {groupedByYear.map(({ year, nodes }) => (
          <VStack key={year} align="stretch" gap="2" minW="200px" flexShrink={0}>
            {/* Заголовок года */}
            <HStack>
              <Box h="2px" flex="1" bg="border.muted" />
              <Badge colorPalette="purple" size="lg" px="3">
                {year === 'unknown' ? '?' : year}
              </Badge>
              <Box h="2px" flex="1" bg="border.muted" />
            </HStack>

            {/* Карточки аниме */}
            {nodes.map((node) => (
              <Card.Root
                key={node.id}
                variant="outline"
                size="sm"
                cursor="pointer"
                onClick={() => onNodeClick?.(node.id)}
                borderColor={node.id === currentAnimeId ? 'blue.500' : undefined}
                borderWidth={node.id === currentAnimeId ? '2px' : '1px'}
                _hover={{ bg: 'bg.muted' }}
              >
                <Card.Body p="2">
                  <VStack gap="2">
                    <Image
                      src={node.image_url}
                      alt={node.name}
                      w="full"
                      h="120px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                    <VStack align="start" gap="0" w="full">
                      <Text fontWeight="medium" fontSize="sm" lineClamp={2}>
                        {node.name}
                      </Text>
                      <HStack gap="1" fontSize="xs">
                        <Badge size="sm" colorPalette="gray">
                          {node.kind.toUpperCase()}
                        </Badge>
                        {node.isInLibrary && (
                          <Box color="green.500">
                            <LuCheck size={12} />
                          </Box>
                        )}
                      </HStack>
                    </VStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        ))}
      </HStack>
    </Box>
  )
}

/**
 * Главный компонент графа франшизы
 * Оборачивает внутренний компонент в ReactFlowProvider
 */
export function FranchiseGraph({
  graph,
  currentAnimeId,
  libraryAnimeIds,
  watchStatuses,
  onNodeClick,
  initialViewMode = 'graph',
  height = '600px',
}: FranchiseGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)

  // Статистика графа
  const stats = useMemo(() => {
    const total = graph.nodes.length
    const inLibrary = graph.nodes.filter((n: ShikimoriFranchiseNode) => libraryAnimeIds?.has(n.id)).length
    const watched = watchStatuses ? [...watchStatuses.values()].filter((s) => s.status === 'completed').length : 0

    return { total, inLibrary, watched }
  }, [graph, libraryAnimeIds, watchStatuses])

  return (
    <Box h={height} position="relative">
      {/* Панель управления */}
      <HStack
        position="absolute"
        top="4"
        right="4"
        zIndex="10"
        bg="bg.panel/90"
        backdropFilter="blur(8px)"
        borderRadius="lg"
        p="2"
        gap="4"
      >
        {/* Статистика */}
        <HStack gap="2">
          <Badge colorPalette="gray">{stats.total} аниме</Badge>
          {stats.inLibrary > 0 && <Badge colorPalette="blue">{stats.inLibrary} в библиотеке</Badge>}
          {stats.watched > 0 && <Badge colorPalette="green">{stats.watched} просмотрено</Badge>}
        </HStack>

        {/* Переключатель режима */}
        <ButtonGroup size="sm" variant="ghost" attached>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
                aria-label="Граф"
                onClick={() => setViewMode('graph')}
                colorPalette={viewMode === 'graph' ? 'blue' : 'gray'}
                variant={viewMode === 'graph' ? 'solid' : 'ghost'}
              >
                <LuLayoutGrid />
              </IconButton>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content>Граф</Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
                aria-label="Список"
                onClick={() => setViewMode('list')}
                colorPalette={viewMode === 'list' ? 'blue' : 'gray'}
                variant={viewMode === 'list' ? 'solid' : 'ghost'}
              >
                <LuList />
              </IconButton>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content>Хронологический список</Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
                aria-label="Таймлайн"
                onClick={() => setViewMode('timeline')}
                colorPalette={viewMode === 'timeline' ? 'blue' : 'gray'}
                variant={viewMode === 'timeline' ? 'solid' : 'ghost'}
              >
                <LuClock />
              </IconButton>
            </Tooltip.Trigger>
            <Portal>
              <Tooltip.Positioner>
                <Tooltip.Content>Таймлайн по годам</Tooltip.Content>
              </Tooltip.Positioner>
            </Portal>
          </Tooltip.Root>
        </ButtonGroup>
      </HStack>

      {/* Основной контент — контекст передаёт onClick в узлы графа напрямую */}
      <FranchiseClickContext.Provider value={{ onNodeClick }}>
        {viewMode === 'graph' && (
          <ReactFlowProvider>
            <FranchiseGraphInner
              graph={graph}
              currentAnimeId={currentAnimeId}
              libraryAnimeIds={libraryAnimeIds}
              watchStatuses={watchStatuses}
              onNodeClick={onNodeClick}
            />
          </ReactFlowProvider>
        )}

        {viewMode === 'list' && (
          <ListView
            graph={graph}
            currentAnimeId={currentAnimeId}
            libraryAnimeIds={libraryAnimeIds}
            watchStatuses={watchStatuses}
            onNodeClick={onNodeClick}
          />
        )}

        {viewMode === 'timeline' && (
          <TimelineView
            graph={graph}
            currentAnimeId={currentAnimeId}
            libraryAnimeIds={libraryAnimeIds}
            watchStatuses={watchStatuses}
            onNodeClick={onNodeClick}
          />
        )}
      </FranchiseClickContext.Provider>
    </Box>
  )
}

export default FranchiseGraph
