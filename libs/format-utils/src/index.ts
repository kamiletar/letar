// Date utilities
export {
  calculateYearsFromDate,
  formatDate,
  formatDateLong,
  formatDateSeparator,
  formatDateShort,
  formatDateTime,
  // Duration and experience
  formatDuration,
  formatExperience,
  formatMessageTime,
  formatTime,
} from './lib/date'

// Money utilities
export { formatKopecks, formatRubles } from './lib/money'
export type { FormatMoneyOptions } from './lib/money'

// String utilities
export { slugify } from './lib/slugify'

// Pluralization utilities
export { pluralizeRu } from './lib/pluralize'

// File size utilities
export { formatFileSize } from './lib/file-size'
export type { FormatFileSizeOptions } from './lib/file-size'

// Re-export types if needed in the future
