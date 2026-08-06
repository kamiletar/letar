import { Jimp } from 'jimp'
import type { PrinterConfig } from '../config/config.schema'

/**
 * TSPL (TSC Printer Language) command generator
 * Documentation: TSC TE300 Programming Manual
 */
export class TSPLService {
  /**
   * Generate TSPL commands for label setup
   */
  static generateSetupCommands(config: PrinterConfig): string {
    const { settings } = config
    const commands: string[] = []

    // SIZE: Set label size in mm
    commands.push(`SIZE ${settings.width} mm, ${settings.height} mm`)

    // GAP: Set gap between labels in mm
    commands.push(`GAP ${settings.gap} mm, 0 mm`)

    // DIRECTION: Set print direction (0 = normal, 1 = 180°)
    commands.push(`DIRECTION ${settings.orientation}`)

    // SPEED: Set print speed (1-14, where 2 inches/sec = 50.8mm/sec)
    commands.push(`SPEED ${settings.speed}`)

    // DENSITY: Set print density (0-15)
    commands.push(`DENSITY ${settings.density}`)

    // REFERENCE: Set reference point to (0,0)
    commands.push(`REFERENCE 0, 0`)

    // SHIFT: Set shift position (for fine adjustment)
    commands.push(`SHIFT 0`)

    // SET RIBBON: Use Direct Thermal mode (no ribbon required)
    // This is critical - without this, printer won't print if it expects a ribbon
    commands.push(`SET RIBBON OFF`)

    // Clear image buffer
    commands.push(`CLS`)

    return commands.join('\r\n') + '\r\n'
  }

  /**
   * Convert PNG image buffer to monochrome bitmap data for TSPL
   * Использует Jimp вместо sharp для совместимости с Electron
   */
  static async imageToTSPLBitmap(imageBuffer: Buffer): Promise<{
    width: number
    height: number
    bytesPerRow: number
    data: string
    binaryData: Buffer
  }> {
    // Load image with Jimp
    const image = await Jimp.read(imageBuffer)

    // Satori рендерит в 2x для Retina — уменьшаем если изображение больше ожидаемого
    // Ожидаемый размер этикетки 58x39mm @ 300 DPI = 685x461 px
    const expectedWidth = 685
    const expectedHeight = 461
    if (image.width > expectedWidth * 1.5 || image.height > expectedHeight * 1.5) {
      // Изображение в 2x масштабе — уменьшаем
      image.resize({ w: Math.round(image.width / 2), h: Math.round(image.height / 2) })
    }

    // Convert to greyscale
    image.greyscale()

    const width = image.width
    const height = image.height

    // Get raw pixel data
    const { data } = image.bitmap

    // Convert to TSPL bitmap format (packed bits)
    // Important: BMP files store rows from bottom to top - try this order
    const bytesPerRow = Math.ceil(width / 8)
    const bitmapData: number[] = []

    // TSPL BITMAP: строки сверху вниз (не как BMP снизу вверх)
    for (let y = 0; y < height; y++) {
      for (let byteX = 0; byteX < bytesPerRow; byteX++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = byteX * 8 + bit
          if (x < width) {
            // Jimp bitmap: RGBA format, 4 bytes per pixel
            const pixelIndex = (y * width + x) * 4
            // Get grayscale value (R channel after greyscale conversion)
            const grayValue = data[pixelIndex]
            // Threshold: < 128 = чёрный пиксель
            // TSPL BITMAP: 0 = печатать точку (чёрный), 1 = не печатать (белый)
            // Устанавливаем бит для БЕЛЫХ пикселей
            if (grayValue >= 128) {
              byte |= 1 << (7 - bit)
            }
          }
        }
        bitmapData.push(byte)
      }
    }

    // Convert to hex string (for BITMAP command)
    const hexData = bitmapData.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('')

    // Also provide as Buffer (for DOWNLOAD command)
    const binaryData = Buffer.from(bitmapData)

    return {
      width,
      height,
      bytesPerRow, // Bytes per row for BITMAP command
      data: hexData,
      binaryData,
    }
  }

  /**
   * Generate BITMAP command for TSPL
   */
  static generateBitmapCommand(
    x: number,
    y: number,
    bytesPerRow: number,
    height: number,
    mode: number,
    hexData: string,
  ): string {
    return `BITMAP ${x}, ${y}, ${bytesPerRow}, ${height}, ${mode}, ${hexData}`
  }

  /**
   * Generate complete print job commands
   * Returns object with text commands and optional binary data
   */
  static async generatePrintJob(imageBuffer: Buffer, config: PrinterConfig): Promise<string> {
    const commands: string[] = []

    // 1. Setup commands
    commands.push(this.generateSetupCommands(config))

    // 2. Convert image to bitmap
    const bitmap = await this.imageToTSPLBitmap(imageBuffer)

    // 3. Use BITMAP command with limited hex data (fallback to simple approach)
    // For large images, this might not work well, but it's the most compatible
    commands.push(this.generateBitmapCommand(0, 0, bitmap.bytesPerRow, bitmap.height, 0, bitmap.data))

    // 4. PRINT command (number of copies)
    const copies = config.settings.copies || 1
    commands.push(`PRINT ${copies}, 1`)

    return commands.join('\r\n') + '\r\n'
  }

  /**
   * Генерация бинарного print job для отправки через winspool.drv (RAW)
   * PNG → монохромный bitmap → TSPL BITMAP (бинарный) → Buffer
   * Бинарный формат экономит ~50% размера по сравнению с hex
   */
  static async generateBinaryPrintJob(imageBuffer: Buffer, config: PrinterConfig): Promise<Buffer> {
    // 1. Setup команды (текст)
    const setup = this.generateSetupCommands(config)

    // 2. Конвертируем PNG → монохромный bitmap
    const bitmap = await this.imageToTSPLBitmap(imageBuffer)

    // 3. BITMAP команда с бинарными данными (mode 0 = binary)
    // Формат: BITMAP x,y,width,height,mode,<binary_data>
    const bitmapHeader = `BITMAP 0,0,${bitmap.bytesPerRow},${bitmap.height},0,`

    // 4. PRINT команда
    const copies = config.settings.copies || 1
    const printCmd = `\r\nPRINT ${copies},1\r\n`

    // 5. Собираем Buffer: setup (текст) + bitmap header (текст) + binary data + print (текст)
    const setupBuf = Buffer.from(setup, 'ascii')
    const headerBuf = Buffer.from(bitmapHeader, 'ascii')
    const printBuf = Buffer.from(printCmd, 'ascii')

    return Buffer.concat([setupBuf, headerBuf, bitmap.binaryData, printBuf])
  }

  /**
   * Generate print job using native TSPL commands (DMATRIX, BARCODE)
   * This is more reliable than BITMAP for barcodes
   */
  static async generatePrintJobNative(
    dataMatrixCode: string,
    gtinCode: string,
    templateBuffer: Buffer | null,
    config: PrinterConfig,
  ): Promise<string> {
    const commands: string[] = []

    // 1. Setup commands
    commands.push(this.generateSetupCommands(config))

    // 1.5. Draw label design using native TSPL commands
    if (templateBuffer) {
      // Use full resolution - do NOT resize!
      // The template must match the label size exactly (685x461 at 300 DPI = 58x39mm)
      const bitmap = await this.imageToTSPLBitmap(templateBuffer)

      // Place template at origin (0, 0)
      commands.push(this.generateBitmapCommand(0, 0, bitmap.bytesPerRow, bitmap.height, 0, bitmap.data))
    } else {
      // Draw simple label design using native commands (no BITMAP)
      // Outer border
      commands.push(`BOX 5, 5, 680, 456, 3`)

      // Inner decorative frame
      commands.push(`BOX 15, 15, 670, 446, 2`)

      // Top text (brand/title) - centered
      commands.push(`TEXT 220, 210, "4", 0, 1, 1, "PREMIUM"`)

      // Bottom horizontal line (separator)
      commands.push(`BAR 25, 230, 635, 2`)
    }

    // 2. DataMatrix code using native DMATRIX command
    // DMATRIX x, y, width, height, [x], row, col, ecc, "content"
    // For TSC printers: simplified syntax without expression parameter
    // Position: x=10, y=10 dots (about 1mm margin at 300 DPI)
    // Size: width=180, height=180 dots (about 15mm at 300 DPI)
    // ECC: M = medium error correction
    commands.push(`DMATRIX 10, 10, 180, 180, "${dataMatrixCode}"`)

    // 3. EAN-13 barcode using native BARCODE command
    // BARCODE x, y, "code_type", height, human_readable, rotation, narrow, wide, "code"
    // Position: x=100, y=250 dots
    // Height: 80 dots
    // Human readable: 1 = yes
    // Rotation: 0 = no rotation
    // Narrow/Wide: 2, 2 (bar width)

    // Remove leading 0 if GTIN is 14 digits
    let ean13Code = gtinCode
    if (gtinCode.length === 14 && gtinCode[0] === '0') {
      ean13Code = gtinCode.substring(1)
    }

    commands.push(`BARCODE 100, 250, "EAN13", 80, 1, 0, 2, 2, "${ean13Code}"`)

    // 4. PRINT command (number of copies)
    const copies = config.settings.copies || 1
    commands.push(`PRINT ${copies}, 1`)

    return commands.join('\r\n') + '\r\n'
  }

  /**
   * Generate status query command
   */
  static generateStatusQuery(): string {
    // ESC ! ? - Request printer status
    return '\x1B!?\r\n'
  }
}
