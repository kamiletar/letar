/**
 * Print job model
 */
export interface PrintJob {
  id?: number
  markingCodeId: number
  printedAt: string
  status: PrintJobStatus
  errorMessage?: string
}

/**
 * Print job status enum
 */
export enum PrintJobStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Printer status
 */
export interface PrinterStatus {
  ready: boolean
  status: PrinterState
  message?: string
}

/**
 * Printer state enum
 */
export enum PrinterState {
  READY = 'ready',
  OFFLINE = 'offline',
  PAPER_JAM = 'paper_jam',
  PAPER_END = 'paper_end',
  RIBBON_END = 'ribbon_end',
  PAUSE = 'pause',
  PRINTING = 'printing',
  ERROR = 'error',
  NOT_FOUND = 'not_found',
}

/**
 * Print result
 */
export interface PrintResult {
  success: boolean
  error?: string
  jobId?: number
}
