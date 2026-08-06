/**
 * Custom error classes for label-printer application
 */

// Base error class for marking code errors
export class MarkingCodeError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'MarkingCodeError'
  }
}

// Invalid code format
export class InvalidCodeFormatError extends MarkingCodeError {
  constructor(message: string, code: string) {
    super(message, code)
    this.name = 'InvalidCodeFormatError'
  }
}

// Duplicate code detected
export class DuplicateCodeError extends MarkingCodeError {
  constructor(
    message: string,
    code: string,
    public firstScannedAt?: string,
  ) {
    super(message, code)
    this.name = 'DuplicateCodeError'
  }
}

// Invalid GTIN
export class InvalidGTINError extends MarkingCodeError {
  constructor(message: string, code: string) {
    super(message, code)
    this.name = 'InvalidGTINError'
  }
}

// Base error class for printer errors
export class PrinterError extends Error {
  constructor(
    message: string,
    public status?: string,
  ) {
    super(message)
    this.name = 'PrinterError'
  }
}

// Printer not found
export class PrinterNotFoundError extends PrinterError {
  constructor(message: string) {
    super(message)
    this.name = 'PrinterNotFoundError'
  }
}

// Printer not ready
export class PrinterNotReadyError extends PrinterError {
  constructor(message: string, status?: string) {
    super(message, status)
    this.name = 'PrinterNotReadyError'
  }
}

// Print timeout
export class PrintTimeoutError extends PrinterError {
  constructor(message: string) {
    super(message)
    this.name = 'PrintTimeoutError'
  }
}

// Database error
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Image generation error
export class ImageGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageGenerationError'
  }
}
