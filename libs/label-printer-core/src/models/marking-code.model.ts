/**
 * Marking code model representing a "Честный знак" code
 */
export interface MarkingCode {
  /** Full marking code string */
  fullCode: string
  /** GTIN-14 from the code */
  gtin: string
  /** Serial number from the code */
  serialNumber: string
  /** Crypto tail from the code */
  cryptoCode: string
  /** Additional data (TN VED, etc.) */
  additionalData?: string
}

/**
 * Database record for marking code
 */
export interface MarkingCodeRecord {
  id: number
  fullCode: string
  gtin: string
  serialNumber: string
  cryptoCode: string
  firstScannedAt: string
  lastScannedAt: string
  scanCount: number
  printed: boolean
}

/**
 * Statistics for a specific date
 */
export interface DailyStatistics {
  id: number
  date: string
  totalScans: number
  totalPrints: number
  duplicates: number
  errors: number
  createdAt: string
}
