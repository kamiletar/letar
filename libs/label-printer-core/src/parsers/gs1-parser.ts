import type { MarkingCode } from '../models/marking-code.model'
import { InvalidCodeFormatError, InvalidGTINError } from '../utils/errors'

/**
 * GS1 DataMatrix parser for "Честный знак" codes
 */
export class GS1Parser {
  /**
   * Parse GS1 DataMatrix code for ties/scarves (TN VED 6215)
   * Format: 01<GTIN-14>21<Serial>91<Crypto>[92<TN_VED>]
   */
  static parse(code: string): MarkingCode {
    // Remove whitespace and validate minimum length
    const cleanCode = code.trim()
    if (cleanCode.length < 30) {
      throw new InvalidCodeFormatError(`Code too short: ${cleanCode.length} characters (minimum 30)`, cleanCode)
    }

    // Check if code starts with '01' (GTIN AI)
    if (!cleanCode.startsWith('01')) {
      throw new InvalidCodeFormatError('Code must start with AI "01" (GTIN)', cleanCode)
    }

    // Extract GTIN (14 digits after '01')
    const gtin = cleanCode.substring(2, 16)
    if (!/^\d{14}$/.test(gtin)) {
      throw new InvalidGTINError(`Invalid GTIN format: ${gtin} (must be 14 digits)`, cleanCode)
    }

    // Validate GTIN checksum
    if (!GS1Parser.validateGTINChecksum(gtin)) {
      throw new InvalidGTINError(`Invalid GTIN checksum: ${gtin}`, cleanCode)
    }

    // Find AI '21' (serial number)
    const serial21Index = cleanCode.indexOf('21', 16)
    if (serial21Index === -1) {
      throw new InvalidCodeFormatError('Missing AI "21" (serial number)', cleanCode)
    }

    // Find AI '91' (crypto tail)
    const crypto91Index = cleanCode.indexOf('91')
    if (crypto91Index === -1) {
      throw new InvalidCodeFormatError('Missing AI "91" (crypto tail)', cleanCode)
    }

    // Extract serial number (between '21' and '91')
    const serialNumber = cleanCode.substring(serial21Index + 2, crypto91Index)
    if (serialNumber.length === 0 || serialNumber.length > 20) {
      throw new InvalidCodeFormatError(`Invalid serial number length: ${serialNumber.length} (must be 1-20)`, cleanCode)
    }

    // Find AI '92' (optional TN VED or additional data)
    const tnved92Index = cleanCode.indexOf('92')
    let cryptoCode: string
    let additionalData: string | undefined

    if (tnved92Index !== -1 && tnved92Index > crypto91Index) {
      // Crypto code is between '91' and '92'
      cryptoCode = cleanCode.substring(crypto91Index + 2, tnved92Index)
      // Additional data is after '92'
      additionalData = cleanCode.substring(tnved92Index + 2)
    } else {
      // Crypto code is from '91' to end
      cryptoCode = cleanCode.substring(crypto91Index + 2)
    }

    if (cryptoCode.length < 4) {
      throw new InvalidCodeFormatError(`Crypto tail too short: ${cryptoCode.length} characters (minimum 4)`, cleanCode)
    }

    return {
      fullCode: cleanCode,
      gtin,
      serialNumber,
      cryptoCode,
      additionalData,
    }
  }

  /**
   * Validate GTIN-14 checksum using GS1 algorithm
   */
  static validateGTINChecksum(gtin: string): boolean {
    if (gtin.length !== 14 || !/^\d{14}$/.test(gtin)) {
      return false
    }

    const digits = gtin.split('').map(Number)
    const checkDigit = digits[13]

    // Calculate checksum: (sum of odd position digits * 3 + sum of even position digits) mod 10
    let sum = 0
    for (let i = 0; i < 13; i++) {
      // Positions 1,3,5,7,9,11,13 (odd) are multiplied by 3
      // Positions 2,4,6,8,10,12 (even) are multiplied by 1
      const multiplier = i % 2 === 0 ? 3 : 1
      sum += digits[i] * multiplier
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10
    return checkDigit === calculatedCheckDigit
  }

  /**
   * Extract GTIN-13 from GTIN-14 (for EAN-13 barcode)
   * Removes leading digit if it's 0
   */
  static extractGTIN13(gtin14: string): string {
    if (gtin14.length !== 14) {
      throw new Error('GTIN must be 14 digits')
    }

    // If first digit is 0, remove it to get GTIN-13
    if (gtin14[0] === '0') {
      return gtin14.substring(1)
    }

    // Otherwise, return last 13 digits
    return gtin14.substring(1)
  }
}
