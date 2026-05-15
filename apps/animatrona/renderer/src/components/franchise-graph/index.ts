/**
 * Компоненты графа франшизы
 */

// Главный компонент
export { FranchiseGraph, default } from './FranchiseGraph'

// Типы
export { KIND_COLORS, KIND_LABELS, RELATION_LABELS } from './types'
export type {
  AnimeNodeData,
  AnimeNode as AnimeNodeType,
  FranchiseGraphProps,
  RelationEdgeData,
  RelationEdge as RelationEdgeType,
  ViewMode,
} from './types'

// Хуки
export { NODE_HEIGHT, NODE_WIDTH, useAutoLayout } from './hooks/useAutoLayout'
export { useFranchiseGraph } from './hooks/useFranchiseGraph'

// Компоненты узлов и связей (для кастомизации)
export { RelationEdge } from './edges/RelationEdge'
export { AnimeNode } from './nodes/AnimeNode'
