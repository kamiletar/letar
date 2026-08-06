/**
 * Rutracker Import — публичный API
 */

export { confirmShikimoriMatch, processRutrackerImport, type RutrackerImportResult } from './rutracker-import'
export {
  type CandidateScore,
  isAutoMatchConfident,
  matchFromDirectLink,
  matchFromMalLink,
  matchFromSearch,
  type MatchResult,
  normalizeTitle,
  rankCandidates,
  titleSimilarity,
} from './rutracker-matcher'
export { parseRutrackerPage, parseTitle } from './rutracker-parser'
export type {
  RutrackerAudioTrack,
  RutrackerDubGroup,
  RutrackerExternalLinks,
  RutrackerMediaInfo,
  RutrackerTorrentInfo,
} from './types'
