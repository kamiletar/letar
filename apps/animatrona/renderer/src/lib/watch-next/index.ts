/**
 * Watch Next — система рекомендаций "Что смотреть дальше"
 */

export {
  getFranchiseRelations,
  getSequelSuggestion,
  getWatchNextSuggestion,
  type SequelSuggestion,
} from './get-sequel-suggestion'

export {
  computeWatchOrder,
  getWatchOrderPosition,
  groupByEpoch,
  type AnimeForOrder,
  type WatchOrderEpoch,
  type WatchOrderPosition,
} from './compute-order'
