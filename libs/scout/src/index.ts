export { Bm25, type Bm25Options, buildIndex, type Hit } from './lib/bm25'
export { BRIEF_HEADER, type BriefOptions, formatBrief, formatOneLine } from './lib/brief'
export { collectCards } from './lib/collect'
export { type Frontmatter, parseFrontmatter } from './lib/frontmatter'
export { type DocHit, scout, type ScoutOptions, type ScoutResult, type ToolHit } from './lib/search'
export {
  docCards,
  type DocInput,
  type DocSection,
  type IndexEntry,
  parseIndexEntries,
  parseSections,
  stripMarkdown,
  toolCard,
  type ToolKind,
  truncate,
} from './lib/sources'
export { tokenize } from './lib/text'
export type { Card, CardKind, IndexedCard, ScoutIndex, WeightedField } from './lib/types'
