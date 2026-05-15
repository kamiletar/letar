/**
 * Rutracker Import — публичный API
 */

export { confirmShikimoriMatch, processRutrackerImport, type RutrackerImportResult } from './rutracker-import'
export {
  isAutoMatchConfident,
  matchFromDirectLink,
  matchFromMalLink,
  matchFromSearch,
  normalizeTitle,
  rankCandidates,
  titleSimilarity,
  type CandidateScore,
  type MatchResult,
} from './rutracker-matcher'
export { parseRutrackerPage, parseTitle } from './rutracker-parser'
export type {
  RutrackerAudioTrack,
  RutrackerDubGroup,
  RutrackerExternalLinks,
  RutrackerMediaInfo,
  RutrackerTorrentInfo,
} from './types'
