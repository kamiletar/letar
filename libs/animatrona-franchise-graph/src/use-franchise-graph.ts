/**
 * Хук для конвертации FranchiseGraphDocument в формат React Flow
 *
 * Позиции узлов вычисляются Dagre сразу в useMemo (без useAutoLayout),
 * чтобы избежать проблемы с useNodesInitialized в @xyflow/react.
 */

import dagre from '@dagrejs/dagre'
import type { FranchiseGraphDocument, FranchiseGraphNode } from '@letar/animatrona-types'
import { useMemo } from 'react'

import type { AnimeNode, AnimeNodeData, RelationEdge, RelationEdgeData } from './types'
import { RELATION_LABELS } from './types'

/** Размеры узла аниме */
const NODE_WIDTH = 180
const NODE_HEIGHT = 240

/** Настройки dagre layout */
const DAGRE_OPTIONS = {
  rankdir: 'LR',
  nodesep: 40,
  ranksep: 80,
  marginx: 20,
  marginy: 20,
}

/**
 * Важные типы связей для отображения на графе.
 * Остальные (summary, full_story, character, alternative_*, other) создают визуальный шум.
 */
const IMPORTANT_RELATIONS = new Set(['sequel', 'prequel', 'side_story', 'parent_story', 'spin_off'])

/**
 * Приоритет связей для дедупликации.
 * Если между двумя узлами есть несколько связей, оставляем с наивысшим приоритетом.
 */
const RELATION_PRIORITY: Record<string, number> = {
  sequel: 1,
  prequel: 2,
  parent_story: 3,
  side_story: 4,
  spin_off: 5,
}

export interface UseFranchiseGraphOptions {
  /** Граф из IPFS */
  graph: FranchiseGraphDocument
  /** Shikimori ID текущего аниме */
  currentShikimoriId?: number
  /** Маппинг shikimoriId → slug для навигации */
  libraryMap?: Map<number, string>
}

export interface UseFranchiseGraphResult {
  /** Узлы для React Flow */
  nodes: AnimeNode[]
  /** Связи для React Flow */
  edges: RelationEdge[]
}

/**
 * Конвертирует FranchiseGraphDocument в формат React Flow.
 * Создаёт узлы из graph.nodes и связи из graph.links (фильтруя важные и дедуплицируя).
 */
export function useFranchiseGraph({
  graph,
  currentShikimoriId,
  libraryMap = new Map(),
}: UseFranchiseGraphOptions): UseFranchiseGraphResult {
  return useMemo(() => {
    if (!graph.nodes || graph.nodes.length === 0) {
      return { nodes: [], edges: [] }
    }

    // Множество существующих node IDs для валидации связей
    const nodeIds = new Set(graph.nodes.map((n: FranchiseGraphNode) => n.id))

    // Конвертируем узлы
    const nodes: AnimeNode[] = graph.nodes.map((node: FranchiseGraphNode) => {
      const librarySlug = libraryMap.get(node.id)

      const data: AnimeNodeData = {
        shikimoriId: node.id,
        name: node.name,
        imageUrl: node.image_url,
        year: node.year,
        kind: node.kind,
        isCurrent: node.id === currentShikimoriId,
        isInLibrary: !!librarySlug,
        librarySlug,
        shikimoriUrl: node.url || `https://shikimori.one/animes/${node.id}`,
      }

      return {
        id: String(node.id),
        type: 'anime' as const,
        position: { x: 0, y: 0 }, // Позиция будет вычислена dagre
        data,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }
    })

    // Конвертируем связи (фильтруем только важные типы и дедуплицируем)
    const edgeMap = new Map<string, RelationEdge>()

    for (const link of graph.links || []) {
      if (!IMPORTANT_RELATIONS.has(link.relation)) {
        continue
      }

      // Валидация: оба узла должны существовать в графе
      if (!nodeIds.has(link.source_id) || !nodeIds.has(link.target_id)) {
        continue
      }

      // Ключ для дедупликации: пара узлов в отсортированном порядке
      const pairKey = [link.source_id, link.target_id].sort((a, b) => a - b).join('-')

      const existingEdge = edgeMap.get(pairKey)
      const currentPriority = RELATION_PRIORITY[link.relation] ?? 99
      const existingPriority = existingEdge?.data
        ? (RELATION_PRIORITY[(existingEdge.data as RelationEdgeData).relation] ?? 99)
        : Infinity

      // Заменяем только если текущая связь имеет более высокий приоритет
      if (currentPriority < existingPriority) {
        const data: RelationEdgeData = {
          relation: link.relation,
          relationLabel: RELATION_LABELS[link.relation] || link.relation,
        }

        edgeMap.set(pairKey, {
          id: `e-${link.source_id}-${link.target_id}`,
          source: String(link.source_id),
          target: String(link.target_id),
          type: 'relation',
          data,
          animated: link.relation === 'sequel' || link.relation === 'prequel',
        })
      }
    }

    const edges: RelationEdge[] = [...edgeMap.values()]

    // Вычисляем позиции узлов через Dagre
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph(DAGRE_OPTIONS)

    for (const node of nodes) {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    dagre.layout(dagreGraph)

    // Применяем позиции (Dagre возвращает центр, React Flow ожидает верхний левый угол)
    for (const node of nodes) {
      const dagreNode = dagreGraph.node(node.id)
      if (dagreNode) {
        node.position = {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        }
      }
    }

    return { nodes, edges }
  }, [graph, currentShikimoriId, libraryMap])
}
