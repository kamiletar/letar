/**
 * Компоненты графа франшизы
 */

// Главный компонент
export { default, FranchiseGraph } from './FranchiseGraph'

// Типы
export { KIND_COLORS, KIND_LABELS, RELATION_LABELS } from './types'
export type {
  AnimeNode as AnimeNodeType,
  AnimeNodeData,
  FranchiseGraphProps,
  RelationEdge as RelationEdgeType,
  RelationEdgeData,
  ViewMode,
} from './types'

// Хуки
export { NODE_HEIGHT, NODE_WIDTH, useAutoLayout } from './hooks/useAutoLayout'
export { useFranchiseGraph } from './hooks/useFranchiseGraph'

// Компоненты узлов и связей (для кастомизации)
export { RelationEdge } from './edges/RelationEdge'
export { AnimeNode } from './nodes/AnimeNode'
