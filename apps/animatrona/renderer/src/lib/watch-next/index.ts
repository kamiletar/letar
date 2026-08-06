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
  type AnimeForOrder,
  computeWatchOrder,
  getWatchOrderPosition,
  groupByEpoch,
  type WatchOrderEpoch,
  type WatchOrderPosition,
} from './compute-order'
