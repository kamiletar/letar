import type { LabelConfig, PrinterConfig } from '../config/config.schema'
import type { MarkingCode } from '../models/marking-code.model'

/**
 * TSPL Native Commands - use printer's built-in barcode generation instead of bitmap
 */
export class TSPLNativeService {
  /**
   * Generate TSPL setup commands
   */
  static generateSetupCommands(printerConfig: PrinterConfig): string {
    const { settings } = printerConfig
    const commands: string[] = []

    commands.push(`SIZE ${settings.width} mm, ${settings.height} mm`)
    commands.push(`GAP ${settings.gap} mm, 0 mm`)
    commands.push(`DIRECTION ${settings.orientation}`)
    commands.push(`SPEED ${settings.speed}`)
    commands.push(`DENSITY ${settings.density}`)
    commands.push(`REFERENCE 0, 0`)
    commands.push(`SHIFT 0`)
    commands.push(`SET RIBBON OFF`) // Direct Thermal mode
    commands.push(`CLS`)

    return commands.join('\r\n') + '\r\n'
  }

  /**
   * Generate complete print job using native TSPL commands
   */
  static generateNativePrintJob(code: MarkingCode, printerConfig: PrinterConfig, labelConfig: LabelConfig): string {
    const commands: string[] = []

    // 1. Setup
    commands.push(this.generateSetupCommands(printerConfig))

    // 2. DataMatrix using DMATRIX command (native TSC command)
    if (labelConfig.elements.datamatrix.enabled) {
      // DMATRIX x, y, width, height, [module_width], "data"
      // Coordinates are already in dots (pixels at 300 DPI), use them directly
      const dmX = Math.round(labelConfig.elements.datamatrix.x)
      const dmY = Math.round(labelConfig.elements.datamatrix.y)
      const dmSize = Math.round(labelConfig.elements.datamatrix.size)

      commands.push(
        `DMATRIX ${dmX}, ${dmY}, ${dmSize}, ${dmSize}, x${labelConfig.elements.datamatrix.moduleSize}, "${code.fullCode}"`
      )
    }

    // 3. EAN-13 barcode using BARCODE command
    if (labelConfig.elements.gtin.enabled) {
      // Extract EAN-13 from GTIN-14 (remove leading 0 if present)
      let ean13 = code.gtin
      if (ean13.length === 14 && ean13[0] === '0') {
        ean13 = ean13.substring(1)
      }

      // Coordinates are already in dots (pixels at 300 DPI), use them directly
      const bcX = Math.round(labelConfig.elements.gtin.x)
      const bcY = Math.round(labelConfig.elements.gtin.y)
      const bcHeight = Math.round(labelConfig.elements.gtin.height)

      // BARCODE x, y, "code_type", height, human_readable, rotation, narrow, wide, "data"
      // EAN13 parameters: height in dots, 0=no text/1=text, 0=no rotation
      const humanReadable = labelConfig.elements.gtin.includeText ? 1 : 0
      commands.push(`BARCODE ${bcX}, ${bcY}, "EAN13", ${bcHeight}, ${humanReadable}, 0, 2, 2, "${ean13}"`)
    }

    // 4. Print command (copies, sets)
    const copies = printerConfig.settings.copies || 1
    commands.push(`PRINT ${copies}, 1`)

    return commands.join('\r\n') + '\r\n'
  }
}
