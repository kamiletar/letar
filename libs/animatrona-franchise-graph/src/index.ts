/**
 * @letar/animatrona-franchise-graph — граф франшизы для tracker и web
 */

export { AnimeNode } from './AnimeNode'
export { computeChronologicalOrder } from './compute-chronological-order'
export { DEFAULT_CONFIG, FranchiseGraphConfigContext, type FranchiseGraphConfig } from './config'
export { FranchiseGraphView, type FranchiseGraphViewProps } from './FranchiseGraphView'
export { FranchiseListView, type FranchiseListViewProps } from './FranchiseListView'
export { FranchiseTimelineView, type FranchiseTimelineViewProps } from './FranchiseTimelineView'
export { RelationEdge } from './RelationEdge'
export { KIND_COLORS, KIND_LABELS, RELATION_LABELS } from './types'
export type {
  AnimeNodeData,
  AnimeNode as AnimeNodeType,
  RelationEdgeData,
  RelationEdge as RelationEdgeType,
} from './types'
export { useFranchiseGraph, type UseFranchiseGraphOptions, type UseFranchiseGraphResult } from './use-franchise-graph'
