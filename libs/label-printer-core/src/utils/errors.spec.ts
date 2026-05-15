import { describe, expect, it } from 'vitest'
import {
  DatabaseError,
  DuplicateCodeError,
  ImageGenerationError,
  InvalidCodeFormatError,
  InvalidGTINError,
  MarkingCodeError,
  PrinterError,
  PrinterNotFoundError,
  PrinterNotReadyError,
  PrintTimeoutError,
} from './errors'

describe('Custom Errors', () => {
  describe('MarkingCodeError', () => {
    it('создаёт ошибку с сообщением и кодом', () => {
      const error = new MarkingCodeError('Test error', 'TEST123')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST123')
      expect(error.name).toBe('MarkingCodeError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidCodeFormatError', () => {
    it('наследуется от MarkingCodeError', () => {
      const error = new InvalidCodeFormatError('Invalid format', 'BAD_CODE')

      expect(error).toBeInstanceOf(MarkingCodeError)
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('InvalidCodeFormatError')
      expect(error.code).toBe('BAD_CODE')
    })
  })

  describe('DuplicateCodeError', () => {
    it('хранит информацию о первом сканировании', () => {
      const firstScanned = '2024-01-01T12:00:00Z'
      const error = new DuplicateCodeError('Duplicate detected', 'DUP123', firstScanned)

      expect(error.message).toBe('Duplicate detected')
      expect(error.code).toBe('DUP123')
      expect(error.firstScannedAt).toBe(firstScanned)
      expect(error.name).toBe('DuplicateCodeError')
    })

    it('firstScannedAt опционален', () => {
      const error = new DuplicateCodeError('Duplicate', 'DUP456')

      expect(error.firstScannedAt).toBeUndefined()
    })
  })

  describe('InvalidGTINError', () => {
    it('содержит невалидный GTIN в code', () => {
      const error = new InvalidGTINError('Invalid checksum', '12345678901234')

      expect(error.name).toBe('InvalidGTINError')
      expect(error.code).toBe('12345678901234')
      expect(error).toBeInstanceOf(MarkingCodeError)
    })
  })

  describe('PrinterError', () => {
    it('создаёт ошибку со статусом принтера', () => {
      const error = new PrinterError('Printer offline', 'OFFLINE')

      expect(error.message).toBe('Printer offline')
      expect(error.status).toBe('OFFLINE')
      expect(error.name).toBe('PrinterError')
    })

    it('статус опционален', () => {
      const error = new PrinterError('Unknown error')

      expect(error.status).toBeUndefined()
    })
  })

  describe('PrinterNotFoundError', () => {
    it('наследуется от PrinterError', () => {
      const error = new PrinterNotFoundError('Printer not found')

      expect(error).toBeInstanceOf(PrinterError)
      expect(error.name).toBe('PrinterNotFoundError')
    })
  })

  describe('PrinterNotReadyError', () => {
    it('содержит статус готовности', () => {
      const error = new PrinterNotReadyError('Paper out', 'PAPER_OUT')

      expect(error.message).toBe('Paper out')
      expect(error.status).toBe('PAPER_OUT')
      expect(error.name).toBe('PrinterNotReadyError')
    })
  })

  describe('PrintTimeoutError', () => {
    it('наследуется от PrinterError', () => {
      const error = new PrintTimeoutError('Print operation timed out')

      expect(error).toBeInstanceOf(PrinterError)
      expect(error.name).toBe('PrintTimeoutError')
    })
  })

  describe('DatabaseError', () => {
    it('создаёт ошибку базы данных', () => {
      const error = new DatabaseError('Connection failed')

      expect(error.message).toBe('Connection failed')
      expect(error.name).toBe('DatabaseError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('ImageGenerationError', () => {
    it('создаёт ошибку генерации изображения', () => {
      const error = new ImageGenerationError('Failed to render barcode')

      expect(error.message).toBe('Failed to render barcode')
      expect(error.name).toBe('ImageGenerationError')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
