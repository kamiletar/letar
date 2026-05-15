/**
 * Хук для конвертации данных API в формат React Flow
 */

import { computeChronologicalOrder } from '@/lib/franchise'
import type { ShikimoriFranchiseGraph, ShikimoriRelationKind } from '@/types/electron.d'
import { useMemo } from 'react'
import type { AnimeNode, AnimeNodeData, RelationEdge, RelationEdgeData } from '../types'
import { RELATION_LABELS } from '../types'

/**
 * Важные типы связей для отображения на графе.
 * Остальные (summary, full_story, character, alternative_*, other) создают визуальный шум.
 */
const IMPORTANT_RELATIONS: Set<ShikimoriRelationKind> = new Set([
  'sequel',
  'prequel',
  'side_story',
  'parent_story',
  'spin_off',
])

/**
 * Приоритет связей для дедупликации.
 * Если между двумя узлами есть несколько связей, оставляем с наивысшим приоритетом.
 */
const RELATION_PRIORITY: Record<ShikimoriRelationKind, number> = {
  sequel: 1,
  prequel: 2,
  parent_story: 3,
  side_story: 4,
  spin_off: 5,
  // Остальные типы не используются, но для типизации
  summary: 99,
  full_story: 99,
  adaptation: 99,
  character: 99,
  alternative_setting: 99,
  alternative_version: 99,
  other: 99,
}

interface UseFranchiseGraphOptions {
  /** Граф из API */
  graph: ShikimoriFranchiseGraph
  /** ID текущего аниме */
  currentAnimeId: number
  /** ID аниме в библиотеке пользователя */
  libraryAnimeIds?: Set<number>
  /** Статусы просмотра */
  watchStatuses?: Map<number, { status: string; progress: number }>
}

interface UseFranchiseGraphResult {
  /** Узлы для React Flow */
  nodes: AnimeNode[]
  /** Связи для React Flow */
  edges: RelationEdge[]
  /** Хронологический порядок просмотра */
  chronologicalOrder: number[]
}

/**
 * Хук для конвертации графа франшизы в формат React Flow
 */
export function useFranchiseGraph({
  graph,
  currentAnimeId,
  libraryAnimeIds = new Set(),
  watchStatuses = new Map(),
}: UseFranchiseGraphOptions): UseFranchiseGraphResult {
  return useMemo(() => {
    // Защита от пустого графа
    if (!graph.nodes || graph.nodes.length === 0) {
      return { nodes: [], edges: [], chronologicalOrder: [] }
    }

    // Вычисляем хронологический порядок
    const chronoOrder = computeChronologicalOrder(graph)

    // Конвертируем узлы
    const nodes: AnimeNode[] = graph.nodes.map((node) => {
      const watchInfo = watchStatuses.get(node.id)

      const data: AnimeNodeData = {
        shikimoriId: node.id,
        name: node.name,
        imageUrl: node.image_url,
        year: node.year,
        kind: node.kind,
        isCurrent: node.id === currentAnimeId,
        isInLibrary: libraryAnimeIds.has(node.id),
        watchStatus: watchInfo?.status as AnimeNodeData['watchStatus'],
        watchProgress: watchInfo?.progress,
        chronologicalOrder: chronoOrder.get(node.id),
      }

      return {
        id: String(node.id),
        type: 'anime',
        position: { x: 0, y: 0 }, // Позиция будет вычислена dagre
        data,
      }
    })

    // Конвертируем связи (фильтруем только важные типы и дедуплицируем)
    // Между двумя узлами оставляем только одну связь с наивысшим приоритетом
    const edgeMap = new Map<string, RelationEdge>()

    for (const link of graph.links || []) {
      if (!IMPORTANT_RELATIONS.has(link.relation)) {
        continue
      }

      const sourceId = graph.nodes[link.source]?.id
      const targetId = graph.nodes[link.target]?.id

      if (!sourceId || !targetId) {
        continue
      }

      // Ключ для дедупликации: пара узлов в отсортированном порядке
      const pairKey = [sourceId, targetId].sort((a, b) => a - b).join('-')

      const existingEdge = edgeMap.get(pairKey)
      const currentPriority = RELATION_PRIORITY[link.relation]
      const existingPriority = existingEdge?.data ? RELATION_PRIORITY[existingEdge.data.relation] : Infinity

      // Заменяем только если текущая связь имеет более высокий приоритет
      if (currentPriority < existingPriority) {
        const data: RelationEdgeData = {
          relation: link.relation,
          relationLabel: RELATION_LABELS[link.relation] || link.relation,
        }

        edgeMap.set(pairKey, {
          id: `e-${link.id}`,
          source: String(sourceId),
          target: String(targetId),
          type: 'relation',
          data,
          animated: link.relation === 'sequel' || link.relation === 'prequel',
        })
      }
    }

    const edges: RelationEdge[] = [...edgeMap.values()]

    // Хронологический порядок для внешнего использования
    const chronologicalOrder = [...chronoOrder.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)

    return { nodes, edges, chronologicalOrder }
  }, [graph, currentAnimeId, libraryAnimeIds, watchStatuses])
}
