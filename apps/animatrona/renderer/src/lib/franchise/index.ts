/**
 * Экспорт хуков и утилит для работы с франшизами
 */

export {
  useAnimeRelations,
  useCheckRelatedInLibrary,
  useFetchRelated,
  useSyncRelations,
  type FetchRelatedResult,
} from './hooks'

export { computeChronologicalOrder, getFranchiseSeasonNumber } from './compute-chronological-order'
