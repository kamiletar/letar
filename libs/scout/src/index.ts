export {
  type AssocDict,
  assocExpansion,
  type AssocOptions,
  type AssocPair,
  buildAssoc,
  prfExpansion,
} from './lib/assoc'
export { Bm25, type Bm25Options, buildIndex, type Hit } from './lib/bm25'
export { BRIEF_HEADER, type BriefItem, type BriefOptions, briefOrder, formatBrief, formatOneLine } from './lib/brief'
export { collectCards, parsePatternRegistry, PATTERN_HINTS } from './lib/collect'
export {
  cardEmbedText,
  cardRerankText,
  DenseIndex,
  EMBED_TEXT_CHARS,
  embedHash,
  embedTexts,
  formatQuery,
  type FormRanking,
  formRanking,
  fusedHits,
  fuseWithDense,
  hybridHits,
  type HybridOptions,
  type HybridResult,
  normalize,
  phraseHash,
  phraseRanking,
  QUERY_CHARS,
  QUERY_INSTRUCTION,
  reciprocalRankFusion,
  rerankTexts,
  type ServerOptions,
} from './lib/dense'
export { type Frontmatter, parseFrontmatter } from './lib/frontmatter'
export {
  type DocHit,
  FORM_WORDS,
  type FormHit,
  isFormCard,
  layoutHits,
  mentionedIn,
  scout,
  type ScoutOptions,
  type ScoutResult,
  type ToolHit,
} from './lib/search'
export { type DocSignal, type QuerySignals, querySignals } from './lib/signals'
export {
  docCards,
  type DocInput,
  type DocSection,
  fieldCatalogCards,
  type IndexEntry,
  parseIndexEntries,
  parseSections,
  patternCard,
  type PatternInput,
  stripMarkdown,
  toolCard,
  type ToolKind,
  truncate,
} from './lib/sources'
export { tokenize } from './lib/text'
export { INDEX_VERSION } from './lib/types'
export type { Card, CardKind, IndexedCard, ScoutIndex, WeightedField } from './lib/types'
