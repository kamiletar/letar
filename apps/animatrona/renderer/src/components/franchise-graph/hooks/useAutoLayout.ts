/**
 * Хук для автоматического размещения узлов с помощью Dagre
 */

import dagre from '@dagrejs/dagre'

import { useNodesInitialized, useReactFlow } from '@xyflow/react'
import { useCallback, useEffect } from 'react'

/** Размеры узла аниме */
const NODE_WIDTH = 200
const NODE_HEIGHT = 280

/** Настройки dagre layout */
const DAGRE_OPTIONS = {
  rankdir: 'LR', // Слева направо (хронологический порядок)
  nodesep: 50, // Расстояние между узлами по вертикали
  ranksep: 100, // Расстояние между рангами (колонками)
  marginx: 20,
  marginy: 20,
}

interface UseAutoLayoutOptions {
  /** Направление: LR (горизонтальное), TB (вертикальное) */
  direction?: 'LR' | 'TB'
}

/**
 * Хук для автоматического размещения узлов графа
 * Использует Dagre для вычисления позиций
 */
export function useAutoLayout({ direction = 'LR' }: UseAutoLayoutOptions = {}) {
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow()
  const nodesInitialized = useNodesInitialized()

  /** Вычисляет позиции узлов с помощью Dagre */
  const runLayout = useCallback(() => {
    const nodes = getNodes()
    const edges = getEdges()

    if (nodes.length === 0) {
      return
    }

    // Создаём граф dagre
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({
      ...DAGRE_OPTIONS,
      rankdir: direction,
    })

    // Добавляем узлы
    for (const node of nodes) {
      dagreGraph.setNode(node.id, {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    }

    // Добавляем связи
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    // Вычисляем layout
    dagre.layout(dagreGraph)

    // Обновляем позиции узлов
    const layoutedNodes = nodes.map((node) => {
      const dagreNode = dagreGraph.node(node.id)

      return {
        ...node,
        position: {
          // Dagre возвращает центр узла, React Flow ожидает верхний левый угол
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
      }
    })

    setNodes(layoutedNodes)

    // Подгоняем вид под весь граф
    requestAnimationFrame(() => {
      fitView({ padding: 0.1, duration: 200 })
    })
  }, [getNodes, getEdges, setNodes, fitView, direction])

  // Запускаем layout после инициализации узлов
  useEffect(() => {
    if (nodesInitialized) {
      runLayout()
    }
  }, [nodesInitialized, runLayout])

  return { runLayout }
}

export { NODE_HEIGHT, NODE_WIDTH }
