/**
 * Экспорт хуков и утилит для работы с франшизами
 */

export {
  type FetchRelatedResult,
  useAnimeRelations,
  useCheckRelatedInLibrary,
  useFetchRelated,
  useSyncRelations,
} from './hooks'

export { computeChronologicalOrder, getFranchiseSeasonNumber } from './compute-chronological-order'
